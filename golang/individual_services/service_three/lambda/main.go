package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"

	_ "github.com/go-sql-driver/mysql"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/wlloyduw/FaaSProgLangComp/golang/saaf"
)

const (
	dbUsernameKey = "username"
	dbPasswordKey = "password"
	dbNameKey     = "databaseName"
	dbEndpointKey = "databaseEndpoint"
	dbParams      = "multiStatements=true&interpolateParams=true"
)

var (
	filterBy = map[string][]string{
		"Region":         []string{"Australia and Oceania"},
		"Item Type":      []string{"Office Supplies"},
		"Sales Channel":  []string{"Offline"},
		"Order Priority": []string{"Medium"},
		"Country":        []string{"Fiji"},
	}

	aggregateBy = map[string][]string{
		"max": []string{"Units Sold"},
		"min": []string{"Units Sold"},
		"avg": []string{"Order Processing Time", "Gross Margin", "Units Sold"},
		"sum": []string{"Units Sold", "Total Revenue", "Total Profit"},
	}
)

// DBInfo contains rds database information
type DBInfo struct {
	Username         string
	Password         string
	Name             string
	Endpoint         string
	ConnectionString string
}

var dbinfo DBInfo

func main() {
	lambda.Start(HandleRequest)
}

func setDBInfo() error {
	var exists bool

	dbinfo = DBInfo{}

	if dbinfo.Username, exists = os.LookupEnv(dbUsernameKey); !exists {
		return fmt.Errorf("%s env var not found", dbUsernameKey)
	}

	if dbinfo.Password, exists = os.LookupEnv(dbPasswordKey); !exists {
		return fmt.Errorf("%s env var not found", dbPasswordKey)
	}

	if dbinfo.Name, exists = os.LookupEnv(dbNameKey); !exists {
		return fmt.Errorf("%s env var not found", dbNameKey)
	}

	if dbinfo.Endpoint, exists = os.LookupEnv(dbEndpointKey); !exists {
		return fmt.Errorf("%s env var not found", dbEndpointKey)
	}

	dbinfo.ConnectionString = fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?%s", dbinfo.Username, dbinfo.Password, dbinfo.Endpoint, dbinfo.Name, dbParams)

	return nil
}

func HandleRequest(ctx context.Context, request saaf.Request) (map[string]interface{}, error) {

	inspector := saaf.NewInspector()
	inspector.InspectAll()

	//****************START FUNCTION IMPLEMENTATION*************************

	inspector.AddAttribute("request", request)

	if err := setDBInfo(); err != nil {
		return nil, err
	}

	queryString := constructQueryString(filterBy, aggregateBy, request.TableName)

	// fmt.Println(queryString)

	results, err := doQuery(queryString, request.TableName)
	if err != nil {
		return nil, err
	}
	// fmt.Printf("Results = %#v", results)

	mySession, err := session.NewSession()
	if err != nil {
		return nil, err
	}
	s3client := s3.New(mySession)

	pr, pw := io.Pipe()
	csvWriter := csv.NewWriter(pw)
	go func() {
		err = csvWriter.WriteAll(results)
		if err != nil {
			fmt.Printf("Error writing to pipe: err = %s", err)
			return
		}
		pw.Close()
	}()

	editedBody, err := ioutil.ReadAll(pr)
	if err != nil {
		return nil, err
	}

	// create a unique key and upload query results to S3
	newKey := strings.TrimSuffix(request.Key, ".csv") + "/" + strings.TrimSuffix(request.Key, ".csv") + "_" + uuid.New().String() + ".csv"

	_, err = s3client.PutObject(&s3.PutObjectInput{Body: bytes.NewReader(editedBody), Bucket: &request.BucketName, Key: &newKey})
	if err != nil {
		return nil, err
	}

	// do extra table queries if batchSize specified in request
	if request.StressTestLoops > 0 {
		startTime := time.Now()
		err = stressTest(request.TableName, request.StressTestLoops)
		if err != nil {
			return nil, err
		}
		stressTestRuntime := time.Since(startTime).Milliseconds()
		fmt.Printf("Stress test runtime is %d", stressTestRuntime)
		inspector.AddAttribute("stressTestRuntime", stressTestRuntime)
	}

	//****************END FUNCTION IMPLEMENTATION***************************

	//Collect final information such as total runtime and cpu deltas.
	inspector.InspectAllDeltas()
	return inspector.Finish(), nil
}

func constructQueryString(filters, aggregates map[string][]string, tablename string) string {
	aggregateBuilder := &strings.Builder{}

	for k, v := range aggregates {
		for _, value := range v {
			aggregateBuilder.WriteString(strings.ToUpper(k))
			aggregateBuilder.WriteString("(`")
			aggregateBuilder.WriteString(value)
			aggregateBuilder.WriteString("`), ")
		}
	}
	aggregateString := aggregateBuilder.String()

	queryBuilder := &strings.Builder{}
	for k, v := range filters {
		for _, value := range v {
			queryBuilder.WriteString("SELECT ")
			queryBuilder.WriteString(aggregateString)
			queryBuilder.WriteString("'WHERE ")
			queryBuilder.WriteString(k)
			queryBuilder.WriteString("=")
			queryBuilder.WriteString(value)
			queryBuilder.WriteString("' AS `Filtered By` FROM ")
			queryBuilder.WriteString(tablename)
			queryBuilder.WriteString(" WHERE `")
			queryBuilder.WriteString(k)
			queryBuilder.WriteString("`='")
			queryBuilder.WriteString(value)
			queryBuilder.WriteString("' UNION ")
		}
	}

	queryString := strings.TrimSuffix(queryBuilder.String(), " UNION ") + ";"
	return queryString
}

func doQuery(queryString, tablename string) ([][]string, error) {
	db, err := sql.Open("mysql", dbinfo.ConnectionString)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	rows, err := db.Query(queryString)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columnNames, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	// fmt.Printf("%#v\n", columnNames)

	allThings := [][]string{columnNames}

	colValuesBase := []string{}
	for i := 0; i < len(columnNames); i++ {
		colValuesBase = append(colValuesBase, "")
	}

	for rows.Next() {
		// var (
		// 	avgOrderProcessingTime float64
		// 	avgGrossMargin         float64
		// 	avgUnitsSold           float64
		// 	sumUnitSolds           int
		// 	sumTotalRevenue        float64
		// 	maxUnitSold            int
		// 	minUnitSold            int
		// 	sumTotalProfit         float64
		// 	filteredBy             string
		// )

		// // this part needs some work because it fails around half the time.... something to do with the ordering of the columns
		// err = rows.Scan(&maxUnitSold, &minUnitSold, &avgOrderProcessingTime, &avgGrossMargin, &avgUnitsSold, &sumUnitSolds, &sumTotalRevenue, &sumTotalProfit, &filteredBy)
		// if err != nil {
		// 	return allThings, err
		// }

		// row := []string{
		// 	strconv.Itoa(maxUnitSold),
		// 	strconv.Itoa(minUnitSold),
		// 	strconv.FormatFloat(avgOrderProcessingTime, 'f', 2, 64),
		// 	strconv.FormatFloat(avgGrossMargin, 'f', 2, 64),
		// 	strconv.FormatFloat(avgUnitsSold, 'f', 2, 64),
		// 	strconv.Itoa(sumUnitSolds),
		// 	strconv.FormatFloat(sumTotalRevenue, 'f', 2, 64),
		// 	strconv.FormatFloat(sumTotalProfit, 'f', 2, 64),
		// 	filteredBy,
		// }

		colValues := colValuesBase
		err = rows.Scan(&colValues[0], &colValues[1], &colValues[2], &colValues[3], &colValues[4], &colValues[5], &colValues[6], &colValues[7], &colValues[8])
		if err != nil {
			return nil, err
		}

		allThings = append(allThings, colValues)
	}

	return allThings, nil
}

func stressTest(tablename string, iterations int) error {
	var rows *sql.Rows
	db, err := sql.Open("mysql", dbinfo.ConnectionString)
	if err != nil {
		return err
	}
	defer db.Close()

	// times := map[int]int64{}

	for i := 0; i < iterations; i++ {
		// rowsScanned := 0
		// startTime := time.Now()
		conn, err := db.Conn(context.Background())
		if err != nil {
			return err
		}

		rows, err = conn.QueryContext(context.Background(), fmt.Sprintf("SELECT * FROM %s;", tablename))
		if err != nil {
			return err
		}

		// NOTE: scanning rows takes the same amount of time as just an empty rows.Next loop

		// row := []string{"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""}
		for rows.Next() {
			// err := rows.Scan(&row[0], &row[1], &row[2], &row[3], &row[4], &row[5], &row[6], &row[7], &row[8], &row[9], &row[10], &row[11], &row[12], &row[13], &row[14], &row[15])
			// if err != nil {
			// 	rows.Close()
			// 	return err
			// }
			// rowsScanned++
		}
		rows.Close()
		conn.Close()

		// times[i] = time.Since(startTime).Milliseconds()
		// fmt.Printf("Test loop #%d took %s. Scanned %d rows\n", i, time.Since(startTime), rowsScanned)
	}

	// fmt.Printf("Times = %#v\n", times)
	return nil
}

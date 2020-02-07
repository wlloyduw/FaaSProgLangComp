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
	"strconv"
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

	queryString := constructQueryString(request.FilterBy, request.AggegrateBy, request.TableName)

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
		err = stressTest(request.TableName, 100)
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
			// aggregateBuilder.WriteString(strings.ReplaceAll(value, "_", " "))
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
			// queryBuilder.WriteString(strings.ReplaceAll(k, "_", " "))
			queryBuilder.WriteString("=")
			queryBuilder.WriteString(value)
			// queryBuilder.WriteString(strings.ReplaceAll(value, "_", " "))
			queryBuilder.WriteString("' AS `Filtered By` FROM ")
			queryBuilder.WriteString(tablename)
			queryBuilder.WriteString(" WHERE `")
			queryBuilder.WriteString(k)
			// queryBuilder.WriteString(strings.ReplaceAll(k, "_", " "))
			queryBuilder.WriteString("`='")
			queryBuilder.WriteString(value)
			// queryBuilder.WriteString(strings.ReplaceAll(value, "_", " "))
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

	// this part needs some work because it fails around half the time.... something to do with the ordering of the columns
	columnNames, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	// this part needs some work because it fails around half the time.... something to do with the ordering of the columns
	allThings := [][]string{columnNames}
	for rows.Next() {
		var (
			avgOrderProcessingTime float64
			avgGrossMargin         float64
			avgUnitsSold           float64
			sumUnitSolds           int
			sumTotalRevenue        float64
			maxUnitSold            int
			minUnitSold            int
			sumTotalProfit         float64
			filteredBy             string
		)

		// this part needs some work because it fails around half the time.... something to do with the ordering of the columns
		err = rows.Scan(&maxUnitSold, &minUnitSold, &avgOrderProcessingTime, &avgGrossMargin, &avgUnitsSold, &sumUnitSolds, &sumTotalRevenue, &sumTotalProfit, &filteredBy)
		if err != nil {
			return allThings, err
		}

		row := []string{
			strconv.Itoa(maxUnitSold),
			strconv.Itoa(minUnitSold),
			strconv.FormatFloat(avgOrderProcessingTime, 'f', 2, 64),
			strconv.FormatFloat(avgGrossMargin, 'f', 2, 64),
			strconv.FormatFloat(avgUnitsSold, 'f', 2, 64),
			strconv.Itoa(sumUnitSolds),
			strconv.FormatFloat(sumTotalRevenue, 'f', 2, 64),
			strconv.FormatFloat(sumTotalProfit, 'f', 2, 64),
			filteredBy,
		}

		allThings = append(allThings, row)
	}

	return allThings, nil
}

func stressTest(tablename string, iterations int) error {
	db, err := sql.Open("mysql", dbinfo.ConnectionString)
	if err != nil {
		return err
	}
	defer db.Close()

	for i := 0; i < iterations; i++ {
		conn, err := db.Conn(context.Background())
		if err != nil {
			return err
		}

		rows, err := conn.QueryContext(context.Background(), fmt.Sprintf("SELECT * FROM %s;", tablename))
		if err != nil {
			return err
		}

		// NOTE: may need to actually read these files in order to transfer them over
		for rows.Next() {
		}
		conn.Close()
	}

	return nil
}

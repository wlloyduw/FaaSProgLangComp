package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"io/ioutil"
	"strconv"
	"strings"

	_ "github.com/go-sql-driver/mysql"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/daperez18/562_group2_project/golang/individual_services/service_three/go_template/src/saaf"
)

var dbinfo = struct {
	password string
	dbname   string
	username string
}{
	password: "tcss562group2",
	dbname:   "tcp(service2rds.cluster-cwunkmk4eqtz.us-east-2.rds.amazonaws.com:3306)/service2db?multiStatements=true&interpolateParams=true",
	username: "tcss562",
}

func main() {
	lambda.Start(HandleRequest)
}

func HandleRequest(ctx context.Context, request saaf.Request) (map[string]interface{}, error) {

	inspector := saaf.NewInspector()
	inspector.InspectAll()

	//****************START FUNCTION IMPLEMENTATION*************************

	inspector.AddAttribute("request", request)

	bucketname := request.BucketName
	key := request.Key
	tablename := request.TableName

	queryString := constructQueryString(request.FilterBy, request.AggegrateBy, tablename)

	// fmt.Println(queryString)

	results, err := doQuery(queryString, tablename)
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

	// maybe write to a unique key if we run in parallel
	// newKey := strings.TrimSuffix(key, ".csv") + "/" + strconv.FormatInt(time.Now().UnixNano(), 10) + ".csv"

	_, err = s3client.PutObject(&s3.PutObjectInput{Body: bytes.NewReader(editedBody), Bucket: &bucketname, Key: &key})
	if err != nil {
		return nil, err
	}

	// do extra table queries
	// err = stressTest(tablename, 100)
	// if err != nil {
	// 	return nil, err
	// }

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
			aggregateBuilder.WriteString(strings.ReplaceAll(value, "_", " "))
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
			queryBuilder.WriteString(strings.ReplaceAll(k, "_", " "))
			queryBuilder.WriteString("=")
			queryBuilder.WriteString(strings.ReplaceAll(value, "_", " "))
			queryBuilder.WriteString("' AS `Filtered By` FROM ")
			queryBuilder.WriteString(tablename)
			queryBuilder.WriteString(" WHERE `")
			queryBuilder.WriteString(strings.ReplaceAll(k, "_", " "))
			queryBuilder.WriteString("`='")
			queryBuilder.WriteString(strings.ReplaceAll(value, "_", " "))
			queryBuilder.WriteString("' UNION ")
		}
	}

	queryString := strings.TrimSuffix(queryBuilder.String(), " UNION ") + ";"
	return queryString
}

func doQuery(queryString, tablename string) ([][]string, error) {
	db, err := sql.Open("mysql", fmt.Sprintf("%s:%s@%s", dbinfo.username, dbinfo.password, dbinfo.dbname))
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
	db, err := sql.Open("mysql", fmt.Sprintf("%s:%s@%s", dbinfo.username, dbinfo.password, dbinfo.dbname))
	if err != nil {
		return err
	}
	defer db.Close()

	for i := 0; i < iterations; i++ {
		conn, err := db.Conn(context.Background())
		if err != nil {
			return nil
		}

		rows, err := conn.QueryContext(context.Background(), fmt.Sprintf("SELECT * FROM %s;", tablename))
		if err != nil {
			return err
		}

		for rows.Next() {
		}
		conn.Close()
	}

	return nil
}

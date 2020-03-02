package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strings"

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

func setDBInfo(request saaf.Request) error {
	var exists bool

	dbinfo = DBInfo{}

	if dbinfo.Username, exists = os.LookupEnv(dbUsernameKey); !exists {
		return fmt.Errorf("%s env var not found", dbUsernameKey)
	}

	if dbinfo.Password, exists = os.LookupEnv(dbPasswordKey); !exists {
		return fmt.Errorf("%s env var not found", dbPasswordKey)
	}

	if len(request.DatabaseEndpoint) > 0 {
		dbinfo.Endpoint = request.DatabaseEndpoint
	} else {
		if dbinfo.Endpoint, exists = os.LookupEnv(dbEndpointKey); !exists {
			return fmt.Errorf("%s env var not found", dbEndpointKey)
		}
	}

	if len(request.DatabaseName) > 0 {
		dbinfo.Name = request.DatabaseName
	} else {
		if dbinfo.Name, exists = os.LookupEnv(dbNameKey); !exists {
			return fmt.Errorf("%s env var not found", dbNameKey)
		}
	}

	dbinfo.ConnectionString = fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?%s", dbinfo.Username, dbinfo.Password, dbinfo.Endpoint, dbinfo.Name, dbParams)

	return nil
}

func HandleRequest(ctx context.Context, request saaf.Request) (map[string]interface{}, error) {
	inspector := saaf.NewInspector()
	inspector.InspectAll()
	// inspector.AddAttribute("request", request)
	inspector.AddAttribute("bucketname", request.BucketName)
	inspector.AddAttribute("key", request.Key)
	inspector.AddAttribute("dbEndpoint", request.DatabaseEndpoint)

	if err := setDBInfo(request); err != nil {
		return nil, err
	}

	mySession, err := session.NewSession()
	if err != nil {
		return nil, err
	}
	s3client := s3.New(mySession)

	s3object, err := s3client.GetObject(&s3.GetObjectInput{Bucket: &request.BucketName, Key: &request.Key})
	if err != nil {
		return nil, err
	}

	records, err := readCSV(s3object.Body)
	if err != nil {
		return nil, err
	}

	err = writeRecords(records, request.TableName, request.BatchSize)
	if err != nil {
		return nil, err
	}

	inspector.InspectAllDeltas()
	return inspector.Finish(), nil
}

func readCSV(body io.ReadCloser) ([][]string, error) {
	reader := csv.NewReader(body)

	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	return records, nil
}
func writeRecords(records [][]string, tablename string, batchSize int) error {
	if batchSize == 0 {
		batchSize = 1000
	}

	db, err := sql.Open("mysql", dbinfo.ConnectionString)
	if err != nil {
		return err
	}
	defer db.Close()

	stmt, err := db.Prepare("DROP TABLE IF EXISTS `" + tablename + "`;")
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}

	stmt, err = db.Prepare("CREATE TABLE " + tablename + " (Region VARCHAR(40), Country VARCHAR(40), `Item Type` VARCHAR(40), `Sales Channel` VARCHAR(40),`Order Priority` VARCHAR(40), `Order Date` VARCHAR(40),`Order ID` INT PRIMARY KEY, `Ship Date` VARCHAR(40), `Units Sold` INT,`Unit Price` DOUBLE, `Unit Cost` DOUBLE, `Total Revenue` DOUBLE, `Total Cost` DOUBLE, `Total Profit` DOUBLE, `Order Processing Time` INT, `Gross Margin` FLOAT);")
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}

	insertString := "insert into " + tablename + " (Region, Country, `Item Type`, `Sales Channel`, `Order Priority`, `Order Date`, `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Order Processing Time`, `Gross Margin`) values "

	vals := []interface{}{}

	for i, record := range records {
		if i == 0 {
			continue
		}

		if i%batchSize == 0 {
			insertString = strings.TrimSuffix(insertString, ",")

			ps, err := db.Prepare(insertString)
			if err != nil {
				fmt.Println("Prepare error " + err.Error())
				return err
			}

			_, err = ps.Exec(vals...)
			if err != nil {
				fmt.Println("Exec error" + err.Error())
				return err
			}
			ps.Close()

			insertString = "insert into " + tablename + " (Region, Country, `Item Type`, `Sales Channel`, `Order Priority`, `Order Date`, `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Order Processing Time`, `Gross Margin`) values "
			vals = []interface{}{}

		}
		insertString += "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,? ,? ,?),"

		vals = append(vals,
			record[0],
			record[1],
			record[2],
			record[3],
			record[4],
			record[5],
			record[6],
			record[7],
			record[8],
			record[9],
			record[10],
			record[11],
			record[12],
			record[13],
			record[14],
			record[15])
	}
	insertString = strings.TrimSuffix(insertString, ",")

	ps, err := db.Prepare(insertString)
	if err != nil {
		return err
	}
	defer ps.Close()

	_, err = ps.Exec(vals...)
	if err != nil {
		return err
	}

	return nil
}

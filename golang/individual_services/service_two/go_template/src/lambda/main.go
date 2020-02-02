package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"strings"

	_ "github.com/go-sql-driver/mysql"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/daperez18/562_group2_project/golang/individual_services/service_two/go_template/src/saaf"
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

	inspector.AddAttribute("message", "bucketname is = "+request.BucketName+"! This is an attributed added to the Inspector!")

	bucketname := request.BucketName
	key := request.Key
	tablename := request.TableName
	batchSize := request.BatchSize

	mySession, err := session.NewSession()
	if err != nil {
		return nil, err
	}
	s3client := s3.New(mySession)

	s3object, err := s3client.GetObject(&s3.GetObjectInput{Bucket: &bucketname, Key: &key})
	if err != nil {
		return nil, err
	}

	body := s3object.Body

	reader := csv.NewReader(body)

	records, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}

	err = writeRecords(records, tablename, batchSize)
	if err != nil {
		return nil, err
	}

	//****************END FUNCTION IMPLEMENTATION***************************

	//Collect final information such as total runtime and cpu deltas.
	inspector.InspectAllDeltas()
	return inspector.Finish(), nil
}

func writeRecords(records [][]string, tablename string, batchSize int) error {
	db, err := sql.Open("mysql", fmt.Sprintf("%s:%s@%s", dbinfo.username, dbinfo.password, dbinfo.dbname))
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

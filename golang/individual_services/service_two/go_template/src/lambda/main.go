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

	err = writeRecords(records, tablename)
	if err != nil {
		return nil, err
	}

	//****************END FUNCTION IMPLEMENTATION***************************

	//Collect final information such as total runtime and cpu deltas.
	inspector.InspectAllDeltas()
	return inspector.Finish(), nil
}

func writeRecords(records [][]string, tablename string) error {
	batchSize := 1000 // has to be less than 16000 or something

	db, err := sql.Open("mysql", fmt.Sprintf("%s:%s@%s", dbinfo.username, dbinfo.password, dbinfo.dbname))
	if err != nil {
		return err
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		return err
	}
	// fmt.Println("Connection established")

	// Drop the table
	stmt, err := db.Prepare("DROP TABLE IF EXISTS `" + tablename + "`;")
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}

	// Create the table
	stmt, err = db.Prepare("CREATE TABLE " + tablename + " (Region VARCHAR(40), Country VARCHAR(40), `Item Type` VARCHAR(40), `Sales Channel` VARCHAR(40),`Order Priority` VARCHAR(40), `Order Date` VARCHAR(40),`Order ID` INT PRIMARY KEY, `Ship Date` VARCHAR(40), `Units Sold` INT,`Unit Price` DOUBLE, `Unit Cost` DOUBLE, `Total Revenue` DOUBLE, `Total Cost` DOUBLE, `Total Profit` DOUBLE, `Order Processing Time` INT, `Gross Margin` FLOAT);")
	if err != nil {
		return err
	}
	_, err = stmt.Exec()
	if err != nil {
		return err
	}

	// add the rows to the table in batches
	// tx, err := db.Begin()
	// if err != nil {
	// 	return err
	// }
	// rowBuilder := &strings.Builder{}

	// insertString := "insert into " + tablename + " (Region, Country, `Item Type`, `Sales Channel`, `Order Priority`, `Order Date`, `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Order Processing Time`, `Gross Margin`) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,? ,? ,?)"
	insertString := "insert into " + tablename + " (Region, Country, `Item Type`, `Sales Channel`, `Order Priority`, `Order Date`, `Order ID`, `Ship Date`, `Units Sold`, `Unit Price`, `Unit Cost`, `Total Revenue`, `Total Cost`, `Total Profit`, `Order Processing Time`, `Gross Margin`) values "
	// ps, err := db.Prepare(insertString)
	// if err != nil {
	// 	return err
	// }
	vals := []interface{}{}

	for i, record := range records {
		if i == 0 {
			continue
		}

		if i > 747900 {
			fmt.Printf("Bad record #%d? = %#v", i, record)
		}

		if i%batchSize == 0 {
			// err = tx.Commit()
			// if err != nil {
			// 	return err
			// }

			// tx, err = db.Begin()
			// if err != nil {
			// 	return err
			// }

			// ps, err = db.Prepare(insertString)
			// if err != nil {
			// 	return err
			// }

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
			fmt.Printf("before reset len(vals) = %d at iteration %d\n", len(vals), i)
			vals = []interface{}{}
			fmt.Printf("after reset len(vals) = %d at iteration %d\n", len(vals), i)

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

		// _, err = ps.Exec(
		// 	record[0],
		// 	record[1],
		// 	record[2],
		// 	record[3],
		// 	record[4],
		// 	record[5],
		// 	record[6],
		// 	record[7],
		// 	record[8],
		// 	record[9],
		// 	record[10],
		// 	record[11],
		// 	record[12],
		// 	record[13],
		// 	record[14],
		// 	record[15],
		// )
		// if err != nil {
		// 	return err
		// }

		// for _, field := range record {
		// 	rowBuilder.WriteRune('"')
		// 	rowBuilder.WriteString(field)
		// 	rowBuilder.WriteRune('"')
		// 	rowBuilder.WriteRune(',')
		// }
		// valuesString := strings.TrimSuffix(rowBuilder.String(), ",")

		// stmt, err := tx.Prepare("insert into " + tablename + " values(" + valuesString + ");")
		// if err != nil {
		// 	return err
		// }

		// _, err = stmt.Exec()
		// if err != nil {
		// 	return err
		// }

		// rowBuilder.Reset()
	}
	insertString = strings.TrimSuffix(insertString, ",")
	fmt.Println("After loop. insert string  = " + insertString)

	ps, err := db.Prepare(insertString)
	if err != nil {
		return err
	}
	defer ps.Close()

	_, err = ps.Exec(vals...)
	if err != nil {
		return err
	}

	// err = tx.Commit()
	// if err != nil {
	// 	fmt.Println("Post loop commit error")
	// 	return err
	// }

	return nil

	// attempting to multithread the transactions. too much work to debug for little reward

	// chunks := len(records) / batchSize
	// wg := sync.WaitGroup{}
	// for i := 0; i < chunks; i++ {
	// 	wg.Add(1)

	// 	recordsChunk := [][]string{}
	// 	if i == 0 {
	// 		recordsChunk = records[1 : ((chunks+1)*batchSize)-1]
	// 	} else {
	// 		recordsChunk = records[chunks*batchSize : ((chunks+1)*batchSize)-1]
	// 	}

	// 	go func(rChunk [][]string) {
	// 		defer wg.Done()
	// 		rowBuilder := &strings.Builder{}
	// 		tx, err := db.Begin()
	// 		if err != nil {
	// 			return
	// 		}
	// 		for _, record := range rChunk {
	// 			for _, field := range record {
	// 				rowBuilder.WriteRune('"')
	// 				rowBuilder.WriteString(field)
	// 				rowBuilder.WriteRune('"')
	// 				rowBuilder.WriteRune(',')
	// 			}
	// 			valuesString := strings.TrimSuffix(rowBuilder.String(), ",")

	// 			_, err = tx.Exec("insert into " + tablename + " values(" + valuesString + ");")
	// 			if err != nil {
	// 				return
	// 			}
	// 			rowBuilder.Reset()
	// 		}
	// 		err = tx.Commit()
	// 		if err != nil {
	// 			return
	// 		}
	// 	}(recordsChunk)
	// }
	// wg.Wait()

	// return nil
}

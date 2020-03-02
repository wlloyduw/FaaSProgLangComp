package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"io/ioutil"
	"strconv"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
	"github.com/wlloyduw/FaaSProgLangComp/golang/saaf"
)

func main() {
	lambda.Start(HandleRequest)
}

func HandleRequest(ctx context.Context, request saaf.Request) (map[string]interface{}, error) {
	inspector := saaf.NewInspector()
	inspector.InspectAll()
	// inspector.AddAttribute("request", request)
	inspector.AddAttribute("bucketname", request.BucketName)
	inspector.AddAttribute("key", request.Key)

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

	editedRecords := writeCSV(records)

	pr, pw := io.Pipe()
	csvWriter := csv.NewWriter(pw)
	go func() {
		err = csvWriter.WriteAll(editedRecords)
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

	// example: edited_100_Sales_Records/edited_100_Sales_Records_<uuid>.csv
	newKey := "edited_" + strings.TrimSuffix(request.Key, ".csv") + "/" + "edited_" + strings.TrimSuffix(request.Key, ".csv") + "_" + uuid.New().String() + ".csv"

	inspector.AddAttribute("newKey", newKey)

	_, err = s3client.PutObject(&s3.PutObjectInput{Body: bytes.NewReader(editedBody), Bucket: &request.BucketName, Key: &newKey})
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

func writeCSV(records [][]string) [][]string {
	editedRecords := [][]string{}
	editedRecords = append(editedRecords, append(records[0], "Order Processing Time", "Gross Margin"))

	seenRecords := map[string]bool{}
	duplicates := 0

	for i, record := range records {
		if i == 0 {
			continue
		}

		id := record[6]
		if _, exists := seenRecords[id]; !exists {
			seenRecords[id] = true
		} else {
			duplicates++
			continue
		}

		if record[4] == "C" {
			record[4] = "Critical"
		} else if record[4] == "L" {
			record[4] = "Low"
		} else if record[4] == "M" {
			record[4] = "Medium"
		} else if record[4] == "H" {
			record[4] = "High"
		}

		orderDate := strings.Split(record[5], "/")
		shipDate := strings.Split(record[7], "/")

		orderM, _ := strconv.Atoi(orderDate[0])
		orderD, _ := strconv.Atoi(orderDate[1])
		orderY, _ := strconv.Atoi(orderDate[2])

		shipM, _ := strconv.Atoi(shipDate[0])
		shipD, _ := strconv.Atoi(shipDate[1])
		shipY, _ := strconv.Atoi(shipDate[2])

		orderTime := ((shipY - orderY) * 365) + ((shipM - orderM) * 30) + (shipD - orderD)

		thing, _ := strconv.ParseFloat(record[13], 64)
		thing2, _ := strconv.ParseFloat(record[11], 64)

		grossMargin := thing / thing2

		editedRecords = append(editedRecords, append(record, strconv.Itoa(orderTime), strconv.FormatFloat(grossMargin, 'f', 2, 64)))
	}

	return editedRecords
}

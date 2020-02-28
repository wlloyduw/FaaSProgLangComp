package saaf

// Request ...
type Request struct {
	BucketName       string              `json:"bucketname"`
	Key              string              `json:"key"`
	TableName        string              `json:"tablename"`
	BatchSize        int                 `json:"batchSize"`
	FilterBy         map[string][]string `json:"filterBy"`
	AggegrateBy      map[string][]string `json:"aggregateBy"`
	StressTestLoops  int                 `json:"stressTestLoops"`
	DatabaseEndpoint string              `json:"dbEndpoint"`
	DatabaseName     string              `json:"dbName"`
}

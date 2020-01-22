package saaf

type Request struct {
	BucketName  string              `json:"bucketname"`
	Key         string              `json:"key"`
	TableName   string              `json:"tablename"`
	FilterBy    map[string][]string `json:"filterBy"`
	AggegrateBy map[string][]string `json:"aggregateBy"`
}

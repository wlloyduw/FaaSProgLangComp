package saaf

type Request struct {
	BucketName string `json:"bucketname"`
	Key        string `json:"key"`
}

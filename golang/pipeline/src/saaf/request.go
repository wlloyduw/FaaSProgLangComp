package saaf

type Request struct {
	Name   string `json:"name"`
	Bucket string `json:"bucket"`
	Key    string `json:"key"`
}

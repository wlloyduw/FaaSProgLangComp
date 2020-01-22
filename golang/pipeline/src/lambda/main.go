package lambda

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/daperez18/562_group2_project/go_template/main/src/inspector"
)

func main() {
	lambda.Start(HandleRequest)
}

func HandleRequest(ctx context.Context, request Request) (map[string]interface{}, error) {

	inspector := inspector.New()
	inspector.InspectAll()

	//****************START FUNCTION IMPLEMENTATION*************************

	inspector.AddAttribute("message", fmt.Sprintf("Hello %s!", request.Name))
	inspector.AddAttribute("request", request)

	//****************END FUNCTION IMPLEMENTATION***************************

	//Collect final information such as total runtime and cpu deltas.
	inspector.InspectAllDeltas()
	return inspector.Finish(), nil
}

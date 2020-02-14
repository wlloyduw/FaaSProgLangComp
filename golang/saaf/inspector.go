package saaf

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
	"strings"
	"time"

	guid "github.com/google/uuid"
)

const (
	awsLambdaLogStreamNameKey      = "AWS_LAMBDA_LOG_STREAM_NAME"
	awsLambdaFunctionNameKey       = "AWS_LAMBDA_FUNCTION_NAME"
	awsLambdaFunctionMemorySizeKey = "AWS_LAMBDA_FUNCTION_MEMORY_SIZE"
	awsLambdaRegionKey             = "AWS_REGION"

	googleFunctionNameKey       = "X_GOOGLE_FUNCTION_NAME"
	googleFunctionMemorySizeKey = "X_GOOGLE_FUNCTION_MEMORY_MB"
	googleFunctionRegionKey     = "X_GOOGLE_FUNCTION_REGION"

	ibmFunctionNameKey   = "__OW_ACTION_NAME"
	ibmFunctionRegionKey = "__OW_API_HOST"

	azureContainerIDKey    = "CONTAINER_NAME"
	azureFunctionNameKey   = "WEBSITE_SITE_NAME"
	azureFunctionRegionKey = "Location"
)

// DONT USE RUN COMMAND, just read the file (ok in Java but other languages is terrible)
// or use whatevr you can to get 'uname -v' (low priority)
// inspectMemory is ok
// inspectLinux is last

// Inspector ...
type Inspector struct {
	startTime time.Time

	attributes        map[string]interface{}
	privateAttributes map[string]interface{}

	inspectedCPU       bool
	inspectedMemory    bool
	inspectedContainer bool
	inspectedPlatform  bool
	inspectedLinux     bool
}

// NewInspector - Initialize Inspector
func NewInspector() Inspector {
	inspector := Inspector{}

	inspector.startTime = time.Now()
	inspector.attributes = make(map[string]interface{})
	inspector.privateAttributes = make(map[string]interface{})

	inspector.attributes["version"] = 0.4
	inspector.attributes["lang"] = "go"
	inspector.attributes["startTime"] = inspector.startTime.Unix()

	return inspector
}

// InspectAll - Run all data collection methods and record framework runtime.
func (inspector *Inspector) InspectAll() {
	inspector.InspectContainer()
	inspector.InspectPlatform()
	inspector.InspectLinux()  // TODO
	inspector.InspectMemory() // TODO
	inspector.InspectCPU()
	inspector.AddTimeStamp("frameworkRuntime")
}

// InspectContainer - Collect information about the runtime container.
// uuid:         A unique identifier assigned to a container if one does not already exist.
// newcontainer: Whether a container is new (no assigned uuid) or if it has been used before.
// vmuptime:     The time when the system started in Unix time.
func (inspector *Inspector) InspectContainer() {
	if inspector.inspectedContainer {
		inspector.attributes["SAAFContainerError"] = "Container already inspected!"
		return
	}
	inspector.inspectedContainer = true

	var (
		filename     = "/tmp/container-id"
		newContainer int
		uuid         string
	)

	if _, err := os.Stat(filename); os.IsNotExist(err) { // check if the file exists, and if not, create it
		newContainer = 1
		uuid = guid.New().String()
		err = ioutil.WriteFile(filename, []byte(uuid), 0644)
		if err != nil {
			fmt.Printf("Error writing file %s ... err = %s", filename, err.Error())
			return
		}
	} else {
		newContainer = 0
		f, err := ioutil.ReadFile(filename)
		if err != nil {
			fmt.Printf("Error reading %s ... err = %s", filename, err.Error())
			return
		}
		uuid = string(f)
	}

	inspector.attributes["uuid"] = uuid
	inspector.attributes["newcontainer"] = newContainer

	//Get VM Uptime
	statMap, err := parseStatFile()
	if err != nil {
		fmt.Println(err)
		return
	}

	inspector.attributes["vmuptime"] = statMap["btime"]

}

// InspectPlatform - Collect information about the current FaaS platform.
// platform:        The FaaS platform hosting this function.
// containerID:     A unique identifier for containers of a platform.
// vmID:            A unique identifier for virtual machines of a platform.
// functionName:    The name of the function.
// functionMemory:  The memory setting of the function.
// functionRegion:  The region the function is deployed onto.
func (inspector *Inspector) InspectPlatform() {
	if inspector.inspectedPlatform {
		inspector.attributes["SAAFPlatformError"] = "Platform already inspected!"
		return
	}
	inspector.inspectedPlatform = true

	var (
		key    string
		exists bool
	)

	if key, exists = os.LookupEnv(awsLambdaLogStreamNameKey); exists { //AWS
		inspector.attributes["platform"] = "AWS Lambda"
		inspector.attributes["containerID"] = key
		inspector.attributes["functionName"] = os.Getenv(awsLambdaFunctionNameKey)
		inspector.attributes["functionMemory"] = os.Getenv(awsLambdaFunctionMemorySizeKey)
		inspector.attributes["functionRegion"] = os.Getenv(awsLambdaRegionKey)

		// TODO
		// String vmID = runCommand(new String[]{"cat", "/proc/self/cgroup"});
		// int index = vmID.indexOf("sandbox-root");
		// attributes.put("vmID", vmID.substring(index + 13, index + 19));
	} else if key, exists = os.LookupEnv(googleFunctionNameKey); exists { // Google Cloud
		inspector.attributes["platform"] = "Google Cloud Functions"
		inspector.attributes["functionName"] = key
		inspector.attributes["functionMemory"] = os.Getenv(googleFunctionMemorySizeKey)
		inspector.attributes["functionRegion"] = os.Getenv(googleFunctionRegionKey)
	} else if key, exists = os.LookupEnv(googleFunctionNameKey); exists { // IBM
		inspector.attributes["platform"] = "IBM Cloud Functions"
		inspector.attributes["functionName"] = key
		inspector.attributes["functionRegion"] = os.Getenv(ibmFunctionRegionKey)

		//TODO
		// attributes.put("vmID", runCommand(new String[]{"cat", "/sys/hypervisor/uuid"}).trim());
	} else if key, exists = os.LookupEnv(azureContainerIDKey); exists { // Azure
		inspector.attributes["platform"] = "Azure Functions"
		inspector.attributes["containerID"] = key
		inspector.attributes["functionName"] = os.Getenv(azureFunctionNameKey)
		inspector.attributes["functionRegion"] = os.Getenv(azureFunctionRegionKey)
	} else {
		inspector.attributes["platform"] = "Unknown Platform"
	}
}

// InspectLinux - Collect information about the linux kernel.
// linuxVersion: The version of the linux kernel.
func (inspector *Inspector) InspectLinux() {
	// Add check if previously inspected and if so, return
	// TODO
}

// InspectMemory - Inspects /proc/meminfo and /proc/vmstat. Add memory specific attributes:
// totalMemory:     Total memory allocated to the VM in kB.
// freeMemory:      Current free memory in kB when inspectMemory is called.
// pageFaults:      Total number of page faults experienced by the vm since boot.
// majorPageFaults: Total number of major page faults experienced since boot.
func (inspector *Inspector) InspectMemory() {
	// Add check if previously inspected and if so, return
	// TODO
}

// InspectCPU - Collect information about the CPU assigned to this function.
// cpuType:    The model name of the CPU.
// cpuModel:   The model number of the CPU.
// cpuCores:   The total number of cpu cores.
// cpuUsr:     Time spent normally executing in user mode.
// cpuNice:    Time spent executing niced processes in user mode.
// cpuKrn:     Time spent executing processes in kernel mode.
// cpuIdle:    Time spent idle.
// cpuIowait:  Time spent waiting for I/O to complete.
// cpuIrq:     Time spent servicing interrupts.
// cpuSoftIrq: Time spent servicing software interrupts.
// vmcpusteal: Time spent waiting for real CPU while hypervisor is using another virtual CPU.
// contextSwitches: Number of context switches.
func (inspector *Inspector) InspectCPU() {
	// Add check if previously inspected and if so, return
	if inspector.inspectedCPU {
		inspector.attributes["SAAFCPUError"] = "CPU already inspected!"
		return
	}
	inspector.inspectedCPU = true

	cpuInfoMap, err := parseCPUInfoFile()
	if err != nil {
		return
	}

	//Get CPU Type
	if modelName, exists := cpuInfoMap["model name"]; exists {
		inspector.attributes["cpuType"] = modelName
	}

	//Get CPU Model
	if cpuModel, exists := cpuInfoMap["model"]; exists {
		inspector.attributes["cpuModel"] = cpuModel
	}

	//Get CPU Core Count
	if cpuCores, exists := cpuInfoMap["cpu cores"]; exists {
		inspector.attributes["cpuCores"] = cpuCores
	}

	// readStatFile
	statMap, err := parseStatFile()
	if err != nil {
		return
	}

	params := strings.Split(statMap["cpu"], " ")
	metricNames := []string{"cpuUsr", "cpuNice", "cpuKrn", "cpuIdle", "cpuIowait", "cpuIrq", "cpuSoftIrq", "vmcpusteal"}
	for i, val := range metricNames {
		// inspector.AddAttribute(val, params[i])
		inspector.privateAttributes[val] = params[i]
	}

	// inspector.AddAttribute("contextSwitches", statMap["ctxt"])
	inspector.privateAttributes["contextSwitches"] = statMap["ctxt"]
}

// InspectAllDeltas - Run all delta collection methods add userRuntime attribute to further isolate use code runtime from time spent collecting data.
func (inspector *Inspector) InspectAllDeltas() {
	if val, ok := inspector.attributes["frameworkRuntime"]; ok {
		frameworkRuntimeDuration, err := time.ParseDuration(fmt.Sprintf("%dms", val.(int64)))
		if err != nil {
			fmt.Printf("Error parsing frameworkRuntimeDuration ... err = %s", err.Error())
		}
		inspector.AddTimeStampFrom("userRuntime", inspector.startTime.Add(frameworkRuntimeDuration))
		// inspector.attributes["userRuntime"] = time.Since(inspector.startTime).Milliseconds() - val.(int64) // manually get userRuntime
	}

	inspector.InspectCPUDelta()
	inspector.InspectMemoryDelta() // TODO
}

// InspectCPUDelta - Compare information gained from inspectCPU to the current CPU metrics.
// cpuUsrDelta:     Time spent normally executing in user mode.
// cpuNiceDelta:    Time spent executing niced processes in user mode.
// cpuKrnDelta:     Time spent executing processes in kernel mode.
// cpuIdleDelta:    Time spent idle.
// cpuIowaitDelta:  Time spent waiting for I/O to complete.
// cpuIrqDelta:     Time spent servicing interrupts.
// cpuSoftIrqDelta: Time spent servicing software interrupts.
// vmcpustealDelta: Time spent waiting for real CPU while hypervisor is using another virtual CPU.
// contextSwitchesDelta: Number of context switches.
func (inspector *Inspector) InspectCPUDelta() {
	if inspector.inspectedCPU {
		statMap, err := parseStatFile()
		if err != nil {
			fmt.Println(err)
			return
		}

		params := strings.Split(statMap["cpu"], " ")
		metricNames := []string{"cpuUsr", "cpuNice", "cpuKrn", "cpuIdle", "cpuIowait", "cpuIrq", "cpuSoftIrq", "vmcpusteal"}
		for i, val := range metricNames {
			currentValue, _ := strconv.Atoi(params[i])
			oldValue, _ := strconv.Atoi(inspector.privateAttributes[val].(string))
			inspector.attributes[val+"Delta"] = currentValue - oldValue
		}

		currentContextSwitchesValue, _ := strconv.Atoi(statMap["ctxt"])
		oldContextSwitches, _ := strconv.Atoi(inspector.privateAttributes["contextSwitches"].(string))
		inspector.attributes["contextSwitchesDelta"] = currentContextSwitchesValue - oldContextSwitches
	} else {
		inspector.attributes["SAAFCPUDeltaError"] = "CPU not inspected before collecting deltas!"
	}
}

// InspectMemoryDelta - Inspects /proc/vmstat to see how specific memory stats have changed.
// pageFaultsDelta:     The number of page faults experienced since inspectMemory was called.
// majorPageFaultsDelta: The number of major pafe faults since inspectMemory was called.
func (inspector *Inspector) InspectMemoryDelta() {
	// TODO
}

// Finish - Finalize the Inspector. Calculate the total runtime and return the HashMap object containing all attributes collected.
func (inspector *Inspector) Finish() map[string]interface{} {
	inspector.AddTimeStamp("runtime")
	inspector.attributes["endTime"] = time.Now().Unix()
	return inspector.attributes
}

// AddTimeStamp - Add custom time stamps to the output. The key value determines the name
// of the attribute and the value will be the time from Inspector initialization to this function call.
func (inspector *Inspector) AddTimeStamp(key string) {
	inspector.attributes[key] = time.Since(inspector.startTime).Milliseconds()
}

// AddTimeStampFrom - Add a custom time stamp to the output. The key value determines the name
// of the attribute and the value will be the time in milliseconds between the current time and the timeSince variable.
func (inspector *Inspector) AddTimeStampFrom(key string, timeSince time.Time) {
	inspector.attributes[key] = time.Since(timeSince).Milliseconds()
}

// AddAttribute - Add a custom attribute to the output.
func (inspector *Inspector) AddAttribute(key string, value interface{}) {
	inspector.attributes[key] = value
}

// GetAttribute - Gets a custom attribute from the attribute list.
func (inspector *Inspector) GetAttribute(key string) interface{} {
	return inspector.attributes[key]
}

func parseCPUInfoFile() (map[string]string, error) {
	filename := "/proc/cpuinfo"

	_, err := os.Stat(filename) // check if the file exists
	if os.IsNotExist(err) {
		return nil, fmt.Errorf("File %s not found", filename)
	}

	fileMap := map[string]string{}
	f, err := ioutil.ReadFile(filename)
	if err != nil {
		return fileMap, fmt.Errorf("Error reading %s ... err = %s", filename, err.Error())
	}

	lines := bytes.Split(f, []byte("\n"))
	for _, line := range lines {
		if bytes.Contains(line, []byte(":")) {
			splitbycolon := bytes.Split(line, []byte(":"))
			trimmedKey := strings.TrimSpace(string(splitbycolon[0]))
			trimmedValue := strings.TrimSpace(string(splitbycolon[1]))
			if _, exists := fileMap[trimmedKey]; !exists {
				fileMap[trimmedKey] = trimmedValue
			} else {
				fileMap[trimmedKey+"#2"] = trimmedValue
			}
		}
	}

	return fileMap, nil
}

func parseStatFile() (map[string]string, error) {
	filename := "/proc/stat"

	_, err := os.Stat(filename) // check if the file exists
	if os.IsNotExist(err) {
		return nil, fmt.Errorf("File %s not found", filename)
	}

	fileMap := map[string]string{}
	f, err := ioutil.ReadFile(filename)
	if err != nil {
		return fileMap, fmt.Errorf("Error reading %s ... err = %s", filename, err.Error())
	}

	lines := bytes.Split(f, []byte("\n"))
	for _, line := range lines {
		sLine := string(line)
		nameAndValue := strings.SplitN(sLine, " ", 2)
		if len(nameAndValue) > 1 {
			fileMap[nameAndValue[0]] = strings.TrimSpace(nameAndValue[1])
		}
	}
	return fileMap, nil
}

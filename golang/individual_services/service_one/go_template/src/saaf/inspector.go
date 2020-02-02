package saaf

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"strconv"
	"strings"
	"time"
)

// DONT USE RUN COMMAND, just read the file (ok in Java but other languages is terrible)
// or use whatevr you can to get 'uname -v' (low priority)
// no bean stuff (only java uses)
// inspectContainer is very important because it allows us to see if its a reused container
// inspectPlatform is next
// inspectMemory is ok
// inspectLinux is last
// Add check if previously inspected and if so, return
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

func NewInspector() Inspector {
	inspector := Inspector{}

	inspector.startTime = time.Now()
	inspector.attributes = make(map[string]interface{})

	inspector.attributes["version"] = 0.4
	inspector.attributes["lang"] = "go"

	inspector.privateAttributes = make(map[string]interface{})

	return inspector
}

func (inspector *Inspector) AddAttribute(key string, value interface{}) {
	inspector.attributes[key] = value
}

func (inspector *Inspector) GetAttribute(key string) interface{} {
	return inspector.attributes[key]
}

func (inspector *Inspector) InspectAll() {
	inspector.InspectContainer() // TODO
	inspector.InspectPlatform()  // TODO
	inspector.InspectLinux()     // TODO
	inspector.InspectMemory()    // TODO
	inspector.InspectCPU()
	inspector.AddTimeStamp("frameworkRuntime")
}

func (inspector *Inspector) InspectContainer() {
	// Add check if previously inspected and if so, return
	// TODO
}

func (inspector *Inspector) InspectPlatform() {
	// Add check if previously inspected and if so, return
	// TODO
}

func (inspector *Inspector) InspectLinux() {
	// Add check if previously inspected and if so, return
	// TODO
}

func (inspector *Inspector) InspectMemory() {
	// Add check if previously inspected and if so, return
	// TODO
}

func (inspector *Inspector) InspectCPU() {
	// Add check if previously inspected and if so, return
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

func parseCPUInfoFile() (map[string]string, error) {
	fileMap := map[string]string{}
	f, err := ioutil.ReadFile("/proc/cpuinfo")
	if err != nil {
		fmt.Printf("Error reading /proc/cpuinfo: err = %s", err)
		return fileMap, err
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
	fileMap := map[string]string{}
	f, err := ioutil.ReadFile("/proc/stat")
	if err != nil {
		fmt.Printf("Error reading /proc/stat: err = %s", err)
		return fileMap, err
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

func (inspector *Inspector) InspectAllDeltas() {
	if val, ok := inspector.attributes["frameworkRuntime"]; ok {
		inspector.attributes["userRuntime"] = time.Since(inspector.startTime).Milliseconds() - val.(int64)
	}

	inspector.InspectCPUDelta()
	inspector.InspectMemoryDelta() // TODO
}

func (inspector *Inspector) InspectCPUDelta() {
	// Add check that value had previously been gotten to all inspect*deltas
	statMap, err := parseStatFile()
	if err != nil {
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
}

func (inspector *Inspector) InspectMemoryDelta() {
	// TODO
}

// can we add another timestamp method that takes a timestamp and adds a timestamp in relation to one that is passed
func (inspector *Inspector) AddTimeStamp(key string) {
	inspector.attributes[key] = time.Since(inspector.startTime).Milliseconds()
}

func (inspector *Inspector) Finish() map[string]interface{} {
	inspector.attributes["runtime"] = time.Since(inspector.startTime).Milliseconds()
	return inspector.attributes
}

package saaf

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"strconv"
	"strings"
	"time"
)

type Inspector struct {
	startTime  int64
	attributes map[string]interface{}

	inspectedCPU       bool
	inspectedMemory    bool
	inspectedContainer bool
	inspectedPlatform  bool
	inspectedLinux     bool
}

func New() Inspector {
	inspector := Inspector{}

	inspector.startTime = time.Now().Unix()
	inspector.attributes = make(map[string]interface{})

	inspector.attributes["version"] = 0.4
	inspector.attributes["lang"] = "go"

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
	// TODO
}

func (inspector *Inspector) InspectPlatform() {
	// TODO
}

func (inspector *Inspector) InspectLinux() {
	// TODO
}

func (inspector *Inspector) InspectMemory() {
	// TODO
}

func (inspector *Inspector) InspectCPU() {
	inspector.inspectedCPU = true

	cpuInfoMap, err := parseCPUInfoFile()
	if err != nil {
		return
	}

	//Get CPU Type
	if modelName, exists := cpuInfoMap["model name"]; exists {
		inspector.AddAttribute("cpuType", modelName)
	}

	//Get CPU Model
	if cpuModel, exists := cpuInfoMap["model"]; exists {
		inspector.AddAttribute("cpuModel", cpuModel)
	}

	//Get CPU Core Count
	if cpuCores, exists := cpuInfoMap["cpu cores"]; exists {
		inspector.AddAttribute("cpuCores", cpuCores)
	}

	// readStatFile
	statMap, err := parseStatFile()
	if err != nil {
		return
	}

	params := strings.Split(statMap["cpu"], " ")
	metricNames := []string{"cpuUsr", "cpuNice", "cpuKrn", "cpuIdle", "cpuIowait", "cpuIrq", "cpuSoftIrq", "vmcpusteal"}
	for i, val := range metricNames {
		inspector.AddAttribute(val, params[i])
	}

	inspector.AddAttribute("contextSwitches", statMap["ctxt"])
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
		currentTime := time.Now().Unix()
		codeRuntime := (currentTime - inspector.startTime) - val.(int64)
		inspector.attributes["userRuntime"] = codeRuntime
	}

	inspector.InspectCPUDelta()
	inspector.InspectMemoryDelta() // TODO
}

func (inspector *Inspector) InspectCPUDelta() {
	statMap, err := parseStatFile()
	if err != nil {
		return
	}

	params := strings.Split(statMap["cpu"], " ")
	metricNames := []string{"cpuUsr", "cpuNice", "cpuKrn", "cpuIdle", "cpuIowait", "cpuIrq", "cpuSoftIrq", "vmcpusteal"}
	for i, val := range metricNames {
		currentValue, _ := strconv.Atoi(params[i])
		oldValue, _ := strconv.Atoi(inspector.GetAttribute(val).(string))
		inspector.AddAttribute(val+"Delta", currentValue-oldValue)
	}

	currentContextSwitchesValue, _ := strconv.Atoi(statMap["ctxt"])
	oldContextSwitches, _ := strconv.Atoi(inspector.GetAttribute("contextSwitches").(string))
	inspector.AddAttribute("contextSwitchesDelta", currentContextSwitchesValue-oldContextSwitches)
}

func (inspector *Inspector) InspectMemoryDelta() {
	// TODO
}

func (inspector *Inspector) AddTimeStamp(key string) {
	currentTime := time.Now().Unix()
	runtime := (currentTime - inspector.startTime)
	inspector.attributes[key] = runtime
}

func (inspector *Inspector) Finish() map[string]interface{} {
	endTime := time.Now().Unix()
	runtime := (endTime - inspector.startTime)
	inspector.attributes["runtime"] = runtime
	return inspector.attributes
}

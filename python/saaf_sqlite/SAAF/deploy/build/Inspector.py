import json
import logging
import os
import subprocess
import re
import uuid
import shlex
import time

#
# FaaS Inspector
#
# @author Wes Lloyd
# @author Wen Shu
# @author Robert Cordingly
#
class Inspector:
    
    #
    # Initialize FaaS Inspector.
    #
    # __attributes: Used to store information collected by each function.
    #
    def __init__(self):
        self.__startTime = time.time()
        self.__attributes = {"version": 0.2, "lang": "python"}
        
    #
    # Collect information about the runtime container.
    #
    # uuid:            A unique identifier assigned to a container if one does not already exist.
    # newcontainer:    Whether a container is new (no assigned uuid) or if it has been used before.
    # vmuptime:        The time when the system started in Unix time.
    #
    def inspectContainer(self):
        myUuid = ''
        newContainer = 1
        if os.path.isfile('/tmp/container-id'):
            stampFile = open('/tmp/container-id', 'r')
            stampID = stampFile.readline()
            myUuid = stampID
            stampFile.close()
            newContainer = 0
        else:
            stampFile = open('/tmp/container-id', 'w')
            myUuid = str(uuid.uuid4())
            stampFile.write(myUuid)
            stampFile.close()
            
        self.__attributes['uuid'] = myUuid
        self.__attributes['newcontainer'] = newContainer
        
        cliInput = 'grep btime /proc/stat'
        args = shlex.split(cliInput)
        f = subprocess.check_output(args).decode('utf-8')
        self.__attributes['vmuptime'] = int(f.strip().replace('btime ',''))
        
    #
    # Collect information about the CPU assigned to this function.
    #
    # cpuType:     The model name of the CPU.
    # cpuModel:    The model number of the CPU.
    # cpuUsr:      Time spent normally executing in user mode.
    # cpuNice:     Time spent executing niced processes in user mode.
    # cpuKrn:      Time spent executing processes in kernel mode.
    # cpuIdle:     Time spent idle.
    # cpuIowait:   Time spent waiting for I/O to complete.
    # cpuIrq:      Time spent servicing interrupts.
    # cpuSoftIrq:  Time spent servicing software interrupts.
    # vmcpusteal:  Time spent waiting for real CPU while hypervisor is using another virtual CPU.
    #
    def inspectCPU(self):
        child = os.popen('grep \'model name\' /proc/cpuinfo | head -1')
        CPUModelName = child.read()
        CPUModelName = re.sub('[\n\t]','', CPUModelName)
        CPUModelName = CPUModelName.replace('model name: ', '')
        self.__attributes['cpuType'] = CPUModelName
        
        child = os.popen('grep \'model\t:\' /proc/cpuinfo | head -1')
        CPUModel = child.read()
        CPUModel = re.sub('[\n\t]','', CPUModel)
        CPUModel = CPUModelName.replace('model\t: ', '')
        self.__attributes['cpuModel'] = CPUModel
        
        child = os.popen('cat /proc/stat | grep "^cpu" | head -1')
        CPUMetrics = child.read()
        CPUMetrics = CPUMetrics.split()
        
        metricNames = ['cpuUsr', 'cpuNice', 'cpuKrn', 'cpuIdle', 'cpuIowait', 'cpuIrq', 'cpuSoftIrq', 'vmcpusteal']
        for i, name in enumerate(metricNames):
            self.__attributes[name] = int(CPUMetrics[i + 1]) 
        
    #
    # Compare information gained from inspectCPU to the current CPU metrics.
    #
    # Note: This function should be called at the end of your function and 
    # must be called AFTER inspectCPU.
    #
    # cpuUsrDelta:      Time spent normally executing in user mode.
    # cpuNiceDelta:     Time spent executing niced processes in user mode.
    # cpuKrnDelta:      Time spent executing processes in kernel mode.
    # cpuIdleDelta:     Time spent idle.
    # cpuIowaitDelta:   Time spent waiting for I/O to complete.
    # cpuIrqDelta:      Time spent servicing interrupts.
    # cpuSoftIrqDelta:  Time spent servicing software interrupts.
    # vmcpustealDelta:  Time spent waiting for real CPU while hypervisor is using another virtual CPU.
    #
    def inspectCPUDelta(self):
        child = os.popen('cat /proc/stat | grep "^cpu" | head -1')
        CPUMetrics = child.read()
        CPUMetrics = CPUMetrics.split()
        
        metricNames = ['cpuUsr', 'cpuNice', 'cpuKrn', 'cpuIdle', 'cpuIowait', 'cpuIrq', 'cpuSoftIrq', 'vmcpusteal']
        for i, name in enumerate(metricNames):
            self.__attributes[name + "Delta"] = int(CPUMetrics[i + 1]) - self.__attributes[name]
        
    #
    # Collect information about the current FaaS platform.
    #
    # platform:    The FaaS platform hosting this function.
    #
    def inspectPlatform(self):
        child = os.popen('env')
        environment = child.read()
        if "AWS_LAMBDA" in environment:
            self.__attributes['platform'] = "AWS Lambda"
            
            containerID = os.popen('echo $AWS_LAMBDA_LOG_STREAM_NAME').read().replace('\n', '')
            self.__attributes['containerID'] = containerID
            
            vmID = os.popen('cat /proc/self/cgroup | grep 2:cpu').read().replace('\n', '')
            self.__attributes['vmID'] = vmID[20: 26]
            
        elif "X_GOOGLE" in environment:
            self.__attributes['platform'] = "Google Cloud Functions"
        elif "functions.cloud.ibm" in environment:
            self.__attributes['platform'] = "IBM Cloud Functions"
        elif "microsoft.com/azure-functions" in environment:
            self.__attributes['platform'] = "Azure Functions"
            
            containerID = os.popen('echo $CONTAINER_NAME').read().replace('\n', '')
            self.__attributes['containerID'] = containerID
            
        else:
            self.__attributes['platform'] = "Unknown Platform"
        
    #
    # Collect information about the linux kernel.
    #
    # linuxVersion:    The version of the linux kernel.
    #
    def inspectLinux(self):
        child = os.popen('uname -v')
        linuxVersion = child.read()
        linuxVersion = re.sub('[\n]','', linuxVersion)
        self.__attributes['linuxVersion'] = linuxVersion
        
    #
    # Run all data collection methods and record framework runtime.
    #
    def inspectAll(self):
        self.inspectCPU()
        self.inspectContainer()
        self.inspectLinux()
        self.inspectPlatform()
        self.addTimeStamp("frameworkRuntime")
        
    #
    # Add a custom attribute to the output.
    #
    # @param key A string ot use as the key value.
    # @param value The value to associate with that key.
    #
    def addAttribute(self, key, value):
        self.__attributes[key] = value
        
    #
    # Gets a custom attribute from the attribute list.
    #
    # @param key The key of the attribute.
    # @return The object associated with the key.
    #
    def getAttribute(self, key):
        return self.__attributes[key]
        
    #
    # Add custom time stamps to the output. The key value determines the name
    # of the attribute and the value will be the time from Inspector initialization
    # to this function call. 
    #
    # @param key The name of the time stamp.
    #
    def addTimeStamp(self, key):
        timeSinceStart = round((time.time() - self.__startTime) * 100000) / 100
        self.__attributes[key] = timeSinceStart
        
    #
    # Add custom time stamps to the output. The key value determines the name
    # of the attribute and the value will be the time from Inspector initialization
    # to this function call. 
    #
    # @param key The name of the time stamp.
    #
    def finish(self):
        self.__attributes['runtime'] = round((time.time() - self.__startTime) * 100000) / 100
        return self.__attributes
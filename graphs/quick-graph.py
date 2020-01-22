import matplotlib.pyplot as plt

import numpy as np;
import os;
import pandas as pd
import csv;
import glob;


import plotly.graph_objects as go
import plotly.express as px



labels = ["100", "1000", "5000", "10000", "50000", "100000", "500000", "1000000", "1500000"]


filenames_service1=["Service1-100.csv", "Service1-1000.csv", "Service1-5000.csv", "Service1-10000.csv", "Service1-50000.csv", "Service1-100000.csv", "Service1-500000.csv", "Service1-1000000.csv", "Service1-1500000.csv"]
filenames_service2=["Service2-100.csv", "Service2-1000.csv", "Service2-5000.csv", "Service2-10000.csv", "Service2-50000.csv", "Service2-100000.csv", "Service2-500000.csv", "Service2-1000000.csv", "Service2-1500000.csv"]
filenames_service3=["Service3-100.csv", "Service3-1000.csv", "Service3-5000.csv", "Service3-10000.csv", "Service3-50000.csv", "Service3-100000.csv", "Service3-500000.csv", "Service3-1000000.csv", "Service3-1500000.csv"]


metrics=[ "avg_runtime", "avg_cpuIdleDelta", "avg_cpuIowaitDelta", "avg_cpuKrnDelta", "avg_cpuSoftIrqDelta", "avg_cpuUsrDelta", "avg_frameworkRuntime", "avg_latency", "avg_roundTripTime"]
ytitles=[ "runtime (ms)", "Cpu idle time (seconds)", "cpu time waiting for io (seconds)" ,"Time executing processes in kernel mode", "cpu Time spent servicing soft-interrupts (seocnds)", "CPU proces time executing in user mode (seconds)", "Time spent inspecting (ms)", "latency (ms)", "round trip time (ms)"]

	

def export_graphs_as_images(fig, file_name, title):
	file_name=file_name.split('.',1)[0]
	if not os.path.exists(file_name):
		os.makedirs(file_name )
	fig.write_image(file_name +"/" +title +".png")
	#print("saved image: " +title +".png to " + os.path.abspath(file_name +"_images"))
	



def get_names(file_to_open):
    with open(file_to_open, 'r') as csvfile:

        reader = csv.reader(csvfile)
        num = []
        for i, row in enumerate(reader):
            if i ==0:
                firstline = ''.join(row).split()
                lenfirstline = len(firstline)

            num.append(len(''.join(row).split()))
        m = max(num)
        rng = range(1, m - lenfirstline + 2)
        #remove )
        rng = firstline[:-1] + rng
        return rng

def plot_bar_all(labels, all_data, all_title, foldertitle):
	count = 0;
	for sublist in all_data:
		index = np.arange(len(labels))
		plt.bar(index, sublist)
		plt.xlabel("Csv Size", fontsize=5)
		plt.xticks(index, labels, fontsize=5, rotation=15)
		plt.title(all_title[count])



		fig = go.Figure([go.Bar(x=labels, y=sublist)])
		fig.update_layout(xaxis=dict(type='category'))
		fig.update_layout(title = { 'text':all_title[count]})
		fig.update_xaxes(title="Csv Row Count")
		export_graphs_as_images(fig, foldertitle, all_title[count])

		count +=1


def plot_bar_x(label, data_list, title):




	fig.update_layout(xaxis=dict(type='category'))
	fig.update_layout(title = { 'text':title})
	fig.update_xaxes(title="Csv Row Count")
	export_graphs_as_images(fig, "Service3_images", title)







def get_all_data(filenames, tempadd):
	all_data = []
	path = os.getcwd() + tempadd;
	for file_name in filenames:
		csv_file = str(path) + '/' + file_name;
		#data = list(csv.reader(open(csv_file, 'r')))
		#a = csv.reader(open(csv_file, 'rU'))
		reader = csv.reader(open(csv_file, 'rU'))
		data = list(reader)

		all_data.append(data);
	return all_data

def fill_data(all_data):
	titles = []
	mysuperlist=[]
	counter=0;

	index_list = all_data[0]
	for i in range(0, len(index_list)):
		if len(index_list[i]) > 0:
		
			if index_list[i][0] == "zAll":
				temp_list= all_data[0][i]
				test_list = [x for x in temp_list if x] 

				start = index_list[i].index("uses")

				start +=1
				for p in range(start, len(test_list)):
					mysuperlist.append([])
				break


	for sublist in all_data:
		counter=0;
		for i in range(0, len(sublist)):
			if len(sublist[i]) > 0:

				if sublist[i][0] == "zAll":

					temp_list= (sublist[i])
					test_list = [x for x in temp_list if x] 
					length= len(test_list)
					titles = sublist[i][sublist[i].index("uses")+1:length]
					start = sublist[i].index("uses")+1
					
				
					for j in range(start, length):

					
						mysuperlist[counter].append(sublist[i+1][j])
						counter +=1;


	return mysuperlist, titles;
			





def get_combined_graph_metric(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metric):
	newlist = [];
	l1=[]
	l2=[]
	l3=[]
	for i in range(0, 3):
		
		for x in range(0, 9):
			l1.append(java_stats[java_titles.index(metric)][x])
			l2.append(python_stats[python_titles.index(metric)][x])
			l3.append(go_stats[go_titles.index(metric)][x])

	newlist.append(l1)
	newlist.append(l2)
	newlist.append(l3)
	return newlist



def get_all_graphs_in_metrics(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metrics, y_titles, tempadd):
	i = 0;
	for metric in metrics:
		newlist = get_combined_graph_metric(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metric)
		print ("java: {} ".format(java_titles))
		print("python: {} ".format(python_titles))
		print("go: {}".format(go_titles))
		fig = go.Figure(data=[
		    go.Scatter(name="java", x=labels, y=newlist[0]),
		    go.Scatter(name="python", x=labels, y=newlist[1]),
		    go.Scatter(name="Go", x=labels, y=newlist[2])
		])

		min_val =  min(min([min(newlist[0]), min(newlist[1]), min(newlist[2])]))
		max_val = max(max([max(newlist[0]), max(newlist[1]), max(newlist[2])]))
		fig.update_yaxes(range=[min_val , max_val])
		fig.update_layout(xaxis=dict(type='category'))
		fig.update_layout(title = { 'text':tempadd.split('./')[len(tempadd.split('./')) -1] +"_{}".format(metric)})
		fig.update_xaxes(title="Number of Records", showline=True, linewidth=3, linecolor='black', mirror=True )
		fig.update_yaxes(title=y_titles[i], showline=True, linewidth=3, linecolor='black', mirror=True)
		#update_fig(fig, "asd", tempadd.split('./')[len(tempadd.split('./')) -1] +"_{}".format(metric))
		export_graphs_as_images(fig, "{}/Line".format(tempadd), metric)

		fig = go.Figure(data=[
		    go.Bar(name="java", x=labels, y=newlist[0]),
		    go.Bar(name="python", x=labels, y=newlist[1]),
		    go.Bar(name="Go", x=labels, y=newlist[2])
		])

		min_val =  min(min([min(newlist[0]), min(newlist[1]), min(newlist[2])]))
		max_val = max(max([max(newlist[0]), max(newlist[1]), max(newlist[2])]))
		fig.update_yaxes(range=[min_val , max_val])
		fig.update_layout(xaxis=dict(type='category'))

		fig.update_layout(title = { 'text':tempadd.split('./')[len(tempadd.split('./')) -1] +"_{}".format(metric)})


		fig.update_yaxes(title=y_titles[i], showline=True, linewidth=3, linecolor='black', mirror=True)
		fig.update_xaxes(title="Number of Records", showline=True, linewidth=3, linecolor='black', mirror=True )
		export_graphs_as_images(fig, "{}/Bar".format(tempadd), metric)
		i +=1


##does graphing service 1

all_data_java = get_all_data(filenames_service1, "/Java/ServiceOne")
all_data_python = get_all_data(filenames_service1, "/Python/ServiceOne")
all_data_go = get_all_data(filenames_service1, "/Go/ServiceOne")


java_stats, java_titles=fill_data(all_data_java)
python_stats, python_titles=fill_data(all_data_python)
go_stats, go_titles=fill_data(all_data_go)

get_all_graphs_in_metrics(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metrics, ytitles,"ServiceOne")

print("service 1 done")
#does graphing service2
#======================================#
#======================================#
all_data_java = get_all_data(filenames_service2,  "/Java/ServiceTwo")
all_data_python = get_all_data(filenames_service2, "/Python/ServiceTwo")
all_data_go = get_all_data(filenames_service2, "/Go/ServiceTwo")


java_stats, java_titles=fill_data(all_data_java)
python_stats, python_titles=fill_data(all_data_python)
go_stats, go_titles=fill_data(all_data_go)
get_all_graphs_in_metrics(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metrics, ytitles,"ServiceTwo")
#======================================#
#======================================#

#does graphing service3
all_data_java = get_all_data(filenames_service3, "/Java/ServiceThree")
all_data_python = get_all_data(filenames_service3, "/Python/ServiceThree")
all_data_go = get_all_data(filenames_service3, "/Go/ServiceThree")


java_stats, java_titles=fill_data(all_data_java)
python_stats, python_titles=fill_data(all_data_python)
go_stats, go_titles=fill_data(all_data_go)

get_all_graphs_in_metrics(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metrics, ytitles,"ServiceThree")
#======================================#
#======================================#

#plot_bar_all(labels, java_stats, java_titles, "java_images")
#plot_bar_all(labels, python_stats, python_titles, "python_images")
#plot_bar_all(labels, go_stats, go_titles, "go_images")









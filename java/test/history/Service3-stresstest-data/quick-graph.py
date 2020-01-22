import matplotlib.pyplot as plt

import numpy as np;
import os;
import pandas as pd
import csv;
import glob;


import plotly.graph_objects as go
import plotly.express as px




labels = ["100", "1000", "5000", "10000", "50000", "100000", "500000", "1000000", "1500000"]


filenames_java=["Service3-100.csv", "Service3-1000.csv", "Service3-5000.csv", "Service3-10000.csv", "Service3-50000.csv", "Service3-100000.csv", "Service3-500000.csv", "Service3-1000000.csv", "Service3-1500000.csv"]
filenames_python=["Service3-100.csv", "Service3-1000.csv", "Service3-5000.csv", "Service3-10000.csv", "Service3-50000.csv", "Service3-100000.csv", "Service3-500000.csv", "Service3-1000000.csv", "Service3-1500000.csv"]
filenames_go=["Service3-100.csv", "Service3-1000.csv", "Service3-5000.csv", "Service3-10000.csv", "Service3-50000.csv", "Service3-100000.csv", "Service3-500000.csv", "Service3-1000000.csv", "Service3-1500000.csv"]

metrics=["avg_contextSwitchesDelta", "avg_userRuntime"]


def export_graphs_as_images(fig, file_name, title):
	file_name=file_name.split('.',1)[0]
	if not os.path.exists(file_name +"_images"):
		os.makedirs(file_name +"_images")
	fig.write_image(file_name +"_images/"+title +".png")
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







def get_all_data(filenames):
	all_data = []
	path = os.getcwd();
	for file_name in filenames:
		csv_file = str(path) + '/' + file_name;

		data = list(csv.reader(open(csv_file)))
		all_data.append(data);
	return all_data

def fill_data(all_data):
	titles = []
	mysuperlist=[]
	counter=0;
	print (all_data[0])

	index_list = all_data[0]
	for i in range(0, len(index_list)):
		if len(index_list[i]) > 0:
		
			if index_list[i][0] == "zAll":
				length= len(all_data[0][i])
				for p in range(3, length):
					mysuperlist.append([])
				break


	for sublist in all_data:
		counter=0;
		for i in range(0, len(sublist)):
			if len(sublist[i]) > 0:

				if sublist[i][0] == "zAll":
					length= len(sublist[i])
					titles = sublist[i][3:length]
					for j in range(3, length):
						mysuperlist[counter].append(sublist[i+1][j])
						counter +=1;
	return mysuperlist, titles;
			
#for sublist in all_data:
#	counter=0;
#	for i in range(0, len(sublist)):
#		if len(sublist[i]) > 0:
#
#			if sublist[i][0] == "zAll":
#
#				every_single_stat_metric_title = sublist[i][3:31]
#				for j in range(3, 31):
#
#					every_single_stat_in_zall2[counter].append(sublist[i+1][j])
#					counter +=1;





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


def get_all_graphs_in_metrics(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metrics):
	for metric in metrics:
		newlist = get_combined_graph_metric(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metric)
		fig = go.Figure(data=[
		    go.Bar(name="java", x=labels, y=newlist[0]),
		    go.Bar(name="python", x=labels, y=newlist[1]),
		    go.Bar(name="Go", x=labels, y=newlist[2])
		])

		min_val =  min(min([min(newlist[0]), min(newlist[1]), min(newlist[2])]))
		max_val = max(max([max(newlist[0]), max(newlist[1]), max(newlist[2])]))
		fig.update_yaxes(range=[min_val , max_val])
		fig.update_layout(xaxis=dict(type='category'))
		fig.update_layout(title = { 'text':metric})
		fig.update_xaxes(title="Csv Row Count")
		export_graphs_as_images(fig, "joined_images", metric)



all_data_java = get_all_data(filenames_java)
all_data_python = get_all_data(filenames_python)
all_data_go = get_all_data(filenames_go)


java_stats, java_titles=fill_data(all_data_java)
python_stats, python_titles=fill_data(all_data_python)
go_stats, go_titles=fill_data(all_data_go)


print(go_stats)

plot_bar_all(labels, java_stats, java_titles, "java_images")
plot_bar_all(labels, python_stats, python_titles, "python_images")
plot_bar_all(labels, go_stats, go_titles, "go_images")

get_all_graphs_in_metrics(java_stats, python_stats, go_stats, java_titles, python_titles, go_titles, metrics)









import matplotlib.pyplot as plt

import numpy as np;
import os;
import pandas as pd
import csv;
import glob;


import plotly.graph_objects as go
import plotly.express as px




labels = ["100", "1000", "5000", "10000", "50000", "100000", "500000", "1000000", "1500000"]
#labels=["a","b","c","d","e","f","g","h","i"]
run_time_data= [ ]
latency_data = [ ]
context_switch_delta=[]
filenames=["ServiceOneGo-100recordExperiment-0MBs-run0.csv", "ServiceOneGo-1000recordExperiment-0MBs-run0.csv", "ServiceOneGo-5000recordExperiment-0MBs-run0.csv", "ServiceOneGo-10000recordExperiment-0MBs-run0.csv", "ServiceOneGo-50000recordExperiment-0MBs-run0.csv", "ServiceOneGo-100000recordExperiment-0MBs-run0.csv", "ServiceOneGo-500000recordExperiment-0MBs-run0.csv", "ServiceOneGo-1000000recordExperiment-0MBs-run0.csv", "ServiceOneGo-1500000recordExperiment-0MBs-run0.csv"]


every_single_stat_in_zall=[[], [], [], [], [],   [], [], [], [], [],   [], [], [], [], [],       [], [],[] ,[] ,[] ,     [], [], [], [], [],     [], [], [] ]
every_single_stat_metric_title =[];

context_data = [ ]



def export_graphs_as_images(fig, file_name, title):
	file_name=file_name.split('.',1)[0]
	if not os.path.exists(file_name +"_images"):
		os.mkdir(file_name +"_images")
	fig.write_image(file_name +"_images/"+title +".png")
	print("saved image: " +title +".png to " + os.path.abspath(file_name +"_images"))
	



def get_names(file_to_open):
    with open(file_to_open, 'r') as csvfile:
        reader = csv.reader(csvfile)
        num = []
        for i, row in enumerate(reader):
            if i ==0:
                firstline = ''.join(row).split()
                lenfirstline = len(firstline)
                #print firstline, lenfirstline
            num.append(len(''.join(row).split()))
        m = max(num)
        rng = range(1, m - lenfirstline + 2)
        #remove )
        rng = firstline[:-1] + rng
        return rng

def plot_bar_all(labels, all_data, all_title):
	count = 0;
	for sublist in all_data:
		index = np.arange(len(labels))
		plt.bar(index, sublist)
		plt.xlabel("Csv Size", fontsize=5)
		plt.xticks(index, labels, fontsize=5, rotation=15)
		plt.title(all_title[count])


		print (sublist)
		fig = go.Figure([go.Bar(x=labels, y=sublist)])
		fig.update_layout(xaxis=dict(type='category'))
		fig.update_layout(title = { 'text':all_title[count]})
		fig.update_xaxes(title="Csv Row Count")
		export_graphs_as_images(fig, "Service1_images", all_title[count])

		count +=1


def plot_bar_x(label, all_data, all_Title):
    index = np.arange(len(labels))
    print("whatever")
    plt.bar(index, data)
    print("asd")
    plt.xlabel("Csv Size", fontsize=15)
    plt.ylabel("Run Time( ms)")
    plt.xticks(index, label, fontsize=15, rotation=30)
    plt.title(Title);
    plt.show();



path = os.getcwd();

all_data = [];
for file_name in filenames:
	csv_file = str(path) + '/' + file_name;
	print(csv_file)
	data = list(csv.reader(open(csv_file)))
	all_data.append(data);




for sublist in all_data:
	counter=0;
	for i in range(0, len(sublist)):
		if len(sublist[i]) > 0:

			if sublist[i][0] == "zAll":
				#goes to 30
				print("found it on row {}".format(i));	
				#run_time_data.append(sublist[i+1][23])
				#latency_data.append(sublist[i+1][16])
				#context_switch_data.append(sublist[i+1][4])
				every_single_stat_metric_title = sublist[i][3:17]
				for j in range(3, 17):

					every_single_stat_in_zall[counter].append(sublist[i+1][j])
					counter +=1;


plot_bar_all(labels, every_single_stat_in_zall, every_single_stat_metric_title)
#print (every_single_stat_metric_title)

#print every_single_stat_in_zall[1]
#plot_bar_x(label, run_time_data, "Runtime Graph");




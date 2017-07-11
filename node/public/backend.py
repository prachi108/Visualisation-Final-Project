import pandas as pd
import random as rd
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn import metrics
import matplotlib.pyplot as plt
from sklearn.manifold import MDS
from scipy.spatial.distance import cdist, pdist
import numpy as np
from sklearn import cluster as Kcluster
from sklearn.preprocessing import StandardScaler
from flask import Flask, render_template

def elbowKMeans(inputData, n):
    Ks = list(range(1, n))
    km = [KMeans(n_clusters=i) for i in Ks]
    score = [km[i].fit(inputData).score(inputData) for i in range(len(km))]
    df_Ks = pd.DataFrame(Ks)
    df_Ks.columns = ["K"]
    df_score = pd.DataFrame(score).abs()
    df_score.columns = ["k_means_error"]
    sample = df_Ks.join([df_score])
    return 1

def adaptive_sampling(data_frame, cluster_count,fraction):
    k_means = Kcluster.KMeans(n_clusters=cluster_count)
    k_means.fit(data_frame)
    data_frame['label'] = k_means.labels_
    adaptiveSampleRows = []
    for i in range(cluster_count):
         adaptiveSampleRows.append(data_frame.ix[rd.sample(data_frame[data_frame['label'] == i].index, (int)(len(data_frame[data_frame['label'] == i])*fraction))])

    print("Size of Each Cluster in Adaptive Sampling")
    for i in range(cluster_count):
        print('Size of Cluster '+str(i)+ ' is ' +str(len(adaptiveSampleRows[i])))

    adaptiveSample = pd.concat(adaptiveSampleRows)
    del adaptiveSample['label']
    return adaptiveSample

def analyse_pca(random_sample, adaptive_sample):
    pca = PCA(n_components=2)
    pca_random = pd.DataFrame(pca.fit_transform(random_sample))
    pca_adaptive = pd.DataFrame(pca.fit_transform(adaptive_sample))
    #print(pca_random.shape)
    #print(pca_adaptive.shape)
    createFile(pca_random, pca_adaptive, 'pca_output.csv')


def createScreeWithEigan(inputSamples, name):
    X_std = StandardScaler().fit_transform(inputSamples)
    # Eigan values for co-variance matrix
    cov_mat = np.cov(X_std.T)
    eig_vals1, eig_vecs1 = np.linalg.eig(cov_mat)
    # Eigan values for co-relation matrix
    cor_mat1 = np.corrcoef(X_std.T)
    eig_vals, eig_vecs = np.linalg.eig(cor_mat1)
    y = eig_vals
    x = np.arange(len(y)) + 1
    df_eig = pd.DataFrame(eig_vals)
    df_eig.columns = ["eigan_values"]
    df_pca = pd.DataFrame(x)
    df_pca.columns = ["PCA_components"]
    sample = df_eig.join([df_pca])
    sample.to_csv("./data/scree_plot_"+name+".csv", sep=',')
    plt.plot(x, y, "o-")
    plt.xticks(x, ["PC" + str(i) for i in x], rotation=60)
    plt.ylabel("Eigan")
    plt.show()


data_directory = "./data/"
def createFile(random_sample, stratified_sample, file_name):
    random_sample['type'] = pd.Series('1', index=random_sample.index)
    stratified_sample['type'] = pd.Series('2', index=stratified_sample.index)
    if len(random_sample.columns) == 3:
        random_sample.columns = ['x', 'y', 'type']
        stratified_sample.columns = ['x', 'y', 'type']

    sample = pd.concat([random_sample, stratified_sample])
    file_name = data_directory + file_name
    sample.to_csv(file_name, sep=',', index=False)


def get_squared_loadings(dataframe, intrinsic):
    std_input = StandardScaler().fit_transform(dataframe)
    pca = PCA(n_components=intrinsic)
    pca.fit_transform(std_input)
    loadings = pca.components_
    # print("loadings shape ")
    # print(pd.DataFrame(loadings).shape)
    squared_loadings = []
    a = np.array(loadings)
    a = a.transpose()
    for i in range(len(a)):
        squared_loadings.append(np.sum(np.square(a[i])))
    # print(len(squared_loadings))
    # save squared_loadings in csv
    df_attributes = pd.DataFrame(pd.DataFrame(dataframe).columns)
    df_attributes.columns = ["attributes"]
    df_sqL = pd.DataFrame(squared_loadings)
    df_sqL.columns = ["squared_loadings"]
    sample = df_attributes.join([df_sqL])
    sample = sample.sort_values(["squared_loadings"], ascending=[False])
    sample.to_csv("./data/squared_loadings.csv", sep=',')
    return sample

def getTop3attributes(squared_loadings):
    top3 = squared_loadings.head(n = 3)
    return top3['attributes'].values.tolist()
    # arr = np.array(squared_loadings)
    # top3 = arr.argsort()[-3:][::-1]
    # return top3
    # print(top3)
    # print(squared_loadings)

def main():
    fraction = 0.4
    max_cluster_count = 11

    # Reading the data from csv
    inputData = pd.read_csv('fulldata.csv')

    # Performing RandomSampling and storing RandomSamples in csv
    random_samples = inputData.sample(frac=fraction)
    random_samples.to_csv('./data/random_data.csv', sep=',')

    # Finding the optimal value of k which can range from 1 to max_cluster_count-1
    elbowKMeans(inputData, max_cluster_count)

    # As per the plot we see optimal k
    optimalK = 3

    # Performing AdaptiveSampling and storing AdaptiveSamples in csv
    adaptive_samples = adaptive_sampling(inputData, optimalK, fraction)
    adaptive_samples.to_csv('./data/adaptive_samples.csv', sep=',')

    # PCA analysis (used for task 3)
    analyse_pca(random_samples, adaptive_samples)

    # Produces scree-plot visualisation
    createScreeWithEigan(adaptive_samples, "adaptive")
    createScreeWithEigan(random_samples, "random")

    # intrinsic dimensionality
    intrinsic = 3

    # get squared loadings
    squared_loadings = get_squared_loadings(adaptive_samples, intrinsic)

    # find top 3 attributes with highest PCA loadings
    top3attributes = getTop3attributes(squared_loadings)

    # save top3 attributes data in file
    inputData.ix[:, top3attributes].to_csv("./data/scatterplot_matrix.csv", sep=',')

   
main()

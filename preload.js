// Update your preload.js to expose the new getStats function
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadCSV: (filePath) => ipcRenderer.invoke('load-csv', filePath),
  handleMissingValues: (df_json, method) => ipcRenderer.invoke('handle-missing-values', df_json, method),
  removeDuplicates: (df_json) => ipcRenderer.invoke('remove-duplicates', df_json),
  normalizeColumns: (df_json) => ipcRenderer.invoke('normalize-columns', df_json),
  detectOutliers: (df_json, column) => ipcRenderer.invoke('detect-outliers', df_json, column),
  visualizeCorrelation: (df_json) => ipcRenderer.invoke('visualize-correlation', df_json),
  runPCA: (df_json) => ipcRenderer.invoke('run-pca', df_json),
  runKMeans: (df_json, clusters) => ipcRenderer.invoke('run-kmeans', df_json, clusters),
  exportData: (df_json, filePath) => ipcRenderer.invoke('export-data', df_json, filePath),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  getStats: (df_json) => ipcRenderer.invoke('getStats', df_json) // Add this new line
});
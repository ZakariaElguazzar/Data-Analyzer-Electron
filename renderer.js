  // Add this line at the top of renderer.js
let df_json = null;
let current_df_info = null;

function debugState() {
  console.log("Current application state:");
  console.log("df_json exists:", df_json !== null);
  if (df_json) {
    console.log("df_json length:", df_json.length);
  }
  console.log("current_df_info exists:", current_df_info !== null);
}

// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

document.getElementById("loadCSVBtn").addEventListener("click", async () => {
  try {
    const filePath = await window.electronAPI.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (filePath && filePath.length > 0) {
      const file = filePath[0];
      document.getElementById("logArea").innerText = "Loading CSV...";
      
      // Get the response and parse it
      const response = await window.electronAPI.loadCSV(file);
      const result = JSON.parse(response);
      
      if (result.status === 'error') {
        throw new Error(result.message);
      }

      // Store the data properly
      df_json = result.data.df_json;
      current_df_info = result.data.info;
      
      // Debug - verify the data was saved
      console.log("CSV loaded successfully!");
      debugState();
      
      // Update dataset info display
      displayDatasetInfo();
      
      // Update column selector for outlier detection
      updateColumnSelector();
      
      document.getElementById("logArea").innerText = "CSV loaded successfully!";
    }
  } catch (err) {
    console.error("Error loading CSV:", err);
    document.getElementById("logArea").innerText = "Error loading CSV: " + err.message;
  }
});

function displayDatasetInfo() {
  const infoDiv = document.getElementById("datasetInfo");
  
  // Create a string with dataset information
  let infoHTML = `
    <p><strong>Shape:</strong> ${current_df_info.shape[0]} rows × ${current_df_info.shape[1]} columns</p>
    <p><strong>Columns:</strong> ${current_df_info.columns.join(', ')}</p>
    <p><strong>Missing Values:</strong></p>
    <ul>
  `;
  
  // Add missing values information
  for (const [col, count] of Object.entries(current_df_info.missing)) {
    if (count > 0) {
      infoHTML += `<li>${col}: ${count}</li>`;
    }
  }
  
  infoHTML += `
    </ul>
    <p><strong>Duplicate Rows:</strong> ${current_df_info.duplicates}</p>
    <p><strong>Data Types:</strong></p>
    <ul>
  `;
  
  // Add data types information
  for (const [col, dtype] of Object.entries(current_df_info.dtypes)) {
    infoHTML += `<li>${col}: ${dtype}</li>`;
  }
  
  infoHTML += `</ul>`;
  
  infoDiv.innerHTML = infoHTML;
}

function updateColumnSelector() {
  const select = document.getElementById("outlierColumn");
  select.innerHTML = '';
  current_df_info.columns.forEach(col => {
    const option = document.createElement('option');
    option.value = col;
    option.textContent = col;
    select.appendChild(option);
  });
}

document.getElementById("handleMissingBtn").addEventListener("click", async () => {
  console.log("Handling missing values...");
  debugState();
  
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  const method = document.getElementById("missingValuesMethod").value;
  try {
    document.getElementById("logArea").innerText = `Processing missing values with method: ${method}...`;
    df_json = await window.electronAPI.handleMissingValues(df_json, method);
    document.getElementById("logArea").innerText = `Missing values handled with method: ${method}`;
  } catch (err) {
    console.error("Error handling missing values:", err);
    document.getElementById("logArea").innerText = "Error handling missing values: " + err;
  }
});

document.getElementById("removeDuplicatesBtn").addEventListener("click", async () => {
  console.log("Removing duplicates...");
  debugState();
  
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  try {
    document.getElementById("logArea").innerText = "Removing duplicates...";
    df_json = await window.electronAPI.removeDuplicates(df_json);
    document.getElementById("logArea").innerText = "Duplicates removed successfully!";
  } catch (err) {
    console.error("Error removing duplicates:", err);
    document.getElementById("logArea").innerText = "Error removing duplicates: " + err;
  }
});


document.getElementById("normalizeColumnsBtn").addEventListener("click", async () => {
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  try {
    // Normalize the columns through the Electron API
    const result = await window.electronAPI.normalizeColumns(df_json);
    
    // Update our stored data
    df_json = result.df_json;
    
    // Update the current_df_info with normalized columns from the result
    current_df_info.columns = result.columns;
    current_df_info.dtypes = result.dtypes;
    
    document.getElementById("logArea").innerText = "Column names normalized successfully!";
    updateColumnSelector(); // Refresh the column selector
    displayDatasetInfo(); // Update the displayed info
  } catch (err) {
    console.error("Error normalizing columns:", err);
    document.getElementById("logArea").innerText = "Error normalizing columns: " + err.message;
  }
});

// Data Analysis
document.getElementById("showStatsBtn").addEventListener("click", async () => {
  console.log("Showing stats...");
  debugState();
  
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  try {
    // Instead of calling loadCSV again, we should be using the data we already have
    // or make a specific call to get statistics
    const statsDiv = document.getElementById("statsResults");
    statsDiv.innerHTML = '<h4>Descriptive Statistics</h4>';
    
    // This might need to be fixed depending on how your API is structured
    // You might need a new API endpoint just for stats
    const statsResponse = await window.electronAPI.getStats(df_json);
    const stats = JSON.parse(statsResponse);
    
    for (const [col, colStats] of Object.entries(stats)) {
      statsDiv.innerHTML += `
        <div class="stats-group">
          <h5>${col}</h5>
          <p>Mean: ${colStats['mean']?.toFixed(2) || 'N/A'}</p>
          <p>Std: ${colStats['std']?.toFixed(2) || 'N/A'}</p>
          <p>Min: ${colStats['min']?.toFixed(2) || 'N/A'}</p>
          <p>25%: ${colStats['25%']?.toFixed(2) || 'N/A'}</p>
          <p>50%: ${colStats['50%']?.toFixed(2) || 'N/A'}</p>
          <p>75%: ${colStats['75%']?.toFixed(2) || 'N/A'}</p>
          <p>Max: ${colStats['max']?.toFixed(2) || 'N/A'}</p>
        </div>
      `;
    }
  } catch (err) {
    console.error("Error showing stats:", err);
    document.getElementById("logArea").innerText = "Error showing stats: " + err;
  }
});

document.getElementById("runPCABtn").addEventListener("click", async () => {
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  try {
    document.getElementById("logArea").innerText = "Running PCA...";
    const result = await window.electronAPI.runPCA(df_json);
    
    if (result.status === 'error') {
      throw new Error(result.message);
    }

    const pcaDiv = document.getElementById("pcaResults");
    pcaDiv.innerHTML = `
      <h4>PCA Results</h4>
      <p>Explained Variance: PC1: ${(result.explained_variance[0] * 100).toFixed(2)}%, 
         PC2: ${(result.explained_variance[1] * 100).toFixed(2)}%</p>
      <div class="plot-container" style="width: 100%; max-width: 800px; margin: 0 auto;">
        <img src="data:image/png;base64,${result.plot}" 
             alt="PCA Plot" 
             style="width: 100%; height: auto;">
      </div>
    `;
    document.getElementById("logArea").innerText = "PCA completed!";
  } catch (err) {
    console.error("Error running PCA:", err);
    document.getElementById("logArea").innerText = "Error running PCA: " + err.message;
  }
});

document.getElementById("runKMeansBtn").addEventListener("click", async () => {
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  const numClusters = document.getElementById("numClusters").value;
  try {
    document.getElementById("logArea").innerText = "Running KMeans clustering...";
    const result = await window.electronAPI.runKMeans(df_json, numClusters);
    
    if (result.status === 'error') {
      throw new Error(result.message);
    }

    const kmeansDiv = document.getElementById("kmeansResults");
    kmeansDiv.innerHTML = `
      <h4>KMeans Clustering (${numClusters} clusters)</h4>
      <div class="plot-container" style="width: 100%; max-width: 800px; margin: 0 auto;">
        <img src="data:image/png;base64,${result.plot}" 
             alt="KMeans Plot" 
             style="width: 100%; height: auto;">
      </div>
    `;
    document.getElementById("logArea").innerText = "KMeans clustering completed!";
  } catch (err) {
    console.error("Error running KMeans:", err);
    document.getElementById("logArea").innerText = "Error running KMeans: " + err.message;
  }
});

// Visualization
document.getElementById("detectOutliersBtn").addEventListener("click", async () => {
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  const column = document.getElementById("outlierColumn").value;
  try {
    document.getElementById("logArea").innerText = `Detecting outliers for ${column}...`;
    const result = await window.electronAPI.detectOutliers(df_json, column);
    
    if (result.status === 'error') {
      throw new Error(result.message);
    }

    const outlierDiv = document.getElementById("outlierPlot");
    outlierDiv.innerHTML = `
      <h4>Outlier Detection for ${column}</h4>
      <div class="plot-container" style="width: 100%; max-width: 800px; margin: 0 auto;">
        <img src="data:image/png;base64,${result.plot}" 
             alt="Outlier Plot" 
             style="width: 100%; height: auto;">
      </div>
    `;
    document.getElementById("logArea").innerText = `Outlier detection completed for ${column}!`;
  } catch (err) {
    console.error("Error detecting outliers:", err);
    document.getElementById("logArea").innerText = "Error detecting outliers: " + err.message;
  }
});

document.getElementById("showCorrelationBtn").addEventListener("click", async () => {
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  try {
    const plot = await window.electronAPI.visualizeCorrelation(df_json);
    const correlationDiv = document.getElementById("correlationPlot");
    correlationDiv.innerHTML = `
      <h4>Correlation Matrix</h4>
      <div class="plot-container">
        <img src="data:image/png;base64,${plot}" alt="Correlation Plot">
      </div>
    `;
  } catch (err) {
    document.getElementById("logArea").innerText = "Error showing correlation: " + err;
  }
});

// Export Data
document.getElementById("exportDataBtn").addEventListener("click", async () => {
  if (!df_json) {
    document.getElementById("logArea").innerText = "Please load a CSV first!";
    return;
  }

  try {
    const result = await window.electronAPI.showSaveDialog({
      title: 'Save Processed Data',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      defaultPath: 'processed_data.csv'  // Suggest a default filename
    });

    if (result) {
      console.log("Attempting to export to:", result);
      const exportResult = await window.electronAPI.exportData(df_json, result);
      document.getElementById("logArea").innerText = exportResult;
      console.log("Export successful:", exportResult);
    }
  } catch (err) {
    console.error("Export error details:", err);
    document.getElementById("logArea").innerText = "Error exporting data: " + err;
  }
});

// Toggle language button remains the same
document.getElementById("toggleLangBtn").addEventListener("click", () => {
  const currentLang = document.getElementById("toggleLangBtn").innerText;
  if (currentLang === "Switch to French") {
    document.getElementById("toggleLangBtn").innerText = "Switch to English";
  } else {
    document.getElementById("toggleLangBtn").innerText = "Switch to French";
  }
});
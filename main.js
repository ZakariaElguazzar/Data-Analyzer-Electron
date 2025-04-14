const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const { dialog } = require('electron');



function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function safeExecutePython(command, jsonArg) {
  return new Promise((resolve, reject) => {
    // Write JSON to a temporary file
    const tempFile = path.join(app.getPath('temp'), `data_${Date.now()}.json`);
    fs.writeFileSync(tempFile, jsonArg);
    
    // Execute Python command with file path instead of raw JSON
    exec(`${command} "${tempFile}"`, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
      
      if (error) {
        reject(`Error: ${stderr}`);
        return;
      }
      
      try {
        resolve(stdout.trim());
      } catch (e) {
        reject(`Error parsing output: ${e.message}`);
      }
    });
  });
}


ipcMain.handle('load-csv', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    exec(`python data_analyzer.py load_csv "${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        reject(JSON.stringify({
          status: 'error',
          message: stderr
        }));
        return;
      }
      
      try {
        // Trim any whitespace and try to parse the output as JSON
        const trimmedOutput = stdout.trim();
        const parsedOutput = JSON.parse(trimmedOutput);
        resolve(JSON.stringify(parsedOutput)); // Send properly formatted JSON
      } catch (parseError) {
        reject(JSON.stringify({
          status: 'error',
          message: `Failed to parse Python output: ${parseError.message}`,
          raw_output: stdout
        }));
      }
    });
  });
});

// Add this with your other ipcMain handlers
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result.filePaths;
});

ipcMain.handle('run-pca', async (event, df_json) => {
  return new Promise((resolve, reject) => {
    exec(`python data_analyzer.py run_pca "${df_json}"`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
        return;
      }
      
      try {
        const trimmedOutput = stdout.trim();
        resolve(trimmedOutput);
      } catch (parseError) {
        reject(`Error parsing output: ${parseError.message}`);
      }
    });
  });
});

ipcMain.handle('run-kmeans', async (event, df_json, num_clusters) => {
  return new Promise((resolve, reject) => {
    exec(`python data_analyzer.py run_kmeans "${df_json}" ${num_clusters}`, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
      }
      resolve(stdout);
    });
  });
});
// Add these with your existing IPC handlers


// In main.js, update this handler:
ipcMain.handle('handle-missing-values', async (event, df_json, method) => {
  return new Promise((resolve, reject) => {
    // Create a temporary file to store the JSON data
    const tempFile = path.join(app.getPath('temp'), `data_${Date.now()}.json`);
    fs.writeFileSync(tempFile, df_json);
    
    // Note the order of arguments here - file path first, then method
    exec(`python data_analyzer.py handle_missing_values "${tempFile}" ${method}`, (error, stdout, stderr) => {
      // Clean up
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
      
      if (error) {
        reject(`Error: ${stderr}`);
        return;
      }
      
      resolve(stdout.trim());
    });
  });
});



// In main.js, update the remove-duplicates handler:
ipcMain.handle('remove-duplicates', async (event, df_json) => {
  return new Promise((resolve, reject) => {
    // Create a temporary file to store the JSON data
    const tempFile = path.join(app.getPath('temp'), `data_${Date.now()}.json`);
    
    try {
      // Write the JSON data to the temporary file
      fs.writeFileSync(tempFile, df_json);
      
      // Call the Python script with the path to the temporary file
      exec(`python data_analyzer.py remove_duplicates "${tempFile}"`, (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.error('Failed to delete temp file:', e);
        }
        
        if (error) {
          reject(`Error: ${stderr}`);
          return;
        }
        
        resolve(stdout.trim());
      });
    } catch (err) {
      reject(`Error creating temporary file: ${err.message}`);
    }
  });
});

ipcMain.handle('normalize-columns', async (event, df_json) => {
  return new Promise((resolve, reject) => {
    // Create a temporary file to store the JSON data
    const tempFile = path.join(app.getPath('temp'), `data_${Date.now()}.json`);
    fs.writeFileSync(tempFile, df_json);
    
    exec(`python data_analyzer.py normalize_column_names "${tempFile}"`, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
      
      if (error) {
        reject(`Error: ${stderr}`);
        return;
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        if (result.status === 'error') {
          reject(result.message);
        } else {
          resolve(result);
        }
      } catch (parseError) {
        reject(`Error parsing output: ${parseError.message}`);
      }
    });
  });
});

ipcMain.handle('detect-outliers', async (event, df_json, column) => {
  return new Promise((resolve, reject) => {
    exec(`python data_analyzer.py detect_outliers "${df_json}" "${column}"`, (error, stdout, stderr) => {
      if (error) reject(`Error: ${stderr}`);
      resolve(stdout);
    });
  });
});

ipcMain.handle('visualize-correlation', async (event, df_json) => {
  return new Promise((resolve, reject) => {
    exec(`python data_analyzer.py visualize_correlation "${df_json}"`, (error, stdout, stderr) => {
      if (error) reject(`Error: ${stderr}`);
      resolve(stdout);
    });
  });
});

ipcMain.handle('export-data', async (event, df_json, filePath) => {
  return new Promise((resolve, reject) => {
    // Create a temporary file to store the JSON data
    const tempFile = path.join(app.getPath('temp'), `data_${Date.now()}.json`);
    fs.writeFileSync(tempFile, df_json);
    
    // Here's where the exec command goes:
    exec(`python data_analyzer.py export_data "${tempFile}" "${filePath}"`, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
      
      if (error) {
        reject(`Error: ${stderr}`);
        return;
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        if (result.status === 'error') {
          reject(result.message);
        } else {
          resolve(result.message);
        }
      } catch (parseError) {
        reject(`Error parsing output: ${parseError.message}`);
      }
    });
  });
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(options);
  return result.filePath;
});

ipcMain.handle('getStats', async (event, df_json) => {
  return new Promise((resolve, reject) => {
    // Create a temporary file to store the JSON data
    const tempFile = path.join(app.getPath('temp'), `data_${Date.now()}.json`);
    fs.writeFileSync(tempFile, df_json);
    
    exec(`python data_analyzer.py get_stats "${tempFile}"`, (error, stdout, stderr) => {
      // Clean up
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
      
      if (error) {
        reject(`Error: ${stderr}`);
        return;
      }
      
      resolve(stdout.trim());
    });
  });
});
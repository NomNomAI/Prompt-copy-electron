const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('@electron/remote/main').initialize();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('src/renderer/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('read-file', async (event, filePath) => {
    if (!filePath) throw new Error('File path is required');
    return fs.promises.readFile(filePath, 'utf8');
});

ipcMain.on('minimize', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('show-in-explorer', (event, filePath) => {
  if (process.platform === 'win32') {
    exec(`explorer /select,"${filePath}"`);
  } else if (process.platform === 'darwin') {
    exec(`open -R "${filePath}"`);
  } else {
    exec(`xdg-open "${path.dirname(filePath)}"`);
  }
});
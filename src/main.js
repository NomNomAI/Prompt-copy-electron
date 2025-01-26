const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('@electron/remote/main').initialize();

let mainWindow;
let isDialogOpen = false;

function createWindow() {
    // Add cache path configuration
    const userDataPath = app.getPath('userData');
    const cachePath = path.join(userDataPath, 'Cache');

    // Set default theme if not set
    const settingsPath = path.join(userDataPath, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'solarized' }));
    }

    // Ensure cache directory exists with correct permissions
    if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
    }

    mainWindow = new BrowserWindow({
        width: 350,
        height: 600,
        frame: false,
        title: 'Prompt Copy',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            // Configure cache location
            partition: 'persist:main',
            diskCacheSize: 104857600, // 100MB
            cachePath: cachePath
        }
    });

    // Clear existing cache on startup
    mainWindow.webContents.session.clearCache();

    mainWindow.loadFile('src/renderer/index.html');
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(createWindow);
}

// Rest of the code remains unchanged
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
    if (isDialogOpen) return null;

    try {
        isDialogOpen = true;
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        return result.filePaths[0];
    } finally {
        isDialogOpen = false;
    }
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
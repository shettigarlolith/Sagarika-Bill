const path = require('path');
const http = require('http');
const { app, BrowserWindow, dialog } = require('electron');

const PORT = Number(process.env.PORT || 3000);
const SERVER_URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let server = null;

function waitForServer(url, timeoutMs = 10000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(tryConnect, 250);
      });
    };

    tryConnect();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

async function bootstrap() {
  process.env.SAGARIKA_DATA_DIR = path.join(app.getPath('userData'), 'data');

  const { startServer } = require('./server');

  server = startServer(PORT);
  await waitForServer(SERVER_URL);

  const window = createWindow();
  await window.loadURL(SERVER_URL);
}

app.whenReady().then(async () => {
  try {
    await bootstrap();
  } catch (error) {
    await dialog.showErrorBox('Startup Failed', error.message);
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const window = createWindow();
    await window.loadURL(SERVER_URL);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
    server = null;
  }
});

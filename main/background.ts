import path from 'path'
import { app, ipcMain, globalShortcut } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import screenshot from 'screenshot-desktop'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 1200,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    alwaysOnTop: true,
    autoHideMenuBar: false,
    focusable: true,
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
  }

  mainWindow.setContentProtection(true);

  // Register global shortcut for F9
  globalShortcut.register('F9', () => {
    takeScreenshot(mainWindow);
  });

  globalShortcut.register('F7', () => {
    mainWindow.webContents.send('start-audio-capture', true);
  });
  
  globalShortcut.register('F8', () => {
    mainWindow.webContents.send('stop-audio-capture', true);
  });

  app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI');
})()

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit()
})

// Function to take a screenshot
function takeScreenshot(mainWindow) {
  screenshot({ format: 'png' })
    .then((img) => {
      const imgBase64 = img.toString('base64');

      // Send the Base64 string to the renderer process
      if (mainWindow) {
        mainWindow.webContents.send('screenshot-taken', imgBase64);
      }
    })
    .catch((err) => {
      console.error('Error taking screenshot:', err);
    });
}

// IPC Communication
ipcMain.on('request-screenshot', () => {
  takeScreenshot(null);
});

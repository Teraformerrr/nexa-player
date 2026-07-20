import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { basename, join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { loadMedia, startMpv, stopMpv } from './mpv'
import icon from '../../resources/icon.png?asset'

const APP_ID = 'com.nexaplayer.desktop'

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    title: 'Nexa Player',
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#090b10',
    titleBarStyle: 'hidden',
    ...(process.platform === 'win32'
      ? {
          titleBarOverlay: {
            color: '#090b14',
            symbolColor: '#f7f8ff',
            height: 48
          }
        }
      : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url)
    }

    return { action: 'deny' }
  })

  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false)
    }
  )

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function openMediaFile(): Promise<{
  status: 'opened' | 'cancelled' | 'error'
  name?: string
}> {
  const result = await dialog.showOpenDialog({
    title: 'Open media',
    properties: ['openFile'],
    filters: [
      {
        name: 'Media files',
        extensions: [
          'mp4',
          'mkv',
          'webm',
          'mov',
          'avi',
          'm4v',
          'mp3',
          'flac',
          'wav',
          'm4a',
          'aac',
          'ogg',
          'opus'
        ]
      },
      { name: 'All files', extensions: ['*'] }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { status: 'cancelled' }
  }

  const filePath = result.filePaths[0]

  try {
    await loadMedia(filePath)
    return {
      status: 'opened',
      name: basename(filePath)
    }
  } catch (error) {
    console.error('Failed to open media:', error)
    return { status: 'error' }
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(APP_ID)

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('media:open-file', openMediaFile)

  startMpv()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', () => {
  stopMpv()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

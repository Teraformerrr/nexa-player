import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { readdir, stat } from 'fs/promises'
import { basename, extname, join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  cycleAudioTrack,
  cycleSubtitleTrack,
  getPlaybackState,
  loadMedia,
  loadMediaQueue,
  seekBy,
  seekTo,
  setPlaybackSpeed,
  setVolume,
  startMpv,
  stopMpv,
  toggleFullscreen,
  togglePause
} from './mpv'
import {
  checkForUpdates,
  configureUpdater,
  downloadUpdate,
  getUpdateState,
  installUpdate
} from './updater'
import icon from '../../resources/icon.png?asset'

const APP_ID = 'com.nexaplayer.desktop'

const SUPPORTED_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.avi',
  '.m4v',
  '.mp3',
  '.flac',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.opus'
])

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function createWindow(): BrowserWindow {
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
    icon,
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

  return mainWindow
}

async function findMediaFiles(directoryPath: string): Promise<string[]> {
  const mediaFiles: string[] = []
  const maximumFiles = 1000

  const scanDirectory = async (currentDirectory: string): Promise<void> => {
    if (mediaFiles.length >= maximumFiles) {
      return
    }

    const entries = await readdir(currentDirectory, {
      withFileTypes: true
    })

    entries.sort((first, second) =>
      first.name.localeCompare(second.name, undefined, {
        numeric: true,
        sensitivity: 'base'
      })
    )

    for (const entry of entries) {
      if (mediaFiles.length >= maximumFiles) {
        break
      }

      const entryPath = join(currentDirectory, entry.name)

      if (entry.isDirectory()) {
        await scanDirectory(entryPath)
      } else if (
        entry.isFile() &&
        SUPPORTED_MEDIA_EXTENSIONS.has(extname(entry.name).toLowerCase())
      ) {
        mediaFiles.push(entryPath)
      }
    }
  }

  await scanDirectory(directoryPath)

  return mediaFiles
}

async function openDroppedMedia(value: unknown): Promise<{
  status: 'opened' | 'error'
  name?: string
  count?: number
  items?: string[]
}> {
  if (!Array.isArray(value)) {
    return { status: 'error' }
  }

  const candidatePaths = [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === 'string' && item.length > 0 && item.length <= 32768
      )
    )
  ].slice(0, 1000)

  const mediaFiles: string[] = []

  for (const filePath of candidatePaths) {
    if (!SUPPORTED_MEDIA_EXTENSIONS.has(extname(filePath).toLowerCase())) {
      continue
    }

    try {
      const fileStats = await stat(filePath)

      if (fileStats.isFile()) {
        mediaFiles.push(filePath)
      }
    } catch {
      // Ignore missing or inaccessible dropped files.
    }
  }
  if (mediaFiles.length === 0) {
    return { status: 'error' }
  }

  try {
    if (mediaFiles.length === 1) {
      await loadMedia(mediaFiles[0])
    } else {
      await loadMediaQueue(mediaFiles)
    }

    return {
      status: 'opened',
      name: basename(mediaFiles[0]),
      count: mediaFiles.length,
      items: mediaFiles.map((filePath) => basename(filePath))
    }
  } catch (error) {
    console.error('Failed to open dropped media:', error)
    return { status: 'error' }
  }
}

async function openMediaFile(): Promise<{
  status: 'opened' | 'cancelled' | 'error'
  name?: string
  count?: number
  items?: string[]
}> {
  const result = await dialog.showOpenDialog({
    title: 'Open media',
    properties: ['openFile', 'multiSelections'],
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
      {
        name: 'All files',
        extensions: ['*']
      }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { status: 'cancelled' }
  }

  const filePaths = result.filePaths

  try {
    if (filePaths.length === 1) {
      await loadMedia(filePaths[0])
    } else {
      await loadMediaQueue(filePaths)
    }

    return {
      status: 'opened',
      name: basename(filePaths[0]),
      count: filePaths.length,
      items: filePaths.map((filePath) => basename(filePath))
    }
  } catch (error) {
    console.error('Failed to open media:', error)
    return { status: 'error' }
  }
}

async function openMediaFolder(): Promise<{
  status: 'opened' | 'cancelled' | 'empty' | 'error'
  name?: string
  count?: number
  items?: string[]
}> {
  const result = await dialog.showOpenDialog({
    title: 'Open media folder',
    properties: ['openDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { status: 'cancelled' }
  }

  const directoryPath = result.filePaths[0]

  try {
    const mediaFiles = await findMediaFiles(directoryPath)

    if (mediaFiles.length === 0) {
      return {
        status: 'empty',
        name: basename(directoryPath),
        count: 0,
        items: []
      }
    }

    await loadMediaQueue(mediaFiles)

    return {
      status: 'opened',
      name: basename(directoryPath),
      count: mediaFiles.length,
      items: mediaFiles.map((filePath) => basename(filePath))
    }
  } catch (error) {
    console.error('Failed to open media folder:', error)
    return { status: 'error' }
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(APP_ID)

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('media:open-paths', async (_event, value: unknown) => {
    return openDroppedMedia(value)
  })

  ipcMain.handle('media:open-file', openMediaFile)

  ipcMain.handle('media:open-folder', openMediaFolder)

  ipcMain.handle('media:toggle-pause', async () => {
    await togglePause()
  })

  ipcMain.handle('media:toggle-fullscreen', async () => {
    await toggleFullscreen()
  })

  ipcMain.handle('media:cycle-audio-track', async () => {
    await cycleAudioTrack()
  })

  ipcMain.handle('media:cycle-subtitle-track', async () => {
    await cycleSubtitleTrack()
  })

  ipcMain.handle('system:open-sound-settings', async () => {
    await shell.openExternal('ms-settings:sound')
  })

  ipcMain.handle('media:get-playback-state', async () => {
    return getPlaybackState()
  })

  ipcMain.handle('media:seek', async (_event, position: unknown) => {
    if (typeof position !== 'number' || !Number.isFinite(position)) {
      return
    }

    await seekTo(position)
  })

  ipcMain.handle('media:seek-by', async (_event, seconds: unknown) => {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
      return
    }

    await seekBy(seconds)
  })

  ipcMain.handle('media:set-playback-speed', async (_event, speed: unknown) => {
    if (typeof speed !== 'number' || !Number.isFinite(speed)) {
      return
    }

    await setPlaybackSpeed(speed)
  })

  ipcMain.handle('media:set-volume', async (_event, volume: unknown) => {
    if (typeof volume !== 'number' || !Number.isFinite(volume)) {
      return
    }

    await setVolume(volume)
  })

  ipcMain.handle('updates:get-state', () => {
    return getUpdateState()
  })

  ipcMain.handle('updates:check', async () => {
    return checkForUpdates()
  })

  ipcMain.handle('updates:download', async () => {
    return downloadUpdate()
  })

  ipcMain.handle('updates:install', () => {
    installUpdate()
  })

  startMpv()

  const mainWindow = createWindow()
  configureUpdater(mainWindow)

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

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { readdir, stat } from 'fs/promises'
import { basename, extname, join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  cycleAudioTrack,
  cycleSubtitleTrack,
  cycleVideoAspectRatio,
  getPlaybackState,
  loadMedia,
  loadMediaQueue,
  seekBy,
  seekTo,
  setMpvWindowId,
  setPlaybackSpeed,
  setVideoAspectRatio,
  setVolume,
  startMpv,
  stopMpv,
  togglePause,
  type VideoAspectRatio
} from './mpv'
import {
  checkForUpdates,
  configureUpdater,
  downloadUpdate,
  getUpdateState,
  installUpdate
} from './updater'
import icon from '../../resources/icon.png?asset'
import {
  addRecentMedia,
  getRecentMedia,
  getResumePosition,
  savePlaybackProgress
} from './mediaHistory'

const APP_ID = 'com.nexaplayer.desktop'

let applicationWindow: BrowserWindow | null = null
let embeddedVideoWindow: BrowserWindow | null = null
let videoInputWindow: BrowserWindow | null = null

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
}

if (hasSingleInstanceLock) {
  app.on('second-instance', (_event, commandLine) => {
    if (applicationWindow && !applicationWindow.isDestroyed()) {
      if (applicationWindow.isMinimized()) {
        applicationWindow.restore()
      }

      applicationWindow.show()
      applicationWindow.focus()
    }

    const mediaPaths = getMediaPathsFromArguments(commandLine)

    if (mediaPaths.length > 0) {
      void openExternalMediaPaths(mediaPaths)
    }
  })
}

let lastProgressSaveAt = 0

const PROGRESS_SAVE_INTERVAL_MS = 5000

interface VideoBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly visible: boolean
}

const SUPPORTED_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  ',avi',
  '.m4v',
  '.ts',
  '.m2ts',
  '.mts',
  '.mpg',
  '.mpeg',
  '.wmv',
  '.flv',
  '.ogv',
  '.3gp',
  '.flac',
  '.wav',
  '.m4a',
  '.acc',
  '.ogg',
  '.opus',
  '.wma'
])

function getMediaPathsFromArguments(argumentsList: readonly string[]): string[] {
  return [
    ...new Set(
      argumentsList.filter(
        (argument) =>
          argument.length > 0 &&
          argument.length <= 32768 &&
          SUPPORTED_MEDIA_EXTENSIONS.has(extname(argument).toLowerCase())
      )
    )
  ]
}

function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function isVideoBounds(value: unknown): value is VideoBounds {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const bounds = value as Record<string, unknown>

  return (
    typeof bounds.x === 'number' &&
    Number.isFinite(bounds.x) &&
    typeof bounds.y === 'number' &&
    Number.isFinite(bounds.y) &&
    typeof bounds.width === 'number' &&
    Number.isFinite(bounds.width) &&
    bounds.width > 0 &&
    typeof bounds.height === 'number' &&
    Number.isFinite(bounds.height) &&
    bounds.height > 0 &&
    typeof bounds.visible === 'boolean'
  )
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

function createVideoWindow(parentWindow: BrowserWindow): BrowserWindow {
  const videoWindow = new BrowserWindow({
    parent: parentWindow,
    width: 640,
    height: 360,
    show: false,
    frame: false,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  })

  videoWindow.setMenuBarVisibility(false)

  videoWindow.on('page-title-updated', (event, title) => {
    event.preventDefault()

    if (title.startsWith('nexa-video-fullscreen-')) {
      videoWindow.setFullScreen(!videoWindow.isFullScreen())
    }
  })

  const videoHostHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: transparent;
          }
        </style>
      </head>
      <body>
        <script>
          document.addEventListener('dblclick', () => {
            document.title = "nexa-video-fullscreen-' + Date.now()
          })
        </script>
      </body>
    </html>
  `

  void videoWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(videoHostHtml)}`)

  return videoWindow
}

function createVideoInputWindow(parentWindow: BrowserWindow): BrowserWindow {
  const inputWindow = new BrowserWindow({
    parent: parentWindow,
    width: 640,
    height: 360,
    show: false,
    frame: false,
    focusable: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  })

  inputWindow.setMenuBarVisibility(false)
  inputWindow.setAlwaysOnTop(true, 'floating')

  inputWindow.on('page-title-updated', (event, title) => {
    event.preventDefault()

    if (title.startsWith('nexa-video-activity-')) {
      if (applicationWindow && !applicationWindow.isDestroyed()) {
        applicationWindow.webContents.send('video:activity')
      }

      setTimeout(() => {
        if (inputWindow.isDestroyed() || !applicationWindow || applicationWindow.isDestroyed()) {
          return
        }

        if (applicationWindow.isFullScreen()) {
          const contentBounds = applicationWindow.getContentBounds()
          const videoBounds = {
            x: contentBounds.x,
            y: contentBounds.y,
            width: contentBounds.width,
            height: Math.max(1, contentBounds.height - 132)
          }

          if (embeddedVideoWindow && !embeddedVideoWindow.isDestroyed()) {
            embeddedVideoWindow.setBounds(videoBounds)
            embeddedVideoWindow.showInactive()
          }

          inputWindow.setBounds(videoBounds)
        }

        inputWindow.setAlwaysOnTop(true, 'screen-saver')
        inputWindow.showInactive()
        inputWindow.moveTop()
        inputWindow.focus()
      }, 50)

      return
    }

    if (title.startsWith('nexa-video-aspect-ratio-')) {
      void cycleVideoAspectRatio().then((aspectRatio) => {
        if (applicationWindow && !applicationWindow.isDestroyed()) {
          applicationWindow.webContents.send('video:aspect-ratio-changed', aspectRatio)
        }
      })

      return
    }

    if (title.startsWith('nexa-video-exit-fullscreen-')) {
      setApplicationFullscreen(false)
      return
    }

    if (title.startsWith('nexa-video-fullscreen-')) {
      toggleApplicationFullscreen()
    }
  })

  const inputHostHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: transparent;
          }
        </style>
      </head>
      <body>
        <script>
          document.addEventListener('dblclick', () => {
            document.title = 'nexa-video-fullscreen-' + Date.now()
          })

          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              document.title = 'nexa-video-exit-fullscreen-' + Date.now()
              return
            }
              
            if (event.key.toLowerCase() === 'f') {
              event.preventDefault()
              document.title = 'nexa-video-fullscreen-' + Date.now()
            }

            if (event.key.toLowerCase() === 'a') {
              event.preventDefault()
              document.title = 'nexa-video-aspect-ratio-' + Date.now()
              return
            }
          })

          let lastMouseActivity = 0

          document.addEventListener('mousemove', () => {
            const now = Date.now()
            
            if (now - lastMouseActivity < 120) {
              return
            }
              
            lastMouseActivity = now
            document.title = 'nexa-video-activity-' + now
          })
        </script>
      </body>
    </html>
  `

  void inputWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(inputHostHtml)}`)

  return inputWindow
}

function getNativeWindowId(window: BrowserWindow): string {
  const handle = window.getNativeWindowHandle()

  if (handle.length >= 8) {
    return handle.readBigUInt64LE(0).toString()
  }

  return handle.readUInt32LE(0).toString()
}

function setApplicationFullscreen(fullscreen: boolean): void {
  if (!applicationWindow || applicationWindow.isDestroyed()) {
    return
  }

  const hasVisibleVideoLayer =
    embeddedVideoWindow !== null &&
    !embeddedVideoWindow.isDestroyed() &&
    embeddedVideoWindow.isVisible()

  applicationWindow.setFullScreen(fullscreen)
  applicationWindow.webContents.send('video:fullscreen-changed', fullscreen)

  setTimeout(() => {
    if (!videoInputWindow || videoInputWindow.isDestroyed()) {
      return
    }

    if (!hasVisibleVideoLayer) {
      videoInputWindow.setAlwaysOnTop(false)
      videoInputWindow.hide()
      return
    }

    videoInputWindow.setAlwaysOnTop(true, 'screen-saver')
    videoInputWindow.showInactive()
    videoInputWindow.moveTop()

    if (fullscreen) {
      videoInputWindow.focus()
    }
  }, 250)
}

function toggleApplicationFullscreen(): void {
  if (!applicationWindow || applicationWindow.isDestroyed()) {
    return
  }

  setApplicationFullscreen(!applicationWindow.isFullScreen())
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

async function loadLocalMediaWithResume(filePaths: readonly string[]): Promise<void> {
  if (filePaths.length === 0) {
    return
  }

  const firstFilePath = filePaths[0]
  const resumePosition = await getResumePosition(firstFilePath)

  if (filePaths.length === 1) {
    await loadMedia(firstFilePath, resumePosition)
  } else {
    await loadMediaQueue(filePaths, resumePosition)
  }

  await addRecentMedia(firstFilePath, basename(firstFilePath))

  lastProgressSaveAt = 0
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
    await loadLocalMediaWithResume(mediaFiles)

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

async function openExternalMediaPaths(filePaths: readonly string[]): Promise<void> {
  const result = await openDroppedMedia(filePaths)

  if (result.status !== 'opened' || !applicationWindow || applicationWindow.isDestroyed()) {
    return
  }

  applicationWindow.webContents.send('media:opened-externally', result)
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
    await loadLocalMediaWithResume(filePaths)

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

    await loadLocalMediaWithResume(mediaFiles)

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
  if (!hasSingleInstanceLock) {
    return
  }

  electronApp.setAppUserModelId(APP_ID)

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('video:set-bounds', (event, value: unknown) => {
    if (
      !applicationWindow ||
      applicationWindow.isDestroyed() ||
      !embeddedVideoWindow ||
      embeddedVideoWindow.isDestroyed() ||
      !videoInputWindow ||
      videoInputWindow.isDestroyed() ||
      event.sender !== applicationWindow.webContents ||
      !isVideoBounds(value)
    ) {
      return
    }

    if (!value.visible) {
      videoInputWindow.hide()
      embeddedVideoWindow.hide()
      return
    }

    const contentBounds = applicationWindow.getContentBounds()
    const nextBounds = {
      x: contentBounds.x + Math.round(value.x),
      y: contentBounds.y + Math.round(value.y),
      width: Math.max(1, Math.round(value.width)),
      height: Math.max(1, Math.round(value.height))
    }

    embeddedVideoWindow.setBounds(nextBounds)
    videoInputWindow.setBounds(nextBounds)

    embeddedVideoWindow.showInactive()
    videoInputWindow.showInactive()
    videoInputWindow.moveTop()
  })

  ipcMain.handle('media:open-paths', async (_event, value: unknown) => {
    return openDroppedMedia(value)
  })

  ipcMain.handle('media:open-file', openMediaFile)

  ipcMain.handle('media:open-folder', openMediaFolder)

  ipcMain.handle('media:open-stream', async (_event, value: unknown) => {
    if (typeof value !== 'string' || value.length === 0 || value.length > 4096) {
      return { status: 'invalid' as const }
    }

    try {
      const streamUrl = new URL(value.trim())
      const supportedProtocols = new Set(['http:', 'https:', 'rtsp:', 'rtmp:'])

      if (
        !supportedProtocols.has(streamUrl.protocol) ||
        streamUrl.username.length > 0 ||
        streamUrl.password.length > 0
      ) {
        return { status: 'invalid' as const }
      }

      await loadMedia(streamUrl.href)

      const streamFileName = basename(streamUrl.pathname)

      return {
        status: 'opened' as const,
        name: streamFileName || streamUrl.hostname || 'Network stream'
      }
    } catch (error) {
      console.error('Failed to open network stream:', error)
      return { status: 'error' as const }
    }
  })

  ipcMain.handle('media:toggle-pause', async () => {
    await togglePause()
  })

  ipcMain.handle('media:toggle-fullscreen', () => {
    toggleApplicationFullscreen()
  })

  ipcMain.handle('media:get-recent', async () => {
    return getRecentMedia()
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
    const playbackState = await getPlaybackState()
    const now = Date.now()

    if (
      playbackState.active &&
      playbackState.path &&
      playbackState.duration > 0 &&
      now - lastProgressSaveAt >= PROGRESS_SAVE_INTERVAL_MS
    ) {
      lastProgressSaveAt = now

      void savePlaybackProgress(
        playbackState.path,
        playbackState.position,
        playbackState.duration
      ).catch((error) => {
        console.error('Failed to save playback progress:', error)
      })
    }
    return playbackState
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

  ipcMain.handle('media:set-aspect-ratio', async (_event, aspectRatio: unknown) => {
    const supportedAspectRatios: readonly VideoAspectRatio[] = [
      'auto',
      '16:9',
      '4:3',
      '21:9',
      '1:1'
    ]

    if (
      typeof aspectRatio !== 'string' ||
      !supportedAspectRatios.includes(aspectRatio as VideoAspectRatio)
    ) {
      return
    }

    await setVideoAspectRatio(aspectRatio as VideoAspectRatio)
    if (applicationWindow && !applicationWindow.isDestroyed()) {
      applicationWindow.webContents.send('video:aspect-ratio-changed', aspectRatio)
    }
  })

  ipcMain.handle('media:cycle-aspect-ratio', async () => {
    const aspectRatio = await cycleVideoAspectRatio()

    if (applicationWindow && !applicationWindow.isDestroyed()) {
      applicationWindow.webContents.send('video:aspect-ratio-changed', aspectRatio)
    }

    return aspectRatio
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

  applicationWindow = createWindow()
  const initialMediaPaths = getMediaPathsFromArguments(process.argv)

  if (initialMediaPaths.length > 0) {
    applicationWindow.webContents.once('did-finish-load', () => {
      void openExternalMediaPaths(initialMediaPaths)
    })
  }
  embeddedVideoWindow = createVideoWindow(applicationWindow)
  videoInputWindow = createVideoInputWindow(applicationWindow)

  setMpvWindowId(getNativeWindowId(embeddedVideoWindow))

  startMpv()

  configureUpdater(applicationWindow)

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

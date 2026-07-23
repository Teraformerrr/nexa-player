import { app, BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { autoUpdater, type ProgressInfo } from 'electron-updater'

export type UpdateStatus =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateState {
  readonly status: UpdateStatus
  readonly currentVersion: string
  readonly availableVersion?: string
  readonly progress?: number
  readonly message?: string
}

let mainWindow: BrowserWindow | null = null

let updateState: UpdateState = {
  status: 'idle',
  currentVersion: app.getVersion()
}

function publishState(nextState: UpdateState): void {
  updateState = nextState

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:state', updateState)
  }
}

export function getUpdateState(): UpdateState {
  return updateState
}

export function configureUpdater(window: BrowserWindow): void {
  mainWindow = window

  log.initialize()
  autoUpdater.logger = log
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  if (!app.isPackaged) {
    publishState({
      status: 'unsupported',
      currentVersion: app.getVersion(),
      message: 'Update checks are available in the installed application.'
    })

    return
  }

  autoUpdater.on('checking-for-update', () => {
    publishState({
      status: 'checking',
      currentVersion: app.getVersion(),
      message: 'Checking for updates…'
    })
  })

  autoUpdater.on('update-available', (info) => {
    publishState({
      status: 'available',
      currentVersion: app.getVersion(),
      availableVersion: info.version,
      message: `Nexa Player ${info.version} is available.`
    })
  })

  autoUpdater.on('update-not-available', () => {
    publishState({
      status: 'not-available',
      currentVersion: app.getVersion(),
      message: 'You are using the latest version.'
    })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    publishState({
      status: 'downloading',
      currentVersion: app.getVersion(),
      availableVersion: updateState.availableVersion,
      progress: Math.min(100, Math.max(0, progress.percent)),
      message: `Downloading update… ${Math.round(progress.percent)}%`
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    publishState({
      status: 'downloaded',
      currentVersion: app.getVersion(),
      availableVersion: info.version,
      progress: 100,
      message: 'The update is ready to install.'
    })
  })

  autoUpdater.on('error', (error) => {
    log.error('Nexa Player updater error:', error)

    publishState({
      status: 'error',
      currentVersion: app.getVersion(),
      message: error.message || 'The update operation failed.'
    })
  })

  setTimeout(() => {
    void checkForUpdates()
  }, 5000)
}

export async function checkForUpdates(): Promise<UpdateState> {
  if (!app.isPackaged) {
    return updateState
  }

  publishState({
    status: 'checking',
    currentVersion: app.getVersion(),
    message: 'Checking for updates…'
  })

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The update check failed.'

    log.error('Failed to check for updates:', error)

    publishState({
      status: 'error',
      currentVersion: app.getVersion(),
      message
    })
  }

  return updateState
}

export async function downloadUpdate(): Promise<UpdateState> {
  if (!app.isPackaged || updateState.status !== 'available') {
    return updateState
  }

  publishState({
    ...updateState,
    status: 'downloading',
    progress: 0,
    message: 'Starting update download…'
  })

  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The update download failed.'

    log.error('Failed to download update:', error)

    publishState({
      status: 'error',
      currentVersion: app.getVersion(),
      availableVersion: updateState.availableVersion,
      message
    })
  }

  return updateState
}

export function installUpdate(): void {
  if (updateState.status === 'downloaded') {
    autoUpdater.quitAndInstall(false, true)
  }
}

import { contextBridge, ipcRenderer } from 'electron'

interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
  count?: number
  items?: string[]
}

interface OpenFolderResult {
  status: 'opened' | 'cancelled' | 'empty' | 'error'
  name?: string
  count?: number
  items?: string[]
}

interface PlaybackState {
  active: boolean
  position: number
  duration: number
  paused: boolean
}

type UpdateStatus =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

interface UpdateState {
  status: UpdateStatus
  currentVersion: string
  availableVersion?: string
  progress?: number
  message?: string
}

const nexaApi = Object.freeze({
  platform: process.platform,
  openMedia: (): Promise<OpenMediaResult> => ipcRenderer.invoke('media:open-file'),
  openMediaFolder: (): Promise<OpenFolderResult> => ipcRenderer.invoke('media:open-folder'),
  openSoundSettings: (): Promise<void> => ipcRenderer.invoke('system:open-sound-settings'),
  togglePause: (): Promise<void> => ipcRenderer.invoke('media:toggle-pause'),
  toggleFullscreen: (): Promise<void> => ipcRenderer.invoke('media:toggle-fullscreen'),
  cycleAudioTrack: (): Promise<void> => ipcRenderer.invoke('media:cycle-audio-track'),
  cycleSubtitleTrack: (): Promise<void> => ipcRenderer.invoke('media:cycle-subtitle-track'),
  getPlaybackState: (): Promise<PlaybackState> => ipcRenderer.invoke('media:get-playback-state'),
  seek: (position: number): Promise<void> => ipcRenderer.invoke('media:seek', position),
  seekBy: (seconds: number): Promise<void> => ipcRenderer.invoke('media:seek-by', seconds),
  setPlaybackSpeed: (speed: number): Promise<void> =>
    ipcRenderer.invoke('media:set-playback-speed', speed),
  setVolume: (volume: number): Promise<void> => ipcRenderer.invoke('media:set-volume', volume),
  getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke('updates:get-state'),
  checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke('updates:check'),
  downloadUpdate: (): Promise<UpdateState> => ipcRenderer.invoke('updates:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updates:install'),
  onUpdateState: (listener: (state: UpdateState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState): void => {
      listener(state)
    }

    ipcRenderer.on('updates:state', handler)

    return () => {
      ipcRenderer.removeListener('updates:state', handler)
    }
  }
})

contextBridge.exposeInMainWorld('nexa', nexaApi)

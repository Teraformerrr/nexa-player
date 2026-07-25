import { contextBridge, ipcRenderer, webUtils } from 'electron'

interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
  count?: number
  items?: string[]
}

interface RecentMediaItem {
  path: string
  name: string
  openedAt: number
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

type VideoAspectRatio = 'auto' | '16:9' | '4:3' | '21:9' | '1:1'

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

interface VideoBounds {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

const nexaApi = Object.freeze({
  platform: process.platform,
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  getRecentMedia: (): Promise<RecentMediaItem[]> => ipcRenderer.invoke('media:get-recent'),
  openMedia: (): Promise<OpenMediaResult> => ipcRenderer.invoke('media:open-file'),
  openDroppedMedia: (filePaths: string[]): Promise<OpenMediaResult> =>
    ipcRenderer.invoke('media:open-paths', filePaths),
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
  setVideoBounds: (bounds: VideoBounds): Promise<void> =>
    ipcRenderer.invoke('video:set-bounds', bounds),
  setVideoAspectRatio: (aspectRatio: VideoAspectRatio): Promise<void> =>
    ipcRenderer.invoke('media:set-aspect-ratio', aspectRatio),
  cycleVideoAspectRatio: (): Promise<VideoAspectRatio> =>
    ipcRenderer.invoke('media:cycle-aspect-ratio'),
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
  },

  onVideoActivity: (listener: () => void): (() => void) => {
    const handler = (): void => {
      listener()
    }

    ipcRenderer.on('video:activity', handler)

    return () => {
      ipcRenderer.removeListener('video:activity', handler)
    }
  },

  onVideoAspectRatioChange: (listener: (aspectRatio: VideoAspectRatio) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, aspectRatio: VideoAspectRatio): void => {
      listener(aspectRatio)
    }

    ipcRenderer.on('video:aspect-ratio-changed', handler)

    return () => {
      ipcRenderer.removeListener('video:aspect-ratio-changed', handler)
    }
  },

  onFullscreenChange: (listener: (fullscreen: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, fullscreen: unknown): void => {
      if (typeof fullscreen === 'boolean') {
        listener(fullscreen)
      }
    }

    ipcRenderer.on('video:fullscreen-changed', handler)

    return () => {
      ipcRenderer.removeListener('video:fullscreen-changed', handler)
    }
  }
})

contextBridge.exposeInMainWorld('nexa', nexaApi)

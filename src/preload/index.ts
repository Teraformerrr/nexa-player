import { contextBridge, ipcRenderer } from 'electron'

interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
}
interface PlaybackState {
  active: boolean
  position: number
  duration: number
  paused: boolean
}

const nexaApi = Object.freeze({
  platform: process.platform,
  openMedia: (): Promise<OpenMediaResult> => ipcRenderer.invoke('media:open-file'),
  togglePause: (): Promise<void> => ipcRenderer.invoke('media:toggle-pause'),
  toggleFullscreen: (): Promise<void> => ipcRenderer.invoke('media:toggle-fullscreen'),
  getPlaybackState: (): Promise<PlaybackState> => ipcRenderer.invoke('media:get-playback-state'),
  seek: (position: number): Promise<void> => ipcRenderer.invoke('media:seek', position),
  seekBy: (seconds: number): Promise<void> => ipcRenderer.invoke('media:seek-by', seconds),
  setPlaybackSpeed: (speed: number): Promise<void> =>
    ipcRenderer.invoke('media:set-playback-speed', speed),
  setVolume: (volume: number): Promise<void> => ipcRenderer.invoke('media:set-volume', volume)
})

contextBridge.exposeInMainWorld('nexa', nexaApi)

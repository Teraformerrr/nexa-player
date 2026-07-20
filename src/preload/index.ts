import { contextBridge, ipcRenderer } from 'electron'

interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
}

const nexaApi = Object.freeze({
  platform: process.platform,
  openMedia: (): Promise<OpenMediaResult> => ipcRenderer.invoke('media:open-file'),
  togglePause: (): Promise<void> => ipcRenderer.invoke('media:toggle-pause')
})

contextBridge.exposeInMainWorld('nexa', nexaApi)

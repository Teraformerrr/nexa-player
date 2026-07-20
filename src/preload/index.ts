import { contextBridge } from 'electron'

const nexaApi = Object.freeze({
  platform: process.platform
})

contextBridge.exposeInMainWorld('nexa', nexaApi)

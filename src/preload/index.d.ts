export interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
}

export interface PlaybackStats {
  active: boolean
  position: number
  duration: number
  paused: boolean
}

export interface NexaApi {
  readonly platform: string
  readonly openMedia: () => Promise<OpenMediaResult>
  readonly togglePause: () => Promise<void>
  readonly toggleFullscreen: () => Promise<void>
  readonly getPlaybackState: () => Promise<PlaybackState>
  readonly seek: (position: number) => Promise<void>
  readonly seekBy: (seconds: number) => Promise<void>
  readonly setPlaybackSpeed: (speed: number) => Promise<void>
  readonly setVolume: (volume: number) => Promise<void>
}

declare global {
  interface Window {
    readonly nexa: NexaApi
  }
}

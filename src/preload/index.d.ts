export interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
}

export interface PlaybackState {
  active: boolean
  position: number
  duration: number
  paused: boolean
}

export interface NexaApi {
  readonly platform: string
  readonly openMedia: () => Promise<OpenMediaResult>
  readonly togglePause: () => Promise<void>
  readonly getPlaybackState: () => Promise<PlaybackState>
}

declare global {
  interface Window {
    readonly nexa: NexaApi
  }
}

export interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
}

export interface RecentMediaItem {
  path: string
  name: string
  openedAt: number
}

export interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
  count?: number
  items?: string[]
}

export interface OpenFolderResult {
  status: 'opened' | 'cancelled' | 'empty' | 'error'
  name?: string
  count?: number
  items?: string[]
}

export type VideoAspectRatio = 'auto' | '16:9' | '4:3' | '21:9' | '1:1'

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
  status: UpdateStatus
  currentVersion: string
  availableVersion?: string
  progress?: number
  message?: string
}

export interface VideoBounds {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

export interface NexaApi {
  readonly platform: string
  readonly getPathForFile: (file: File) => string
  readonly getRecentMedia: () => Promise<RecentMediaItem[]>
  readonly openMedia: () => Promise<OpenMediaResult>
  readonly openDroppedMedia: (filePaths: string[]) => Promise<OpenMediaResult>
  readonly openMediaFolder: () => Promise<OpenFolderResult>
  readonly openSoundSettings: () => Promise<void>
  readonly togglePause: () => Promise<void>
  readonly toggleFullscreen: () => Promise<void>
  readonly cycleAudioTrack: () => Promise<void>
  readonly cycleSubtitleTrack: () => Promise<void>
  readonly getPlaybackState: () => Promise<PlaybackState>
  readonly seek: (position: number) => Promise<void>
  readonly seekBy: (seconds: number) => Promise<void>
  readonly setVideoAspectRatio: (aspectRatio: VideoAspectRatio) => Promise<void>
  readonly cycleVideoAspectRatio: () => Promise<VideoAspectRatio>
  readonly onVideoAspectRatioChange: (
    listener: (aspectRatio: VideoAspectRatio) => void
  ) => () => void
  readonly setPlaybackSpeed: (speed: number) => Promise<void>
  readonly setVideoBounds: (bounds: VideoBounds) => Promise<void>
  readonly setVolume: (volume: number) => Promise<void>
  readonly getUpdateState: () => Promise<UpdateState>
  readonly checkForUpdates: () => Promise<UpdateState>
  readonly downloadUpdate: () => Promise<UpdateState>
  readonly installUpdate: () => Promise<void>
  readonly onVideoActivity: (listener: () => void) => () => void
  readonly onFullscreenChange: (listener: (fullscreen: boolean) => void) => () => void
  readonly onUpdateState: (listener: (state: UpdateState) => void) => () => void
}

declare global {
  interface Window {
    readonly nexa: NexaApi
  }
}

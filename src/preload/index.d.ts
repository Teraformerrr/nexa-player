export interface OpenMediaResult {
  status: 'opened' | 'cancelled' | 'error'
  name?: string
}

export interface NexaApi {
  readonly platform: string
  readonly openMedia: () => Promise<OpenMediaResult>
}

declare global {
  interface Window {
    readonly nexa: NexaApi
  }
}

export interface NexaApi {
  readonly platform: string
}

declare global {
  interface Window {
    readonly nexa: NexaApi
  }
}

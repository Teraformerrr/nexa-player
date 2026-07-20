import { type ChildProcess, spawn } from 'child_process'
import { existsSync } from 'fs'
import { createConnection } from 'net'
import { join } from 'path'
import { app } from 'electron'

const INSTALLED_MPV_PATH = 'C:\\Program Files\\MPV Player\\mpv.exe'
const IPC_PIPE_PATH = '\\\\.\\pipe\\nexa-player-mpv'
const CONNECTION_RETRY_DELAY_MS = 100
const MAX_CONNECTION_ATTEMPTS = 20
const PROPERTY_TIMEOUT_MS = 2000

let mpvProcess: ChildProcess | null = null
let ipcQueue: Promise<void> = Promise.resolve()

export interface PlaybackState {
  readonly active: boolean
  readonly position: number
  readonly duration: number
  readonly paused: boolean
}

interface MpvResponse {
  readonly data?: unknown
  readonly error?: string
}

function findMpvExecutable(): string {
  const bundledPath = join(process.resourcesPath, 'mpv', 'mpv.exe')
  const developmentPath = join(app.getAppPath(), 'resources', 'mpv', 'mpv.exe')
  const configuredPath = process.env['NEXA_MPV_PATH']

  const candidates: Array<string | undefined> = [
    configuredPath,
    developmentPath,
    bundledPath,
    INSTALLED_MPV_PATH
  ]

  const executable = candidates.find(
    (candidate): candidate is string => candidate !== undefined && existsSync(candidate)
  )

  if (!executable) {
    throw new Error('Nexa Player could not find mpv.exe.')
  }

  return executable
}

function queueIpcOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = ipcQueue.then(operation, operation)

  ipcQueue = result.then(
    () => undefined,
    () => undefined
  )

  return result
}

function connectAndSend(command: unknown[], attempt = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(IPC_PIPE_PATH)
    const message = `${JSON.stringify({ command })}\n`

    socket.once('connect', () => {
      socket.end(message, 'utf8', resolve)
    })

    socket.once('error', (error: NodeJS.ErrnoException) => {
      socket.destroy()

      if (error.code === 'ENOENT' && attempt < MAX_CONNECTION_ATTEMPTS) {
        setTimeout(() => {
          void connectAndSend(command, attempt + 1).then(resolve, reject)
        }, CONNECTION_RETRY_DELAY_MS)
        return
      }

      reject(error)
    })
  })
}

function readProperty(name: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(IPC_PIPE_PATH)
    const message = `${JSON.stringify({ command: ['get_property', name] })}\n`
    let responseBuffer = ''
    let settled = false

    const finish = (error?: Error, data?: unknown): void => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)
      socket.destroy()

      if (error) {
        reject(error)
      } else {
        resolve(data)
      }
    }

    const timeout = setTimeout(() => {
      finish(new Error(`Timed out while reading mpv property: ${name}`))
    }, PROPERTY_TIMEOUT_MS)

    socket.once('connect', () => {
      socket.write(message, 'utf8')
    })

    socket.on('data', (chunk) => {
      responseBuffer += chunk.toString()

      const newlineIndex = responseBuffer.indexOf('\n')

      if (newlineIndex === -1) {
        return
      }

      const responseText = responseBuffer.slice(0, newlineIndex)

      try {
        const response = JSON.parse(responseText) as MpvResponse

        if (response.error !== 'success') {
          finish(new Error(`mpv could not read property: ${name}`))
          return
        }

        finish(undefined, response.data)
      } catch {
        finish(new Error(`mpv returned invalid data for property: ${name}`))
      }
    })

    socket.once('error', (error) => {
      finish(error)
    })
  })
}

export function startMpv(): void {
  if (mpvProcess && mpvProcess.exitCode === null) {
    return
  }

  const executable = findMpvExecutable()

  mpvProcess = spawn(
    executable,
    [
      '--idle=yes',
      '--force-window=no',
      '--keep-open=yes',
      '--no-terminal',
      '--hwdec=auto-safe',
      `--input-ipc-server=${IPC_PIPE_PATH}`
    ],
    {
      stdio: 'ignore'
    }
  )

  mpvProcess.once('error', (error) => {
    console.error('Failed to start mpv:', error)
    mpvProcess = null
  })

  mpvProcess.once('exit', () => {
    mpvProcess = null
  })
}

export async function loadMedia(filePath: string): Promise<void> {
  startMpv()

  await queueIpcOperation(async () => {
    await connectAndSend(['loadfile', filePath, 'replace'])
  })
}

export async function togglePause(): Promise<void> {
  if (!mpvProcess || mpvProcess.exitCode !== null) {
    return
  }

  await queueIpcOperation(async () => {
    await connectAndSend(['cycle', 'pause'])
  })
}

export async function seekTo(position: number): Promise<void> {
  if (!mpvProcess || mpvProcess.exitCode !== null || !Number.isFinite(position)) {
    return
  }

  await queueIpcOperation(async () => {
    await connectAndSend(['seek', Math.max(0, position), 'absolute+exact'])
  })
}

export async function setVolume(volume: number): Promise<void> {
  if (!Number.isFinite(volume)) {
    return
  }

  const normalizedVolume = Math.min(100, Math.max(0, volume))

  await queueIpcOperation(async () => {
    await connectAndSend(['set_property', 'volume', normalizedVolume])
  })
}

export async function getPlaybackState(): Promise<PlaybackState> {
  if (!mpvProcess || mpvProcess.exitCode !== null) {
    return {
      active: false,
      position: 0,
      duration: 0,
      paused: false
    }
  }

  return queueIpcOperation(async () => {
    try {
      const position = await readProperty('time-pos')
      const duration = await readProperty('duration')
      const paused = await readProperty('pause')

      return {
        active: typeof duration === 'number' && duration > 0,
        position: typeof position === 'number' ? position : 0,
        duration: typeof duration === 'number' ? duration : 0,
        paused: typeof paused === 'boolean' ? paused : false
      }
    } catch (error) {
      console.error('Failed to read mpv playback state:', error)

      return {
        active: false,
        position: 0,
        duration: 0,
        paused: false
      }
    }
  })
}

export function stopMpv(): void {
  if (!mpvProcess) {
    return
  }

  mpvProcess.kill()
  mpvProcess = null
}

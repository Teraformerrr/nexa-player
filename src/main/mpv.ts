import { type ChildProcess, spawn } from 'child_process'
import { existsSync } from 'fs'
import { createConnection } from 'net'
import { join } from 'path'
import { app } from 'electron'

const INSTALLED_MPV_PATH = 'C:\\Program Files\\MPV Player\\mpv.exe'
const IPC_PIPE_PATH = '\\\\.\\pipe\\nexa-player-mpv'
const CONNECTION_RETRY_DELAY_MS = 100
const MAX_CONNECTION_ATTEMPTS = 20

let mpvProcess: ChildProcess | null = null

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
  await connectAndSend(['loadfile', filePath, 'replace'])
}

export function stopMpv(): void {
  if (!mpvProcess) {
    return
  }

  mpvProcess.kill()
  mpvProcess = null
}

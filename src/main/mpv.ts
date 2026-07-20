import { type ChildProcess, spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const INSTALLED_MPV_PATH = 'C:\\Program Files\\MPV Player\\mpv.exe'
const IPC_PIPE_PATH = '\\\\.\\pipe\\nexa-player-mpv'

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

export function startMpv(): void {
  if (mpvProcess) {
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
      windowsHide: true,
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

export function stopMpv(): void {
  if (!mpvProcess) {
    return
  }

  mpvProcess.kill()
  mpvProcess = null
}

export { IPC_PIPE_PATH }

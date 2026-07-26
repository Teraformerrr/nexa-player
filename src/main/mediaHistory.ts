import { app } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

const MAXIMUM_RECENT_ITEMS = 20
const HISTORY_FILE_NAME = 'media-history.json'
const MINIMUM_RESUME_POSITION = 10
const COMPLETION_REMAINING_SECONDS = 30
const COMPLETION_PERCENTAGE = 0.95

export interface RecentMediaItem {
  readonly path: string
  readonly name: string
  readonly openedAt: number
  readonly position: number
  readonly duration: number
  readonly completed: boolean
}

let historyOperation: Promise<void> = Promise.resolve()

function getHistoryFilePath(): string {
  return join(app.getPath('userData'), HISTORY_FILE_NAME)
}

function isStoredMediaItem(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.path === 'string' &&
    item.path.length > 0 &&
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    typeof item.openedAt === 'number' &&
    Number.isFinite(item.openedAt)
  )
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function normalizeHistoryItem(item: Record<string, unknown>): RecentMediaItem {
  const position = normalizeNumber(item.position)
  const duration = normalizeNumber(item.duration)

  return {
    path: item.path as string,
    name: item.name as string,
    openedAt: item.openedAt as number,
    position: duration > 0 ? Math.min(position, duration) : position,
    duration,
    completed: item.completed === true
  }
}

async function readHistoryFile(): Promise<RecentMediaItem[]> {
  try {
    const contents = await readFile(getHistoryFilePath(), 'utf8')
    const parsed: unknown = JSON.parse(contents)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isStoredMediaItem).map(normalizeHistoryItem).slice(0, MAXIMUM_RECENT_ITEMS)
  } catch {
    return []
  }
}

async function writeHistoryFile(items: readonly RecentMediaItem[]): Promise<void> {
  const historyFilePath = getHistoryFilePath()
  const temporaryFilePath = `${historyFilePath}.tmp`

  await mkdir(dirname(historyFilePath), { recursive: true })
  await writeFile(temporaryFilePath, JSON.stringify(items, null, 2), 'utf8')
  await rename(temporaryFilePath, historyFilePath)
}

function queueHistoryUpdate(operation: () => Promise<void>): Promise<void> {
  const nextOperation = historyOperation.then(operation, operation)

  historyOperation = nextOperation.catch(() => undefined)

  return nextOperation
}

function isCompleted(position: number, duration: number): boolean {
  if (duration <= 0) {
    return false
  }

  return (
    position / duration >= COMPLETION_PERCENTAGE ||
    duration - position <= COMPLETION_REMAINING_SECONDS
  )
}

export async function getRecentMedia(): Promise<RecentMediaItem[]> {
  await historyOperation
  return readHistoryFile()
}

export async function addRecentMedia(filePath: string, name: string): Promise<void> {
  if (!filePath || !name) {
    return
  }

  await queueHistoryUpdate(async () => {
    const currentItems = await readHistoryFile()
    const normalizedPath = filePath.toLowerCase()
    const existingItem = currentItems.find((item) => item.path.toLowerCase() === normalizedPath)

    const nextItems: RecentMediaItem[] = [
      {
        path: filePath,
        name,
        openedAt: Date.now(),
        position: existingItem?.position ?? 0,
        duration: existingItem?.duration ?? 0,
        completed: existingItem?.completed ?? false
      },
      ...currentItems.filter((item) => item.path.toLowerCase() !== normalizedPath)
    ].slice(0, MAXIMUM_RECENT_ITEMS)

    await writeHistoryFile(nextItems)
  })
}

export async function savePlaybackProgress(
  filePath: string,
  position: number,
  duration: number
): Promise<void> {
  if (
    !filePath ||
    !Number.isFinite(position) ||
    position < 0 ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return
  }

  await queueHistoryUpdate(async () => {
    const currentItems = await readHistoryFile()
    const normalizedPath = filePath.toLowerCase()
    const itemIndex = currentItems.findIndex((item) => item.path.toLowerCase() === normalizedPath)

    if (itemIndex < 0) {
      return
    }

    const normalizedPosition = Math.min(position, duration)
    const completed = isCompleted(normalizedPosition, duration)
    const nextItems = [...currentItems]
    const currentItem = nextItems[itemIndex]

    nextItems[itemIndex] = {
      ...currentItem,
      position: completed ? 0 : normalizedPosition,
      duration,
      completed
    }

    await writeHistoryFile(nextItems)
  })
}

export async function getResumePosition(filePath: string): Promise<number> {
  if (!filePath) {
    return 0
  }

  await historyOperation

  const currentItems = await readHistoryFile()
  const normalizedPath = filePath.toLowerCase()
  const item = currentItems.find((historyItem) => historyItem.path.toLowerCase() === normalizedPath)

  if (!item || item.completed || item.position < MINIMUM_RESUME_POSITION || item.duration <= 0) {
    return 0
  }

  return item.position
}

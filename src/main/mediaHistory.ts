import { app } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

const MAXIMUM_RECENT_ITEMS = 20
const HISTORY_FILE_NAME = 'media-history.json'

export interface RecentMediaItem {
  readonly path: string
  readonly name: string
  readonly openedAt: number
}

function getHistoryFilePath(): string {
  return join(app.getPath('userData'), HISTORY_FILE_NAME)
}

function isRecentMediaItem(value: unknown): value is RecentMediaItem {
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

async function readHistory(): Promise<RecentMediaItem[]> {
  try {
    const contents = await readFile(getHistoryFilePath(), 'utf8')
    const parsed: unknown = JSON.parse(contents)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isRecentMediaItem).slice(0, MAXIMUM_RECENT_ITEMS)
  } catch {
    return []
  }
}

async function writeHistory(items: readonly RecentMediaItem[]): Promise<void> {
  const historyFilePath = getHistoryFilePath()
  const temporaryFilePath = `${historyFilePath}.tmp`

  await mkdir(dirname(historyFilePath), { recursive: true })
  await writeFile(temporaryFilePath, JSON.stringify(items, null, 2), 'utf8')
  await rename(temporaryFilePath, historyFilePath)
}

export async function getRecentMedia(): Promise<RecentMediaItem[]> {
  return readHistory()
}

export async function addRecentMedia(filePath: string, name: string): Promise<void> {
  if (!filePath || !name) {
    return
  }

  const currentItems = await readHistory()
  const normalizedPath = filePath.toLowerCase()

  const nextItems: RecentMediaItem[] = [
    {
      path: filePath,
      name,
      openedAt: Date.now()
    },
    ...currentItems.filter((item) => item.path.toLowerCase() !== normalizedPath)
  ].slice(0, MAXIMUM_RECENT_ITEMS)

  await writeHistory(nextItems)
}

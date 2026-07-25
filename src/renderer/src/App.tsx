import { useCallback, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Captions,
  ChevronRight,
  FilePlus2,
  FolderOpen,
  Heart,
  History,
  House,
  Languages,
  ListMusic,
  ListVideo,
  Maximize2,
  MoreHorizontal,
  Music2,
  PanelRight,
  Pause,
  PictureInPicture2,
  Play,
  Plug,
  Radio,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Video
} from 'lucide-react'
import SettingsPanel from './components/SettingsPanel'
import PlaybackTimeline from './components/PlaybackTimeline'
import VolumeControl from './components/VolumeControl'
import PlaybackSpeedControl from './components/PlaybackSpeedControl'
import nexaLogo from './assets/nexa-logo.png'

interface NavigationItem {
  readonly label: string
  readonly icon: LucideIcon
  readonly active?: boolean
}

interface RecentMediaItem {
  readonly path: string
  readonly name: string
  readonly openedAt: number
}

const libraryItems: readonly NavigationItem[] = [
  { label: 'Home', icon: House, active: true },
  { label: 'Videos', icon: Video },
  { label: 'Music', icon: Music2 },
  { label: 'Playlists', icon: ListVideo },
  { label: 'Favourites', icon: Heart },
  { label: 'Recent', icon: History }
]

const discoveryItems: readonly NavigationItem[] = [
  { label: 'Network streams', icon: Radio },
  { label: 'Connected services', icon: Plug }
]

const VIDEO_FILE_PATTERN = /\.(mp4|mkv|webm|mov|avi|m4v)$/i

function SidebarItem({ label, icon: Icon, active = false }: NavigationItem): React.JSX.Element {
  return (
    <button
      className={`sidebar-item${active ? ' sidebar-item--active' : ''}`}
      type="button"
      aria-current={active ? 'page' : undefined}
    >
      <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  )
}

function IconButton({
  label,
  children,
  className = '',
  onClick
}: {
  readonly label: string
  readonly children: React.ReactNode
  readonly className?: string
  readonly onClick?: () => void
}): React.JSX.Element {
  return (
    <button
      className={`icon-button ${className}`}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function App(): React.JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentMediaName, setCurrentMediaName] = useState<string | null>(null)
  const [mediaMessage, setMediaMessage] = useState('Open a file to begin')
  const [openingMedia, setOpeningMedia] = useState(false)
  const [queueItems, setQueueItems] = useState<readonly string[]>([])
  const [recentMedia, setRecentMedia] = useState<readonly RecentMediaItem[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenControlsVisible, setFullscreenControlsVisible] = useState(true)
  const fullscreenControlsTimerRef = useRef<number | null>(null)
  const [isDraggingMedia, setIsDraggingMedia] = useState(false)

  useEffect(() => {
    return window.nexa.onFullscreenChange((fullscreen) => {
      setIsFullscreen(fullscreen)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadRecentMedia = async (): Promise<void> => {
      try {
        const items = await window.nexa.getRecentMedia()

        if (!cancelled) {
          setRecentMedia(items)
        }
      } catch {
        if (!cancelled) {
          setRecentMedia([])
        }
      }
    }

    void loadRecentMedia()

    return () => {
      cancelled = true
    }
  }, [])

  const videoSurfaceRef = useRef<HTMLElement | null>(null)
  const isVideoMedia = currentMediaName !== null && VIDEO_FILE_PATTERN.test(currentMediaName)

  useEffect(() => {
    const videoSurface = videoSurfaceRef.current
    const visible = isVideoMedia && !settingsOpen

    if (!videoSurface || !visible) {
      void window.nexa.setVideoBounds({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        visible: false
      })

      return
    }

    const updateVideoBounds = (): void => {
      const bounds = videoSurface.getBoundingClientRect()

      void window.nexa.setVideoBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        visible: true
      })
    }

    const resizeObserver = new ResizeObserver(updateVideoBounds)

    updateVideoBounds()
    resizeObserver.observe(videoSurface)
    window.addEventListener('resize', updateVideoBounds)
    window.addEventListener('scroll', updateVideoBounds, true)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateVideoBounds)
      window.removeEventListener('scroll', updateVideoBounds, true)

      void window.nexa.setVideoBounds({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        visible: false
      })
    }
  }, [isVideoMedia, settingsOpen])

  const showFullscreenControls = useCallback((): void => {
    setFullscreenControlsVisible(true)

    if (fullscreenControlsTimerRef.current !== null) {
      window.clearTimeout(fullscreenControlsTimerRef.current)
      fullscreenControlsTimerRef.current = null
    }

    if (isFullscreen) {
      fullscreenControlsTimerRef.current = window.setTimeout(() => {
        setFullscreenControlsVisible(false)
        fullscreenControlsTimerRef.current = null
      }, 2500)
    }
  }, [isFullscreen])

  useEffect(() => {
    const removeVideoActivityListener = window.nexa.onVideoActivity(() => {
      showFullscreenControls()
    })

    const initialVisibilityTimer = window.setTimeout(showFullscreenControls, 0)

    return () => {
      removeVideoActivityListener()
      window.clearTimeout(initialVisibilityTimer)

      if (fullscreenControlsTimerRef.current !== null) {
        window.clearTimeout(fullscreenControlsTimerRef.current)
        fullscreenControlsTimerRef.current = null
      }
    }
  }, [showFullscreenControls])

  const openSettings = (): void => {
    setSettingsOpen(true)
  }

  const closeSettings = (): void => {
    setSettingsOpen(false)
  }

  const openMedia = async (): Promise<void> => {
    if (openingMedia) {
      return
    }

    setOpeningMedia(true)

    try {
      const result = await window.nexa.openMedia()

      if (result.status === 'opened') {
        const items = result.items ?? []
        const firstItem = items[0] ?? result.name ?? 'Selected media'
        const count = result.count ?? (items.length || 1)

        setQueueItems(items)
        setCurrentMediaName(firstItem)
        setMediaMessage(count > 1 ? `Playing 1 of ${count} selected files` : 'Playing with mpv')
        setIsPaused(false)
        setRecentMedia(await window.nexa.getRecentMedia())
      } else if (result.status === 'error') {
        setMediaMessage('Unable to open the selected media')
      }
    } catch {
      setMediaMessage('Unable to reach the playback engine')
    } finally {
      setOpeningMedia(false)
    }
  }

  const openMediaFolder = async (): Promise<void> => {
    if (openingMedia) {
      return
    }

    setOpeningMedia(true)

    try {
      const result = await window.nexa.openMediaFolder()

      if (result.status === 'opened') {
        const items = result.items ?? []
        const firstItem = items[0] ?? 'Selected media folder'

        setQueueItems(items)
        setCurrentMediaName(firstItem)
        setMediaMessage(
          `Playing 1 of ${result.count ?? items.length} from ${result.name ?? 'selected folder'}`
        )
        setIsPaused(false)
        setRecentMedia(await window.nexa.getRecentMedia())
      } else if (result.status === 'empty') {
        setQueueItems([])
        setMediaMessage('No supported media files were found in this folder')
      } else if (result.status === 'error') {
        setMediaMessage('Unable to reach the folder scanner')
      }
    } catch {
      setMediaMessage('Unable to reach the folder scanner')
    } finally {
      setOpeningMedia(false)
    }
  }

  const handleMediaDrop = async (event: React.DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingMedia(false)

    if (openingMedia) {
      return
    }

    const filePaths = Array.from(event.dataTransfer.files)
      .map((file) => {
        try {
          return window.nexa.getPathForFile(file)
        } catch {
          return ''
        }
      })
      .filter((filePath) => filePath.length > 0)
    if (filePaths.length === 0) {
      setMediaMessage('No readable media files were dropped')
      return
    }

    setOpeningMedia(true)

    try {
      const result = await window.nexa.openDroppedMedia(filePaths)

      if (result.status == 'opened') {
        const items = result.items ?? []
        const firstItem = items[0] ?? result.name ?? 'Dropped media'
        const count = result.count ?? (items.length || 1)

        setQueueItems(items)
        setCurrentMediaName(firstItem)
        setMediaMessage(count > 1 ? `Playing 1 of ${count} dropped files` : 'Playing dropped media')
        setIsPaused(false)
        setRecentMedia(await window.nexa.getRecentMedia())
      } else {
        setMediaMessage('No supported media files were dropped')
      }
    } catch {
      setMediaMessage('Unable to open the dropped media')
    } finally {
      setOpeningMedia(false)
    }
  }

  const openRecentMedia = async (item: RecentMediaItem): Promise<void> => {
    if (openingMedia) {
      return
    }

    setOpeningMedia(true)

    try {
      const result = await window.nexa.openDroppedMedia([item.path])

      if (result.status === 'opened') {
        setQueueItems(result.items ?? [item.name])
        setCurrentMediaName(result.name ?? item.name)
        setMediaMessage('Playing from recent media')
        setIsPaused(false)
        setRecentMedia(await window.nexa.getRecentMedia())
      } else {
        setMediaMessage('This recent media file is unavailable')
      }
    } catch {
      setMediaMessage('Unable to open this recent media file')
    } finally {
      setOpeningMedia(false)
    }
  }

  const togglePause = async (): Promise<void> => {
    if (!currentMediaName) {
      return
    }

    try {
      await window.nexa.togglePause()
      setIsPaused((paused) => !paused)
      setMediaMessage(isPaused ? 'Playing with mpv' : 'Paused')
    } catch {
      setMediaMessage('Unable to control playback')
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable) ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return
      }

      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault()
        void window.nexa.toggleFullscreen()
        return
      }

      if (!currentMediaName) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()

        void window.nexa
          .togglePause()
          .then(() => {
            setIsPaused((paused) => {
              const nextPaused = !paused
              setMediaMessage(nextPaused ? 'Paused' : 'Playing with mpv')
              return nextPaused
            })
          })
          .catch(() => {
            setMediaMessage('Unable to control playback')
          })

        return
      }

      if (event.key == 'ArrowLeft') {
        event.preventDefault()
        void window.nexa.seekBy(-10)
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        void window.nexa.seekBy(10)
        return
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        void window.nexa.toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentMediaName, isFullscreen])

  return (
    <div
      className={`app-shell${isDraggingMedia ? ' app-shell--dragging' : ''}${
        isFullscreen ? ' app-shell--fullscreen' : ''
      }${isFullscreen && !fullscreenControlsVisible ? ' app-shell--controls-hidden' : ''}`}
      onMouseMove={showFullscreenControls}
      onDragEnter={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault()
          setIsDraggingMedia(true)
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setIsDraggingMedia(true)
        }
      }}
      onDragLeave={(event) => {
        const nextTarget = event.relatedTarget

        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setIsDraggingMedia(false)
        }
      }}
      onDrop={(event) => {
        void handleMediaDrop(event)
      }}
    >
      <header className="topbar">
        <div className="brand" aria-label="Nexa Player">
          <img className="brand-mark" src={nexaLogo} alt="" aria-hidden="true" />
          <span className="brand-name">Nexa</span>
          <span className="brand-product">Player</span>
        </div>

        <label className="search-box">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">Search your library</span>
          <input type="search" placeholder="Search your library" />
          <kbd>Ctrl K</kbd>
        </label>

        <div className="topbar-actions">
          <button
            className="command-button command-button--primary"
            type="button"
            onClick={() => void openMedia()}
            disabled={openingMedia}
          >
            <FilePlus2 aria-hidden="true" size={18} />
            <span>{openingMedia ? 'Opening…' : 'Open file'}</span>
          </button>

          <button
            className="command-button"
            type="button"
            onClick={() => void openMediaFolder()}
            disabled={openingMedia}
          >
            <FolderOpen aria-hidden="true" size={18} />
            <span>{openingMedia ? 'Opening...' : 'Open folder'}</span>
          </button>

          <IconButton label="Settings" onClick={openSettings}>
            <Settings aria-hidden="true" size={20} />
          </IconButton>
        </div>
      </header>

      <aside className="sidebar">
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="sidebar-heading">Library</p>

          {libraryItems.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}

          <p className="sidebar-heading sidebar-heading--spaced">Discover</p>

          {discoveryItems.map((item) => (
            <SidebarItem key={item.label} {...item} />
          ))}
        </nav>

        <button className="sidebar-settings" type="button" onClick={openSettings}>
          <Settings aria-hidden="true" size={19} />
          <span>Settings</span>
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </aside>

      <main className={`content${isVideoMedia ? ' content--video' : ''}`}>
        {isVideoMedia && (
          <section
            className="video-surface"
            ref={videoSurfaceRef}
            onDoubleClick={() => {
              void window.nexa.toggleFullscreen()
            }}
            aria-label={`Video playback: ${currentMediaName ?? 'Selected video'}`}
          >
            <div className="video-surface__placeholder" aria-hidden="true">
              <Video size={32} />
              <span>Preparing video...</span>
            </div>
          </section>
        )}

        <section className="welcome-card" aria-labelledby="welcome-title">
          <div className="welcome-glow welcome-glow--one" />
          <div className="welcome-glow welcome-glow--two" />

          <div className="welcome-visual" aria-hidden="true">
            <div className="visual-orbit visual-orbit--outer" />
            <div className="visual-orbit visual-orbit--inner" />

            <div className="visual-disc">
              <span className="visual-disc__shine" />

              <span className="visual-disc__center">
                <Play size={34} fill="currentColor" />
              </span>
            </div>
          </div>

          <div className="welcome-copy">
            <span className="eyebrow">
              <Sparkles aria-hidden="true" size={15} />
              Your media, beautifully organised
            </span>

            <h1 id="welcome-title">Welcome to Nexa Player</h1>

            <p>Open a video, play your music, or build a library that feels entirely yours.</p>

            <div className="welcome-actions">
              <button
                className="hero-button hero-button--primary"
                type="button"
                onClick={() => void openMedia()}
                disabled={openingMedia}
              >
                <FilePlus2 aria-hidden="true" size={19} />
                {openingMedia ? 'Opening…' : 'Open a media file'}
              </button>

              <button
                className="hero-button"
                type="button"
                onClick={() => void openMediaFolder()}
                disabled={openingMedia}
              >
                <FolderOpen aria-hidden="true" size={19} />
                {openingMedia ? 'Opening...' : 'Add a folder'}
              </button>
            </div>
          </div>
        </section>

        <section className="section-block" aria-labelledby="continue-title">
          <div className="section-header">
            <div>
              <p className="section-kicker">Pick up where you left off</p>
              <h2 id="continue-title">Continue watching</h2>
            </div>

            <button className="text-button" type="button">
              View all
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          </div>

          {recentMedia.length > 0 ? (
            <div className="recent-media-list" aria-label="recent media">
              {recentMedia.slice(0, 4).map((item) => (
                <button
                  className="recent-media-card"
                  type="button"
                  key={item.path}
                  title={item.path}
                  disabled={openingMedia}
                  onClick={() => {
                    void openRecentMedia(item)
                  }}
                >
                  <span className="recent-media-card__icon">
                    <Play aria-hidden="true" size={18} fill="currentColor" />
                  </span>

                  <span className="recent-media-card__copy">
                    <strong>{item.name}</strong>
                    <small>
                      Opened{' '}
                      {new Date(item.name).toLocaleTimeString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </small>
                  </span>

                  <ChevronRight aria-hidden="true" size={17} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-library">
              <span className="empty-library__icon">
                <History aria-hidden="true" size={23} />
              </span>

              <div>
                <h3>Your recent media will appear here</h3>
                <p>Nexa Player will remember media after you open your first file</p>
              </div>
            </div>
          )}
        </section>
      </main>

      <aside className="queue-panel" aria-label="Playback queue">
        <div className="queue-header">
          <div>
            <p className="section-kicker">Up next</p>
            <h2>Queue</h2>
          </div>

          <div className="queue-header__actions">
            <IconButton label="Queue options">
              <MoreHorizontal aria-hidden="true" size={20} />
            </IconButton>

            <IconButton label="Close queue">
              <PanelRight aria-hidden="true" size={20} />
            </IconButton>
          </div>
        </div>

        {queueItems.length > 0 ? (
          <div className="queue-list" role="list" aria-label="Queued media">
            {queueItems.slice(0, 100).map((item, index) => (
              <div
                className={`queue-item${index === 0 ? ' queue-item--active' : ''}`}
                role="listitem"
                key={`${item}-${index}`}
              >
                <span className="queue-item__icon">
                  <Music2 aria-hidden="true" size={16} />
                </span>

                <div className="queue-item__copy">
                  <strong title={item}>{item}</strong>
                  <span>{index === 0 ? 'Now playing' : `Up next · ${index + 1}`}</span>
                </div>
              </div>
            ))}

            {queueItems.length > 100 && (
              <p className="queue-list__remaining">
                {queueItems.length - 100} more files are queued
              </p>
            )}
          </div>
        ) : (
          <div className="queue-empty">
            <span className="queue-empty__art">
              <ListMusic aria-hidden="true" size={30} />
            </span>

            <h3>Your queue is ready</h3>
            <p>Open a media file or folder to begin.</p>
          </div>
        )}

        <div className="queue-tip">
          <span className="queue-tip__icon">
            <Sparkles aria-hidden="true" size={16} />
          </span>

          <p>
            <strong>Quick tip</strong>
            Drop multiple files onto Nexa Player to build a queue.
          </p>
        </div>
      </aside>

      <footer className="player-bar">
        <div className="now-playing">
          <div className="now-playing__art" aria-hidden="true">
            <Music2 size={21} />
          </div>

          <div className="now-playing__copy">
            <strong title={currentMediaName ?? undefined}>
              {currentMediaName ?? 'Nothing playing'}
            </strong>
            <span>{mediaMessage}</span>
          </div>

          <IconButton label="Add to favourites">
            <Heart aria-hidden="true" size={19} />
          </IconButton>
        </div>

        <div className="transport">
          <div className="transport-buttons">
            <IconButton
              label="Rewind 10 seconds"
              onClick={() => {
                void window.nexa.seekBy(-10)
              }}
            >
              <SkipBack aria-hidden="true" size={20} />
            </IconButton>

            <button
              className="play-button"
              type="button"
              aria-label={isPaused ? 'Resume' : 'Pause'}
              title={isPaused ? 'Resume' : 'Pause'}
              onClick={() => void togglePause()}
              disabled={!currentMediaName}
            >
              {isPaused ? (
                <Play aria-hidden="true" size={21} fill="currentColor" />
              ) : (
                <Pause aria-hidden="true" size={21} fill="currentColor" />
              )}
            </button>

            <IconButton
              label="Forward 10 seconds"
              onClick={() => {
                void window.nexa.seekBy(10)
              }}
            >
              <SkipForward aria-hidden="true" size={20} />
            </IconButton>
          </div>

          <PlaybackTimeline enabled={currentMediaName !== null} />
        </div>

        <div className="player-actions">
          <PlaybackSpeedControl enabled={currentMediaName !== null} />

          <IconButton
            label="Cycle subtitle track"
            onClick={() => {
              void window.nexa.cycleSubtitleTrack()
            }}
          >
            <Captions aria-hidden="true" size={20} />
          </IconButton>

          <IconButton
            label="Cycle audio track"
            onClick={() => {
              void window.nexa.cycleAudioTrack()
            }}
          >
            <Languages aria-hidden="true" size={19} />
          </IconButton>

          <IconButton label="Video settings">
            <SlidersHorizontal aria-hidden="true" size={19} />
          </IconButton>

          <IconButton label="Picture in picture">
            <PictureInPicture2 aria-hidden="true" size={19} />
          </IconButton>

          <VolumeControl />

          <IconButton
            label="Toggle fullscreen"
            onClick={() => {
              void window.nexa.toggleFullscreen()
            }}
          >
            <Maximize2 aria-hidden="true" size={19} />
          </IconButton>
        </div>
      </footer>

      {isDraggingMedia && (
        <div className="media-drop-overlay" role="status" aria-live="polite">
          <div className="media-drop-overlay__content">
            <FilePlus2 aria-hidden="true" size={42} strokeWidth={1.7} />
            <strong>Drop media to play</strong>
            <span>Drop one or more audio or video files to create a queue</span>
          </div>
        </div>
      )}

      {settingsOpen && <SettingsPanel onClose={closeSettings} />}
    </div>
  )
}

export default App

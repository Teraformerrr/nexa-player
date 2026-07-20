import type { LucideIcon } from 'lucide-react'
import {
  Captions,
  ChevronRight,
  FilePlus2,
  FolderOpen,
  Gauge,
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
  Video,
  Volume2
} from 'lucide-react'

interface NavigationItem {
  readonly label: string
  readonly icon: LucideIcon
  readonly active?: boolean
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
  className = ''
}: {
  readonly label: string
  readonly children: React.ReactNode
  readonly className?: string
}): React.JSX.Element {
  return (
    <button className={`icon-button ${className}`} type="button" aria-label={label} title={label}>
      {children}
    </button>
  )
}

function App(): React.JSX.Element {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Nexa Player">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark__core" />
          </span>
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
          <button className="command-button command-button--primary" type="button">
            <FilePlus2 aria-hidden="true" size={18} />
            <span>Open file</span>
          </button>
          <button className="command-button" type="button">
            <FolderOpen aria-hidden="true" size={18} />
            <span>Open folder</span>
          </button>
          <IconButton label="Settings">
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

        <button className="sidebar-settings" type="button">
          <Settings aria-hidden="true" size={19} />
          <span>Settings</span>
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </aside>

      <main className="content">
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
            <p>Open a video, play your music, or build a library that feels entirely yours</p>
            <div className="welcome-actions">
              <button className="hero-button hero-button--primary" type="button">
                <FilePlus2 aria-hidden="true" size={19} />
                Open a media file
              </button>
              <button className="hero-button" type="button">
                <FolderOpen aria-hidden="true" size={19} />
                Add a folder
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

          <div className="empty-library">
            <span className="empty-library__icon">
              <History aria-hidden="true" size={23} />
            </span>
            <div>
              <h3>Your recent media will appear here</h3>
              <p>Nexa Player will remember your progress after you open your first file.</p>
            </div>
          </div>
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

        <div className="queue-empty">
          <span className="queue-empty__art">
            <ListMusic aria-hidden="true" size={30} />
          </span>
          <h3>Your queue is ready</h3>
          <p>Open media or drag files here to begin.</p>
        </div>

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
            <strong>Nothing playing</strong>
            <span>Open a file to begin</span>
          </div>
          <IconButton label="Add to favourites">
            <Heart aria-hidden="true" size={19} />
          </IconButton>
        </div>

        <div className="transport">
          <div className="transport-buttons">
            <IconButton label="Previous">
              <SkipBack aria-hidden="true" size={20} />
            </IconButton>
            <button className="play-button" type="button" aria-label="Play" title="Play">
              <Play aria-hidden="true" size={21} fill="currentColor" />
            </button>
            <IconButton label="Next">
              <SkipForward aria-hidden="true" size={20} />
            </IconButton>
          </div>

          <div className="timeline">
            <span>0:00</span>
            <div className="timeline-track" aria-label="Playback position">
              <div className="timeline-track__buffered" />
              <div className="timeline-track__played" />
            </div>
            <span>0:00</span>
          </div>
        </div>

        <div className="player-actions">
          <IconButton label="Playback speed">
            <Gauge aria-hidden="true" size={19} />
          </IconButton>
          <IconButton label="Subtitles">
            <Captions aria-hidden="true" size={20} />
          </IconButton>
          <IconButton label="Audio tracks">
            <Languages aria-hidden="true" size={19} />
          </IconButton>
          <IconButton label="Video settings">
            <SlidersHorizontal aria-hidden="true" size={19} />
          </IconButton>
          <IconButton label="Picture in picture">
            <PictureInPicture2 aria-hidden="true" size={19} />
          </IconButton>

          <div className="volume-control">
            <Volume2 aria-hidden="true" size={20} />
            <div className="volume-track" aria-label="Volume 70 percent">
              <span />
            </div>
          </div>

          <IconButton label="Fullscreen">
            <Maximize2 aria-hidden="true" size={19} />
          </IconButton>
        </div>
      </footer>
    </div>
  )
}

export default App

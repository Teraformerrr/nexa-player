import { useState } from 'react'
import {
  ChevronRight,
  FilePlus2,
  FolderOpen,
  Heart,
  History,
  ListVideo,
  Music2,
  Play,
  Plug,
  Radio,
  Sparkles,
  Video
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavigationRecentItem {
  readonly path: string
  readonly name: string
  readonly openedAt: number
  readonly position: number
  readonly duration: number
  readonly completed: boolean
}

interface NavigationPageProps {
  readonly page: string
  readonly recentMedia: readonly NavigationRecentItem[]
  readonly openingMedia: boolean
  readonly onOpenMedia: () => void
  readonly onOpenFolder: () => void
  readonly onOpenRecent: (item: NavigationRecentItem) => void
  readonly onStreamOpened: (name: string) => void
}

interface PageDetails {
  readonly title: string
  readonly eyebrow: string
  readonly description: string
  readonly icon: LucideIcon
  readonly accent: string
}

const pageDetails: Record<string, PageDetails> = {
  Videos: {
    title: 'Your videos',
    eyebrow: 'Cinema, shows and memories',
    description: 'Browse recently opened videos or add something new to your library.',
    icon: Video,
    accent: 'violet'
  },
  Music: {
    title: 'Your music',
    eyebrow: 'Albums, tracks and sound',
    description: 'Keep your favourite audio close and continue listening instantly.',
    icon: Music2,
    accent: 'cyan'
  },
  Playlists: {
    title: 'Playlists',
    eyebrow: 'Your media, your order',
    description: 'Build collections for movie nights, focus sessions, and everything between.',
    icon: ListVideo,
    accent: 'blue'
  },
  Favourites: {
    title: 'Favourites',
    eyebrow: 'The media you love',
    description: 'Your starred videos, music, and playlists will stay together here.',
    icon: Heart,
    accent: 'pink'
  },
  Recent: {
    title: 'Recently played',
    eyebrow: 'Continue where you left off',
    description: 'Reopen media from your playback history with one click.',
    icon: History,
    accent: 'amber'
  },
  'Network streams': {
    title: 'Network streams',
    eyebrow: 'Play from anywhere',
    description: 'Open compatible media links from your home network or the web.',
    icon: Radio,
    accent: 'cyan'
  },
  'Connected services': {
    title: 'Connected services',
    eyebrow: 'Bring your libraries together',
    description: 'Connect compatible media services and access them from one place.',
    icon: Plug,
    accent: 'violet'
  }
}

const VIDEO_PATTERN = /\.(mp4|mkv|webm|mov|avi|m4v)$/i
const AUDIO_PATTERN = /\.(mp3|flac|wav|m4a|aac|ogg|opus)$/i

function NavigationPage({
  page,
  recentMedia,
  openingMedia,
  onOpenMedia,
  onOpenFolder,
  onOpenRecent,
  onStreamOpened
}: NavigationPageProps): React.JSX.Element {
  const details = pageDetails[page] ?? pageDetails.Recent
  const Icon = details.icon
  const [streamUrl, setStreamUrl] = useState('')
  const [streamStatus, setStreamStatus] = useState<'idle' | 'opening' | 'invalid' | 'error'>('idle')

  const visibleMedia =
    page === 'Videos'
      ? recentMedia.filter((item) => VIDEO_PATTERN.test(item.name))
      : page === 'Music'
        ? recentMedia.filter((item) => AUDIO_PATTERN.test(item.name))
        : page === 'Recent'
          ? recentMedia
          : []

  const supportsRecentMedia = page === 'Videos' || page === 'Music' || page === 'Recent'
  const isNetworkPage = page === 'Network streams'
  const isServicesPage = page === 'Connected services'
  const openNetworkStream = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const normalizedUrl = streamUrl.trim()

    if (normalizedUrl.length === 0) {
      setStreamStatus('invalid')
      return
    }

    setStreamStatus('opening')

    try {
      const result = await window.nexa.openNetworkStream(normalizedUrl)

      if (result.status === 'opened') {
        setStreamStatus('idle')
        onStreamOpened(result.name ?? 'Network stream')
      } else {
        setStreamStatus(result.status)
      }
    } catch {
      setStreamStatus('error')
    }
  }

  return (
    <section
      className={`navigation-page navigation-page--${details.accent}`}
      aria-labelledby="navigation-page-title"
    >
      <div className="navigation-page__glow navigation-page__glow--one" />
      <div className="navigation-page__glow navigation-page__glow--two" />

      <header className="navigation-page__hero">
        <span className="navigation-page__icon">
          <Icon aria-hidden="true" size={27} />
        </span>

        <div className="navigation-page__heading">
          <span>
            <Sparkles aria-hidden="true" size={14} />
            {details.eyebrow}
          </span>
          <h1 id="navigation-page-title">{details.title}</h1>
          <p>{details.description}</p>
        </div>

        <div className="navigation-page__actions">
          <button
            className="hero-button hero-button--primary"
            type="button"
            disabled={openingMedia}
            onClick={onOpenMedia}
          >
            <FilePlus2 aria-hidden="true" size={18} />
            {openingMedia ? 'Opening…' : 'Open media'}
          </button>

          <button
            className="hero-button"
            type="button"
            disabled={openingMedia}
            onClick={onOpenFolder}
          >
            <FolderOpen aria-hidden="true" size={18} />
            Open folder
          </button>
        </div>
      </header>

      {supportsRecentMedia && (
        <div className="navigation-page__section">
          <div className="navigation-page__section-heading">
            <div>
              <span>Library</span>
              <h2>{page === 'Recent' ? 'Playback history' : `Recent ${page.toLowerCase()}`}</h2>
            </div>
            <span className="navigation-page__count">{visibleMedia.length}</span>
          </div>

          {visibleMedia.length > 0 ? (
            <div className="navigation-media-grid">
              {visibleMedia.slice(0, 12).map((item, index) => (
                <button
                  className="navigation-media-card"
                  type="button"
                  key={item.path}
                  title={item.path}
                  style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
                  onClick={() => {
                    onOpenRecent(item)
                  }}
                >
                  <span className="navigation-media-card__art">
                    {page === 'Music' ? (
                      <Music2 aria-hidden="true" size={23} />
                    ) : (
                      <Play aria-hidden="true" size={22} fill="currentColor" />
                    )}
                  </span>

                  <span className="navigation-media-card__copy">
                    <strong>{item.name}</strong>
                    <small>
                      {new Date(item.openedAt).toLocaleString([], {
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
            <div className="navigation-empty-card">
              <span className="navigation-empty-card__art">
                <Icon aria-hidden="true" size={30} />
              </span>
              <div>
                <h3>No {page.toLowerCase()} yet</h3>
                <p>Open compatible media and it will appear here automatically.</p>
              </div>
              <button className="navigation-action-button" type="button" onClick={onOpenMedia}>
                Choose media
              </button>
            </div>
          )}
        </div>
      )}

      {!supportsRecentMedia && !isNetworkPage && !isServicesPage && (
        <div className="navigation-feature-grid">
          <article className="navigation-feature-card">
            <span>
              <Icon aria-hidden="true" size={24} />
            </span>
            <h2>{page === 'Playlists' ? 'Create your first playlist' : 'Start your collection'}</h2>
            <p>
              {page === 'Playlists'
                ? 'Open several files or a folder to begin building a playback collection.'
                : 'Use the heart control while media is playing to keep favourites here.'}
            </p>
            <button
              className="navigation-action-button"
              type="button"
              onClick={page === 'Playlists' ? onOpenFolder : onOpenMedia}
            >
              Get started
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </article>
        </div>
      )}

      {isNetworkPage && (
        <div className="navigation-feature-grid">
          <article className="navigation-feature-card">
            <span>
              <Radio aria-hidden="true" size={24} />
            </span>
            <h2>Open a network stream</h2>
            <p>Enter a compatible HTTP, HTTPS, RTSP, or RTMP media address.</p>

            <form className="network-stream-preview" onSubmit={openNetworkStream}>
              <input
                type="url"
                value={streamUrl}
                placeholder="https://example.com/media"
                aria-label="Network stream URL"
                spellCheck={false}
                disabled={streamStatus === 'opening'}
                onChange={(event) => {
                  setStreamUrl(event.target.value)

                  if (streamStatus !== 'idle') {
                    setStreamStatus('idle')
                  }
                }}
              />

              <button
                className="navigation-action-button"
                type="submit"
                disabled={streamStatus === 'opening'}
              >
                {streamStatus === 'opening' ? 'Opening…' : 'Open stream'}
              </button>
            </form>

            {streamStatus === 'error' && (
              <p className="network-stream-status network-stream-status--error">
                Nexa Player count not open this stream
              </p>
            )}

            {streamStatus === 'error' && (
              <p className="network-stream-status network-stream-status--error">
                Nexa Player could not open this stream.
              </p>
            )}
          </article>
        </div>
      )}

      {isServicesPage && (
        <div className="connected-services-grid">
          {['Plex', 'Jellyfin', 'Emby'].map((service, index) => (
            <article
              className="connected-service-card"
              key={service}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="connected-service-card__logo">{service.slice(0, 1)}</span>
              <div>
                <h2>{service}</h2>
                <p>Personal media service</p>
              </div>
              <button
                className="navigation-action-button navigation-action-button--status"
                type="button"
                disabled
              >
                Coming soon
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default NavigationPage

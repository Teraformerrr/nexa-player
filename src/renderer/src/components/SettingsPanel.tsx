import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Captions,
  Database,
  ExternalLink,
  Eye,
  FolderSearch,
  Gauge,
  Globe2,
  Headphones,
  Info,
  Keyboard,
  Monitor,
  Music2,
  Palette,
  Play,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Speaker,
  Waves,
  X
} from 'lucide-react'

interface SettingsPanelProps {
  readonly onClose: () => void
}

interface SettingsCategory {
  readonly label: string
  readonly icon: LucideIcon
}

const settingsCategories: readonly SettingsCategory[] = [
  { label: 'General', icon: Settings },
  { label: 'Appearance', icon: Palette },
  { label: 'Playback', icon: Play },
  { label: 'Video', icon: Monitor },
  { label: 'Audio', icon: Music2 },
  { label: 'Subtitles', icon: Captions },
  { label: 'Library', icon: Database },
  { label: 'Network', icon: Radio },
  { label: 'Connected services', icon: Globe2 },
  { label: 'Keyboard shortcuts', icon: Keyboard },
  { label: 'Privacy', icon: ShieldCheck },
  { label: 'Updates', icon: RefreshCw },
  { label: 'About', icon: Info }
]

function SettingsCategoryButton({
  label,
  icon: Icon,
  active,
  onSelect
}: SettingsCategory & {
  readonly active: boolean
  readonly onSelect: () => void
}): React.JSX.Element {
  return (
    <button
      className={`settings-category${active ? ' settings-category--active' : ''}`}
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  )
}

function Toggle({
  label,
  description,
  enabled = false
}: {
  readonly label: string
  readonly description: string
  readonly enabled?: boolean
}): React.JSX.Element {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <button
        className={`toggle${enabled ? ' toggle--enabled' : ''}`}
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span />
      </button>
    </div>
  )
}

function GeneralSettings(): React.JSX.Element {
  return (
    <>
      <div className="settings-content__heading">
        <span className="settings-content__icon">
          <SlidersHorizontal aria-hidden="true" size={21} />
        </span>
        <div>
          <h3>General</h3>
          <p>Choose how Nexa Player behaves when you open and play media.</p>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group__title">
          <Gauge aria-hidden="true" size={17} />
          <h4>Startup and playback</h4>
        </div>

        <label className="select-setting">
          <span>
            <strong>When Nexa Player starts</strong>
            <small>Choose the first page shown when the application opens.</small>
          </span>
          <select defaultValue="home" aria-label="Startup page">
            <option value="home">Open Home</option>
            <option value="recent">Open Recent</option>
            <option value="library">Open Library</option>
          </select>
        </label>

        <Toggle
          label="Resume unfinished media"
          description="Continue videos and music from the last saved position."
          enabled
        />

        <Toggle
          label="Remember playback volume"
          description="Use your previous volume the next time Nexa Player opens."
          enabled
        />
      </div>

      <div className="settings-group">
        <div className="settings-group__title">
          <Eye aria-hidden="true" size={17} />
          <h4>Window behaviour</h4>
        </div>

        <Toggle
          label="Always stay on top"
          description="Keep the player above other windows while media is playing."
        />

        <Toggle
          label="Minimise to notification area"
          description="Keep Nexa Player running when the main window is closed."
        />
      </div>

      <div className="settings-group">
        <div className="settings-group__title">
          <FolderSearch aria-hidden="true" size={17} />
          <h4>File locations</h4>
        </div>

        <button className="location-setting" type="button">
          <span>
            <strong>Screenshot folder</strong>
            <small>Pictures\Nexa Player</small>
          </span>
          <span>Choose folder</span>
        </button>
      </div>
    </>
  )
}

function AudioSettings(): React.JSX.Element {
  const openWindowsSoundSettings = (): void => {
    void window.nexa.openSoundSettings()
  }

  return (
    <>
      <div className="settings-content__heading">
        <span className="settings-content__icon">
          <Music2 aria-hidden="true" size={21} />
        </span>
        <div>
          <h3>Audio</h3>
          <p>Configure playback quality, spatial sound, and home-theatre output.</p>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group__title">
          <Speaker aria-hidden="true" size={17} />
          <h4>Playback output</h4>
        </div>

        <div className="setting-row">
          <div>
            <strong>System default output</strong>
            <p>
              Nexa Player uses the active Windows playback device and safe multichannel layouts.
            </p>
          </div>
          <span className="setting-status">Active</span>
        </div>

        <div className="setting-row">
          <div>
            <strong>High-quality downmixing</strong>
            <p>Multichannel audio is normalized safely for stereo speakers and headphones.</p>
          </div>
          <span className="setting-status">Enabled</span>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group__title">
          <Headphones aria-hidden="true" size={17} />
          <h4>Spatial sound</h4>
        </div>

        <button className="location-setting" type="button" onClick={openWindowsSoundSettings}>
          <span>
            <strong>Windows Spatial Sound</strong>
            <small>
              Configure Windows Sonic or Dolby Atmos for Headphones for your current device.
            </small>
          </span>
          <span className="location-setting__action">
            Open settings
            <ExternalLink aria-hidden="true" size={15} />
          </span>
        </button>
      </div>

      <div className="settings-group">
        <div className="settings-group__title">
          <Waves aria-hidden="true" size={17} />
          <h4>Home theatre</h4>
        </div>

        <div className="setting-row">
          <div>
            <strong>Dolby and DTS bitstream passthrough</strong>
            <p>
              Optional HDMI passthrough will be added separately for compatible receivers and
              soundbars.
            </p>
          </div>
          <span className="setting-status setting-status--planned">Planned</span>
        </div>
      </div>
    </>
  )
}

type UpdateState = Awaited<ReturnType<typeof window.nexa.getUpdateState>>

function UpdatesSettings(): React.JSX.Element {
  const [updateState, setUpdateState] = useState<UpdateState | null>(null)

  useEffect(() => {
    let active = true

    const unsubscribe = window.nexa.onUpdateState((state) => {
      if (active) {
        setUpdateState(state)
      }
    })

    void window.nexa.getUpdateState().then((state) => {
      if (active) {
        setUpdateState(state)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const status = updateState?.status ?? 'idle'
  const busy = status === 'checking' || status === 'downloading'
  const unsupported = status === 'unsupported'

  const runUpdateAction = async (): Promise<void> => {
    if (status === 'downloaded') {
      await window.nexa.installUpdate()
      return
    }

    const nextState =
      status === 'available'
        ? await window.nexa.downloadUpdate()
        : await window.nexa.checkForUpdates()

    setUpdateState(nextState)
  }

  const actionLabel =
    status === 'downloaded'
      ? 'Restart and install'
      : status === 'available'
        ? 'Download update'
        : status === 'checking'
          ? 'Checking…'
          : status === 'downloading'
            ? `Downloading… ${Math.round(updateState?.progress ?? 0)}%`
            : 'Check for updates'

  return (
    <>
      <div className="settings-content__heading">
        <span className="settings-content__icon">
          <RefreshCw aria-hidden="true" size={21} />
        </span>
        <div>
          <h3>Updates</h3>
          <p>Keep Nexa Player current with the latest improvements and fixes.</p>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group__title">
          <RefreshCw aria-hidden="true" size={17} />
          <h4>Application updates</h4>
        </div>

        <div className="setting-row">
          <div>
            <strong>Current version</strong>
            <p>Nexa Player {updateState?.currentVersion ?? '0.1.0'}</p>
          </div>
          <span className="setting-status">
            {status === 'downloaded'
              ? 'Ready'
              : status === 'available'
                ? `Version ${updateState?.availableVersion}`
                : status === 'error'
                  ? 'Attention'
                  : 'Installed'}
          </span>
        </div>

        <div className="update-setting">
          <div>
            <strong>Update status</strong>
            <p>{updateState?.message ?? 'Ready to check for updates.'}</p>
          </div>

          {(status === 'downloading' || status === 'downloaded') && (
            <div
              className="update-progress"
              role="progressbar"
              aria-label="Update download progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(updateState?.progress ?? 0)}
            >
              <span style={{ width: `${updateState?.progress ?? 0}%` }} />
            </div>
          )}

          <button
            className="update-action-button"
            type="button"
            disabled={busy || unsupported}
            onClick={() => {
              void runUpdateAction()
            }}
          >
            <RefreshCw aria-hidden="true" size={16} />
            {actionLabel}
          </button>
        </div>
      </div>
    </>
  )
}

function PlaceholderSettings({
  category
}: {
  readonly category: SettingsCategory
}): React.JSX.Element {
  const Icon = category.icon

  return (
    <div className="settings-placeholder">
      <span className="settings-content__icon">
        <Icon aria-hidden="true" size={21} />
      </span>
      <h3>{category.label}</h3>
      <p>This settings page will be connected in a later milestone.</p>
    </div>
  )
}

function SettingsPanel({ onClose }: SettingsPanelProps): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState('General')
  const selectedCategory =
    settingsCategories.find((category) => category.label === activeCategory) ??
    settingsCategories[0]

  return (
    <div className="settings-backdrop" role="presentation">
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="settings-panel__header">
          <div>
            <p className="section-kicker">Personalise your experience</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close settings"
            title="Close settings"
            onClick={onClose}
          >
            <X aria-hidden="true" size={21} />
          </button>
        </header>

        <div className="settings-panel__body">
          <nav className="settings-categories" aria-label="Settings categories">
            {settingsCategories.map((category) => (
              <SettingsCategoryButton
                key={category.label}
                {...category}
                active={activeCategory === category.label}
                onSelect={() => {
                  setActiveCategory(category.label)
                }}
              />
            ))}
          </nav>

          <div className="settings-content">
            {activeCategory === 'General' ? (
              <GeneralSettings />
            ) : activeCategory === 'Audio' ? (
              <AudioSettings />
            ) : activeCategory === 'Updates' ? (
              <UpdatesSettings />
            ) : (
              <PlaceholderSettings category={selectedCategory} />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default SettingsPanel

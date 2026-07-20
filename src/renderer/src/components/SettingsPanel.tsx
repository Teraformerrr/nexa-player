import type { LucideIcon } from 'lucide-react'
import {
  Captions,
  Database,
  Eye,
  FolderSearch,
  Gauge,
  Globe2,
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
  X
} from 'lucide-react'

interface SettingsPanelProps {
  readonly onClose: () => void
}

interface SettingsCategory {
  readonly label: string
  readonly icon: LucideIcon
  readonly active?: boolean
}

const settingsCategories: readonly SettingsCategory[] = [
  { label: 'General', icon: Settings, active: true },
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
  active = false
}: SettingsCategory): React.JSX.Element {
  return (
    <button
      className={`settings-category${active ? ' settings-category--active' : ''}`}
      type="button"
      aria-current={active ? 'page' : undefined}
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

function SettingsPanel({ onClose }: SettingsPanelProps): React.JSX.Element {
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
              <SettingsCategoryButton key={category.label} {...category} />
            ))}
          </nav>

          <div className="settings-content">
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
          </div>
        </div>
      </section>
    </div>
  )
}

export default SettingsPanel

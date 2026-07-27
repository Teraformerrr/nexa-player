import { Maximize2, Music2, Pause, Play, Sparkles } from 'lucide-react'

interface AudioNowPlayingProps {
  readonly fileName: string
  readonly paused: boolean
  readonly onTogglePause: () => void
  readonly onEnterFullscreen: () => void
}

function getTrackTitle(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replaceAll('_', ' ')
    .trim()
}

function AudioNowPlaying({
  fileName,
  paused,
  onTogglePause,
  onEnterFullscreen
}: AudioNowPlayingProps): React.JSX.Element {
  const trackTitle = getTrackTitle(fileName)

  return (
    <section
      className={`audio-now-playing ${
        paused ? 'audio-now-playing--paused' : 'audio-now-playing--playing'
      }`}
      aria-label={`Now playing ${trackTitle}`}
    >
      <div className="audio-now-playing__aurora audio-now-playing__aurora--one" />
      <div className="audio-now-playing__aurora audio-now-playing__aurora--two" />

      <div className="audio-now-playing__art-stage" aria-hidden="true">
        <div
          className={`audio-now-playing__record${paused ? ' audio-now-playing__record--paused' : ''}`}
        >
          <div className="audio-now-playing__record-rings" />
          <div className="audio-now-playing__record-label">
            <Music2 size={42} strokeWidth={1.7} />
          </div>
        </div>

        <div className="audio-now-playing__art-glow" />
      </div>

      <div className="audio-now-playing__content">
        <span className="audio-now-playing__eyebrow">
          <Sparkles aria-hidden="true" size={15} />
          Now playing
        </span>

        <h1>{trackTitle}</h1>
        <p>Playing locally with Nexa Player</p>

        <div className="audio-now-playing__visualizer" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} style={{ animationDelay: `${index * -70}ms` }} />
          ))}
        </div>

        <div className="audio-now-playing__actions">
          <button
            className="audio-now-playing__play"
            type="button"
            aria-label={paused ? 'Play' : 'Pause'}
            onClick={onTogglePause}
          >
            {paused ? (
              <Play aria-hidden="true" size={25} fill="currentColor" />
            ) : (
              <Pause aria-hidden="true" size={25} fill="currentColor" />
            )}
          </button>

          <button
            className="audio-now-playing__secondary"
            type="button"
            onClick={onEnterFullscreen}
          >
            <Maximize2 aria-hidden="true" size={18} />
            Full-screen player
          </button>
        </div>
      </div>
    </section>
  )
}

export default AudioNowPlaying

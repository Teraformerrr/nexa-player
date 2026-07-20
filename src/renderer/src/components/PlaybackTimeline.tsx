import { useEffect, useState } from 'react'

interface PlaybackTimelineProps {
  readonly enabled: boolean
}

interface TimelineState {
  readonly position: number
  readonly duration: number
}

const EMPTY_TIMELINE: TimelineState = {
  position: 0,
  duration: 0
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }

  const wholeSeconds = Math.floor(seconds)
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const remainingSeconds = wholeSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function PlaybackTimeline({ enabled }: PlaybackTimelineProps): React.JSX.Element {
  const [timeline, setTimeline] = useState<TimelineState>(EMPTY_TIMELINE)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = async (): Promise<void> => {
      try {
        const state = await window.nexa.getPlaybackState()

        if (!cancelled && state.active) {
          setTimeline({
            position: state.position,
            duration: state.duration
          })
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(() => {
            void refresh()
          }, 500)
        }
      }
    }

    void refresh()

    return () => {
      cancelled = true

      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [enabled])

  const progress =
    timeline.duration > 0
      ? Math.min(100, Math.max(0, (timeline.position / timeline.duration) * 100))
      : 0

  const seek = (value: string): void => {
    const position = Number(value)

    if (!Number.isFinite(position) || timeline.duration <= 0) {
      return
    }

    setTimeline((current) => ({
      ...current,
      position
    }))

    void window.nexa.seek(position)
  }

  return (
    <div className="timeline">
      <span>{formatTime(timeline.position)}</span>

      <div className="timeline-track">
        <div className="timeline-track__buffered" />
        <div className="timeline-track__played" style={{ width: `${progress}%` }} />

        <input
          className="timeline-seek"
          type="range"
          min="0"
          max={timeline.duration || 0}
          step="0.1"
          value={Math.min(timeline.position, timeline.duration || 0)}
          disabled={!enabled || timeline.duration <= 0}
          aria-label="Playback position"
          onChange={(event) => {
            seek(event.currentTarget.value)
          }}
        />
      </div>

      <span>{formatTime(timeline.duration)}</span>
    </div>
  )
}

export default PlaybackTimeline

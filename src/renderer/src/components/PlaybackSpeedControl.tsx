import { useState } from 'react'
import { Gauge } from 'lucide-react'

interface PlaybackSpeedControlProps {
  readonly enabled: boolean
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

function PlaybackSpeedControl({ enabled }: PlaybackSpeedControlProps): React.JSX.Element {
  const [speedIndex, setSpeedIndex] = useState(2)
  const speed = PLAYBACK_SPEEDS[speedIndex]

  const cycleSpeed = (): void => {
    if (!enabled) {
      return
    }

    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length
    const nextSpeed = PLAYBACK_SPEEDS[nextIndex]

    setSpeedIndex(nextIndex)
    void window.nexa.setPlaybackSpeed(nextSpeed)
  }

  return (
    <button
      className="icon-button playback-speed-button"
      type="button"
      aria-label={`Playback speed ${speed} times`}
      title={`Playback speed: ${speed}×`}
      disabled={!enabled}
      onClick={cycleSpeed}
    >
      <Gauge aria-hidden="true" size={19} />
      <span>{speed}×</span>
    </button>
  )
}

export default PlaybackSpeedControl

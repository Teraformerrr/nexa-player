import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

function VolumeControl(): React.JSX.Element {
  const [volume, setVolume] = useState(70)
  const [previousVolume, setPreviousVolume] = useState(70)

  const updateVolume = (nextVolume: number): void => {
    const normalizedVolume = Math.min(100, Math.max(0, nextVolume))

    setVolume(normalizedVolume)

    if (normalizedVolume > 0) {
      setPreviousVolume(normalizedVolume)
    }

    void window.nexa.setVolume(normalizedVolume)
  }

  const toggleMute = (): void => {
    updateVolume(volume > 0 ? 0 : previousVolume || 70)
  }

  return (
    <div className="volume-control">
      <button
        className="volume-button"
        type="button"
        aria-label={volume > 0 ? 'Mute' : 'Unmute'}
        title={volume > 0 ? 'Mute' : 'Unmute'}
        onClick={toggleMute}
      >
        {volume > 0 ? (
          <Volume2 aria-hidden="true" size={20} />
        ) : (
          <VolumeX aria-hidden="true" size={20} />
        )}
      </button>

      <input
        className="volume-range"
        type="range"
        min="0"
        max="100"
        step="1"
        value={volume}
        aria-label={`Volume ${volume} percent`}
        style={{ '--volume-level': `${volume}%` } as React.CSSProperties}
        onChange={(event) => {
          updateVolume(Number(event.currentTarget.value))
        }}
      />
    </div>
  )
}

export default VolumeControl

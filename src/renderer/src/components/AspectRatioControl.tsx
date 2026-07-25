import { useEffect, useRef, useState } from 'react'
import { Check, Ratio } from 'lucide-react'
type VideoAspectRatio = 'auto' | '16:9' | '4:3' | '21:9' | '1:1'

interface AspectRatioOption {
  readonly value: VideoAspectRatio
  readonly label: string
  readonly description: string
}

interface AspectRatioControlProps {
  readonly enabled: boolean
}

const aspectRatioOptions: readonly AspectRatioOption[] = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Use the video’s original shape'
  },
  {
    value: '16:9',
    label: '16:9',
    description: 'Widescreen'
  },
  {
    value: '4:3',
    label: '4:3',
    description: 'Classic television'
  },
  {
    value: '21:9',
    label: '21:9',
    description: 'Ultrawide cinema'
  },
  {
    value: '1:1',
    label: '1:1',
    description: 'Square'
  }
]

function AspectRatioControl({ enabled }: AspectRatioControlProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [selectedRatio, setSelectedRatio] = useState<VideoAspectRatio>('auto')
  const controlRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent): void => {
      if (
        controlRef.current &&
        event.target instanceof Node &&
        !controlRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
    }
  }, [])

  useEffect(() => {
    return window.nexa.onVideoAspectRatioChange((aspectRatio) => {
      setSelectedRatio(aspectRatio)
    })
  }, [])

  useEffect(() => {
    const cycleWithKeyboard = (event: KeyboardEvent): void => {
      if (
        !enabled ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.key.toLowerCase() === 'a') {
        event.preventDefault()
        void window.nexa.cycleVideoAspectRatio()
      }
    }
    window.addEventListener('keydown', cycleWithKeyboard)

    return () => {
      window.removeEventListener('keydown', cycleWithKeyboard)
    }
  }, [enabled])

  const selectAspectRatio = async (aspectRatio: VideoAspectRatio): Promise<void> => {
    try {
      await window.nexa.setVideoAspectRatio(aspectRatio)
      setSelectedRatio(aspectRatio)
      setOpen(false)
    } catch {
      // Keep the current selection when the playback engine cannot be reached.
    }
  }

  return (
    <div className="aspect-ratio-control" ref={controlRef}>
      <button
        className={`icon-button${open ? ' icon-button--active' : ''}`}
        type="button"
        aria-label="Aspect ratio"
        title={`Aspect ratio: ${selectedRatio === 'auto' ? 'Auto' : selectedRatio}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={!enabled}
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        <Ratio aria-hidden="true" size={19} />
      </button>

      {open && (
        <div className="aspect-ratio-menu" role="menu" aria-label="Aspect ratio">
          <div className="aspect-ratio-menu__heading">
            <strong>Aspect ratio</strong>
            <span>Choose how the video fits</span>
          </div>

          <div className="aspect-ratio-menu__options">
            {aspectRatioOptions.map((option) => {
              const selected = option.value === selectedRatio

              return (
                <button
                  className={`aspect-ratio-option${
                    selected ? ' aspect-ratio-option--selected' : ''
                  }`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  key={option.value}
                  onClick={() => {
                    void selectAspectRatio(option.value)
                  }}
                >
                  <span className="aspect-ratio-option__preview" data-ratio={option.value} />

                  <span className="aspect-ratio-option__copy">
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>

                  {selected && <Check aria-hidden="true" size={17} />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default AspectRatioControl

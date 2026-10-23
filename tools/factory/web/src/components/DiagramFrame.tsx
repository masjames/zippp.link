import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export function DiagramFrame({ title, children }: { title: string; children: ReactNode }) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!fullscreen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  return (
    <div className={fullscreen ? 'fixed inset-0 z-[100] flex flex-col bg-base-100 p-4' : 'relative'}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-base-content/60">{title}</span>
        <button className="btn btn-xs" onClick={() => setFullscreen((value) => !value)}>
          {fullscreen ? 'Close full screen' : 'Full screen'}
        </button>
      </div>
      <div className={fullscreen ? 'min-h-0 flex-1 overflow-auto' : 'overflow-auto'}>{children}</div>
    </div>
  )
}

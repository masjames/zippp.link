import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function DiagramFrame({ title, children }: { title: string; children: ReactNode }) {
  const [fullscreen, setFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fullscreen) {
      setScale(1)
      return
    }
    function fit() {
      const container = containerRef.current
      const content = contentRef.current
      if (!container || !content) return
      const naturalWidth = content.scrollWidth
      const naturalHeight = content.scrollHeight
      if (naturalWidth === 0 || naturalHeight === 0) return
      setScale(
        Math.min(
          1,
          container.clientWidth / naturalWidth,
          container.clientHeight / naturalHeight,
        ),
      )
    }
    const frame = requestAnimationFrame(fit)
    const observer = new ResizeObserver(fit)
    if (containerRef.current) observer.observe(containerRef.current)
    if (contentRef.current) observer.observe(contentRef.current)
    window.addEventListener('resize', fit)
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', fit)
      window.removeEventListener('keydown', onKey)
    }
  }, [fullscreen, children])

  return (
    <div className={fullscreen ? 'fixed inset-0 z-[100] flex flex-col bg-base-100 p-4' : 'relative'}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-base-content/60">{title}</span>
        <button className="btn btn-xs" onClick={() => setFullscreen((value) => !value)}>
          {fullscreen ? 'Close full screen' : 'Full screen'}
        </button>
      </div>
      <div
        ref={containerRef}
        data-diagram-fullscreen={fullscreen ? 'true' : undefined}
        className={
          fullscreen
            ? 'flex min-h-0 flex-1 items-center justify-center overflow-hidden'
            : 'overflow-auto'
        }
      >
        <div
          ref={contentRef}
          className={fullscreen ? 'w-max max-w-none' : undefined}
          style={
            fullscreen
              ? { transform: `scale(${scale})`, transformOrigin: 'center center' }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}

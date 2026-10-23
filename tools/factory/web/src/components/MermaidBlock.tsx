import { useEffect, useId, useState } from 'react'
import mermaid from 'mermaid'

let initialized = false

function ensureMermaid() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      primaryColor: '#eef2ff',
      primaryBorderColor: '#6366f1',
      primaryTextColor: '#1f2937',
      lineColor: '#6b7280',
      secondaryColor: '#f8fafc',
      tertiaryColor: '#ffffff',
    },
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
    er: { useMaxWidth: false },
  })
  initialized = true
}

export function MermaidBlock({ source }: { source: string }) {
  const reactId = useId().replace(/:/g, '')
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ensureMermaid()
    mermaid
      .render(`mermaid-${reactId}`, source)
      .then((result) => {
        if (cancelled) return
        setSvg(result.svg)
        setFailed(false)
      })
      .catch(() => {
        if (cancelled) return
        setSvg('')
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [reactId, source])

  if (failed) {
    return <pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{source}</pre>
  }
  if (!svg) {
    return <div className="rounded-box bg-base-200 p-2 text-xs text-base-content/60">Rendering diagram...</div>
  }
  return (
    <div
      className="overflow-auto rounded-box bg-base-100 p-2"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

import { useId } from 'react'
import { layoutFlow, parseFlow } from '../lib/flow'

export function FlowBlock({ source }: { source: string }) {
  const markerId = useId().replace(/:/g, '')
  const model = parseFlow(source)
  if (model.nodes.length === 0) {
    return <pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{source}</pre>
  }
  const layout = layoutFlow(model)
  return (
    <div className="overflow-auto rounded-box bg-base-200">
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="User flow diagram"
        className="block"
      >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {layout.lines.map((line, index) => (
        <g key={`line-${index}`}>
          <line
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth={1.4}
            markerEnd={`url(#${markerId})`}
          />
          {line.label && (
            <text
              x={(line.x1 + line.x2) / 2}
              y={(line.y1 + line.y2) / 2 - 4}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              opacity={0.6}
            >
              {line.label}
            </text>
          )}
        </g>
      ))}
      {layout.boxes.map((box) => (
        <g key={box.id}>
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            rx={7}
            fill="currentColor"
            fillOpacity={0.08}
            stroke="currentColor"
            strokeOpacity={0.45}
          />
          <text
            x={box.x + box.width / 2}
            y={box.y + box.height / 2 + 4}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
          >
            {box.label.length > 20 ? `${box.label.slice(0, 19)}...` : box.label}
          </text>
        </g>
      ))}
      </svg>
    </div>
  )
}

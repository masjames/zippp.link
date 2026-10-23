import { layoutErd, parseEraser } from '../lib/eraser'
import { DiagramFrame } from './DiagramFrame'

export function EraserBlock({ source }: { source: string }) {
  const model = parseEraser(source)
  if (model.entities.length === 0) {
    return <pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{source}</pre>
  }
  const layout = layoutErd(model)
  return (
    <DiagramFrame title="ER diagram">
      <div className="rounded-box bg-base-200">
        <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label="Entity relationship diagram"
        className="block"
      >
      <g stroke="currentColor" fill="currentColor">
        {layout.lines.map((line, index) => (
          <g key={`line-${index}`}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              strokeOpacity={0.55}
              strokeWidth={1.5}
            />
            <text x={line.x1} y={line.y1 - 5} textAnchor="middle" fontSize={10} stroke="none">
              {line.fromLabel}
            </text>
            <text x={line.x2} y={line.y2 - 5} textAnchor="middle" fontSize={10} stroke="none">
              {line.toLabel}
            </text>
          </g>
        ))}
        {layout.boxes.map((box, boxIndex) => (
          <g key={`box-${boxIndex}`}>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={6}
              fill="none"
              strokeOpacity={0.5}
            />
            <line
              x1={box.x}
              y1={box.y + 28}
              x2={box.x + box.width}
              y2={box.y + 28}
              strokeOpacity={0.35}
            />
            <text x={box.x + 10} y={box.y + 18} fontSize={12} fontWeight={600} stroke="none">
              {box.name}
            </text>
            {box.fields.map((field, fieldIndex) => (
              <g key={`field-${boxIndex}-${fieldIndex}`}>
                <text
                  x={box.x + 10}
                  y={field.y + 4}
                  fontSize={11}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontWeight={field.pk ? 700 : 400}
                  stroke="none"
                >
                  {field.name}
                  {field.fk ? ' fk' : ''}
                </text>
                {field.type && (
                  <text
                    x={box.x + box.width - 10}
                    y={field.y + 4}
                    fontSize={10}
                    textAnchor="end"
                    opacity={0.6}
                    stroke="none"
                  >
                    {field.type}
                  </text>
                )}
              </g>
            ))}
          </g>
        ))}
      </g>
        </svg>
      </div>
    </DiagramFrame>
  )
}

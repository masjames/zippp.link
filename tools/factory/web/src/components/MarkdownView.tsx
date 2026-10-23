import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EraserBlock } from './EraserBlock'
import { ErrorBoundary } from './ErrorBoundary'

export function MarkdownView({ body }: { body: string }) {
  return (
    <div className="space-y-2 text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children } = props
            const text = String(children).replace(/\n$/, '')
            if (className === 'language-eraser') {
              return (
                <ErrorBoundary fallback={<pre className="overflow-auto rounded-box bg-base-200 p-2 text-xs">{text}</pre>}>
                  <EraserBlock source={text} />
                </ErrorBoundary>
              )
            }
            return <code className={className}>{children}</code>
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}

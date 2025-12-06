import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import './WritingPane.css'

interface WritingPaneProps {
  value: string
  onChange: (value: string) => void
  width: number // percentage (0-100)
  title?: string
  placeholder?: string
  accentColor?: string // Hex color for accent highlights
  // Style customization
  background?: string // CSS background value
  textColor?: string // Color of written text
  titleColor?: string // Color of the title
  fontFamily?: string // 'serif', 'sans', 'mono', or CSS font-family
}

// Map shorthand font names to CSS font-family
const FONT_MAP: Record<string, string> = {
  serif: "'Georgia', 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
}

// Convert plain text with newlines to HTML paragraphs for TipTap
function textToHtml(text: string): string {
  if (!text) return ''
  // Split on double newlines (paragraph breaks) first
  const paragraphs = text.split(/\n\n+/)
  return paragraphs
    .map((para) => {
      // Within each paragraph, convert single newlines to <br>
      const withBreaks = para
        .split('\n')
        .map((line) => line.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('<br>')
      return `<p>${withBreaks}</p>`
    })
    .join('')
}

export function WritingPane({
  value,
  onChange,
  width,
  title = 'Ephemeral Space',
  placeholder = 'Start writing...',
  accentColor = '#fbbf24',
  background,
  textColor,
  titleColor,
  fontFamily,
}: WritingPaneProps) {
  // Resolve font family (shorthand or custom)
  const resolvedFont = fontFamily
    ? FONT_MAP[fontFamily] || fontFamily
    : undefined

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Enable markdown-like shortcuts
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
    ],
    content: textToHtml(value),
    onUpdate: ({ editor }) => {
      // Get plain text for LLM context
      onChange(editor.getText())
    },
    editorProps: {
      attributes: {
        class: 'writing-editor',
        spellcheck: 'false',
      },
    },
  })

  // Sync external value changes (e.g., on restore)
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      // Only update if content actually differs
      const currentContent = editor.getText()
      if (currentContent !== value) {
        // Convert plain text to HTML to preserve newlines
        editor.commands.setContent(textToHtml(value))
      }
    }
  }, [editor, value])

  // Auto-focus on mount (only in browser environment)
  useEffect(() => {
    if (editor && typeof window !== 'undefined' && editor.view) {
      setTimeout(() => {
        try {
          editor.commands.focus()
        } catch {
          // Ignore focus errors (e.g., in test environment)
        }
      }, 100)
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div
      className="writing-pane"
      style={
        {
          width: `${width}%`,
          '--accent-color': accentColor,
          '--pane-background': background,
          '--pane-text-color': textColor,
          '--pane-title-color': titleColor,
          '--pane-font-family': resolvedFont,
        } as React.CSSProperties
      }
    >
      <div className="writing-pane-header">
        <span className="writing-pane-title">{title}</span>
        <div className="writing-pane-toolbar">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={
              editor.isActive('heading', { level: 2 }) ? 'is-active' : ''
            }
            title="Heading (Ctrl+Alt+2)"
          >
            H
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Bullet List"
          >
            •
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Quote (Ctrl+Shift+B)"
          >
            "
          </button>
        </div>
      </div>

      <EditorContent editor={editor} className="writing-area" />

      <div className="writing-pane-hint">
        Claude sees your writing + visible cards • Double-click canvas to add
        your own
      </div>
    </div>
  )
}

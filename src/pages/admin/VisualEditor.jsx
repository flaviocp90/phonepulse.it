import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Markdown } from '@tiptap/markdown'
import { mediaPath } from '../../lib/privateMedia'
import { safeExternalUrl } from '../../lib/publicEditorial'

const buttonClass = 'px-3 py-2 rounded-lg border border-border text-sm disabled:opacity-40 aria-pressed:bg-primary/10'

export default forwardRef(function VisualEditor({ value, onChange, disabled, privateUrls }, ref) {
  const latest = useRef({ onChange, privateUrls })
  latest.current = { onChange, privateUrls }
  const emitted = useRef(value)
  const [link, setLink] = useState('')
  const extensions = useMemo(() => [
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false }, underline: false }),
    TableKit,
    Image.extend({
      addNodeView() {
        return ({ node }) => {
          const dom = document.createElement('img')
          function update(next) {
            if (next.type !== node.type) return false
            dom.dataset.canonicalSrc = next.attrs.src || ''
            dom.alt = next.attrs.alt || ''
            const src = latest.current.privateUrls[next.attrs.src] || (mediaPath(next.attrs.src) ? undefined : safeExternalUrl(next.attrs.src))
            if (src) dom.src = src
            else dom.removeAttribute('src')
            return true
          }
          update(node)
          return { dom, update, ignoreMutation: () => true }
        }
      },
    }).configure({ allowBase64: false }),
    Markdown,
  ], [])
  const editor = useEditor({
    extensions, content: value, contentType: 'markdown',
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Contenuto visuale', 'aria-multiline': 'true', class: 'article-content min-h-80 p-4 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30' } },
    onUpdate({ editor, transaction }) { if (!transaction.docChanged) return; emitted.current = editor.getMarkdown(); latest.current.onChange(emitted.current) },
  })
  const active = useEditorState({ editor, selector: ({ editor }) => ({ bold: editor?.isActive('bold'), heading: editor?.isActive('heading'), table: editor?.isActive('table') }) })
  useEffect(() => {
    if (editor && value !== emitted.current) { editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false }); emitted.current = value }
  }, [editor, value])
  useEffect(() => { editor?.setEditable(!disabled) }, [editor, disabled])
  useEffect(() => {
    editor?.view.dom.querySelectorAll('img[data-canonical-src]').forEach(img => {
      const src = privateUrls[img.dataset.canonicalSrc] || (mediaPath(img.dataset.canonicalSrc) ? undefined : safeExternalUrl(img.dataset.canonicalSrc))
      if (src && img.getAttribute('src') !== src) img.setAttribute('src', src)
    })
  }, [editor, privateUrls])
  useImperativeHandle(ref, () => ({ insertMarkdown(text) { editor?.chain().focus().insertContent(text, { contentType: 'markdown' }).run() } }), [editor])
  if (!editor) return <p role="status">Caricamento editor visuale...</p>

  function command(action) { editor.chain().focus()[action]().run() }
  return <div className="space-y-3">
    <div role="toolbar" aria-label="Formattazione visuale" className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} aria-pressed={!!active?.heading} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Titolo sezione</button>
      <button type="button" className={buttonClass} aria-pressed={!!active?.bold} onClick={() => command('toggleBold')}>Grassetto</button>
      <button type="button" className={buttonClass} onClick={() => command('toggleItalic')}>Corsivo</button>
      <button type="button" className={buttonClass} onClick={() => command('toggleBulletList')}>Elenco puntato</button>
      <button type="button" className={buttonClass} onClick={() => command('toggleOrderedList')}>Elenco numerato</button>
      <button type="button" className={buttonClass} onClick={() => command('toggleBlockquote')}>Citazione</button>
      <button type="button" className={buttonClass} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Inserisci tabella</button>
      {active?.table && <><button type="button" className={buttonClass} onClick={() => command('addRowAfter')}>Aggiungi riga</button><button type="button" className={buttonClass} onClick={() => command('addColumnAfter')}>Aggiungi colonna</button><button type="button" className={buttonClass} onClick={() => command('deleteTable')}>Rimuovi tabella</button></>}
      <button type="button" className={buttonClass} onClick={() => command('undo')}>Annulla</button><button type="button" className={buttonClass} onClick={() => command('redo')}>Ripeti</button>
    </div>
    <div className="flex flex-wrap gap-2 items-end"><label className="text-xs flex-1 min-w-0">Destinazione link<input type="url" value={link} onChange={e => setLink(e.target.value)} className="block border border-border rounded-lg p-2 w-full" /></label><button type="button" className={buttonClass} disabled={!safeExternalUrl(link)} onClick={() => editor.chain().focus().extendMarkRange('link').setLink({ href: safeExternalUrl(link) }).run()}>Applica link</button><button type="button" className={buttonClass} onClick={() => command('unsetLink')}>Rimuovi link</button></div>
    <EditorContent editor={editor} />
  </div>
})

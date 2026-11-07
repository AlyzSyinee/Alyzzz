'use client'

import { useRef, useState } from 'react'
import JSZip from 'jszip'

type Item = { id: string; path: string; blob: Blob; size: number; big: boolean }
type Status = 'idle' | 'unzipping' | 'sending' | 'done' | 'error'

const MAX = 4 * 1024 * 1024
const JUNK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/

const clean = (p: string) =>
  p.replace(/\\/g, '/').split('/').filter((s) => s && s !== '.' && s !== '..').join('/')

const fmt = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`

const mk = (path: string, blob: Blob): Item => ({
  id: `${path}:${blob.size}:${Math.random().toString(36).slice(2, 7)}`,
  path,
  blob,
  size: blob.size,
  big: blob.size > MAX,
})

export default function Uploader() {
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [over, setOver] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [message, setMessage] = useState('')
  const [commitUrl, setCommitUrl] = useState('')

  const busy = status === 'unzipping' || status === 'sending'
  const sendable = items.filter((i) => !i.big)

  async function add(files: File[]) {
    if (!files.length) return
    setStatus('unzipping'); setMessage(''); setCommitUrl('')
    try {
      const next: Item[] = []
      for (const f of files) {
        if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
          const zip = await JSZip.loadAsync(f)
          const entries = Object.values(zip.files).filter((e) => !e.dir && !JUNK.test(e.name))
          for (const e of entries) {
            const path = clean(e.name)
            if (path) next.push(mk(path, await e.async('blob')))
          }
        } else {
          const path = clean((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name)
          if (path) next.push(mk(path, f))
        }
      }
      setItems((prev) => {
        const map = new Map(prev.map((i) => [i.path, i]))
        next.forEach((i) => map.set(i.path, i))
        return Array.from(map.values())
      })
      setStatus('idle')
    } catch {
      setStatus('error'); setMessage('Invalid zip file')
    }
  }

  async function send() {
    if (!sendable.length || busy) return
    setStatus('sending'); setMessage(''); setCommitUrl('')
    setProgress({ done: 0, total: sendable.length })
    try {
      const queue = [...sendable]
      const out: { path: string; sha: string }[] = []
      let done = 0
      await Promise.all(
        Array.from({ length: 3 }, async () => {
          while (queue.length) {
            const it = queue.shift()!
            const res = await fetch('/api/upload/blob', {
              method: 'POST',
              headers: { 'content-type': 'application/octet-stream' },
              body: it.blob,
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.error || `Failed: ${it.path}`)
            out.push({ path: it.path, sha: json.sha })
            setProgress({ done: ++done, total: sendable.length })
          }
        }),
      )
      const res = await fetch('/api/upload/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: out }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Commit failed')
      setCommitUrl(json.url)
      setStatus('done')
      setItems((prev) => prev.filter((i) => i.big))
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  const pct = progress.total ? (progress.done / progress.total) * 100 : 0
  const total = sendable.reduce((s, i) => s + i.size, 0)

  return (
    <section className="space-y-5">
      <div
        className="drop"
        data-active={over}
        role="button"
        tabIndex={0}
        aria-label="Drop files"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files)) }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--ember))" strokeWidth="1.6" strokeLinecap="square" aria-hidden>
          <path d="M12 16V4M12 4l-5 5M12 4l5 5M4 16v4h16v-4" />
        </svg>
        <span className="font-display text-base font-medium tracking-tight">Drop files or zip</span>
        <span className="border border-ember/50 px-4 py-1.5 text-sm text-heat">Browse</span>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = '' }}
        />
      </div>

      {items.length > 0 && (
        <div className="border border-ember/20 bg-void/60">
          <div className="flex items-center justify-between border-b border-ember/20 px-4 py-3 text-sm">
            <span>{sendable.length} {sendable.length === 1 ? 'file' : 'files'} <span className="text-ash/40">{fmt(total)}</span></span>
            <button className="text-ash/50 transition hover:text-heat" onClick={() => setItems([])} disabled={busy}>Clear</button>
          </div>
          <ul className="max-h-72 divide-y divide-ember/10 overflow-y-auto">
            {items.map((i) => {
              const k = i.path.lastIndexOf('/')
              return (
                <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-ash/40">{k >= 0 ? i.path.slice(0, k + 1) : ''}</span>
                    {i.path.slice(k + 1)}
                  </span>
                  {i.big && <span className="text-heat">Too large</span>}
                  <span className="shrink-0 text-ash/40">{fmt(i.size)}</span>
                  <button
                    aria-label={`Remove ${i.path}`}
                    className="shrink-0 px-1 text-ash/40 transition hover:text-heat"
                    disabled={busy}
                    onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <button className="btn" onClick={send} disabled={!sendable.length || busy}>
        {status === 'sending' && (
          <span className="absolute inset-y-0 left-0 bg-heat transition-[width] duration-300" style={{ width: `${pct}%` }} aria-hidden />
        )}
        <span className="relative">
          {status === 'unzipping' ? 'Reading' : status === 'sending' ? `Sending ${progress.done}/${progress.total}` : status === 'done' ? 'Sent' : 'Send'}
        </span>
      </button>

      {status === 'error' && message && (
        <p role="alert" className="border-l-2 border-ember bg-ember/10 px-3 py-2 text-sm text-heat">{message}</p>
      )}
      {status === 'done' && commitUrl && (
        <a href={commitUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-heat underline underline-offset-4">View commit</a>
      )}
    </section>
  )
}

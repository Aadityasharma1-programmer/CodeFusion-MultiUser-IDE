import { useState } from 'react'
import { LANG_LABELS } from '../../store/projectStore'

export default function NewProjectModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [lang, setLang] = useState('javascript')

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onCreate(name.trim(), lang)
    setName('')
    setLang('javascript')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-void-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md glass-panel rounded-2xl p-6 shadow-[0_0_30px_rgba(142,213,255,0.15)] border-primary/30 border">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">add_circle</span>
          <h2 className="font-headline-md text-headline-md text-primary">New Project</h2>
        </div>
        <p className="font-body-sm text-on-surface-variant mb-6">Initialize a new isolated environment.</p>

        <form onSubmit={handleSubmit} className="space-y-stack-md">
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1.5 block">PROJECT NAME</label>
            <input
              className="w-full bg-void-black border border-glass-border rounded-xl p-3 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="e.g. quantum-simulator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant mb-1.5 block">RUNTIME</label>
            <select
              className="w-full bg-void-black border border-glass-border rounded-xl p-3 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer appearance-none"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              {Object.entries(LANG_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4 border-t border-glass-border mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl border border-glass-border text-on-surface-variant font-label-caps text-label-caps hover:bg-surface-bright hover:text-on-surface transition-all"
            >
              CANCEL
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-caps text-label-caps font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(142,213,255,0.3)]"
            >
              INITIALIZE
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

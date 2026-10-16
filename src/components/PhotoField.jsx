import { useRef } from 'react'
import { MAX_PHOTOS_PER_ITEM } from '../lib/installFields'

// value: array of { file, preview }. Several photos allowed per item.
export default function PhotoField({ label, value, onChange, required }) {
  const inputRef = useRef(null)

  function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    const room = MAX_PHOTOS_PER_ITEM - value.length
    const added = files.slice(0, room).map(file => ({ file, preview: URL.createObjectURL(file) }))
    if (added.length) onChange([...value, ...added])
    if (inputRef.current) inputRef.current.value = ''
  }
  function remove(i) {
    URL.revokeObjectURL(value[i].preview)
    onChange(value.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
      <div className="flex gap-2 flex-wrap">
        {value.map((p, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
            <img src={p.preview} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(i)}
              className="absolute top-1 right-1 bg-white/90 rounded-full w-5 h-5 flex items-center justify-center shadow text-gray-600 text-sm leading-none">×</button>
          </div>
        ))}
        {value.length < MAX_PHOTOS_PER_ITEM && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-brand-purple/30 bg-purple-50/50 flex flex-col items-center justify-center gap-1 active:bg-purple-50">
            <svg className="w-6 h-6 text-brand-purple/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-brand-purple/60 text-[11px] font-medium">Ajouter</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
    </div>
  )
}

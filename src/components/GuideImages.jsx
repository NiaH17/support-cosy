import { useState } from 'react'

// Image helpers for the troubleshooting / info guides (ported from Octo Assist, French labels).
// An image = { src, caption, hotspots?: [{ id, pos: {x, y} (0..1), type?: 'circle' | 'pin', radius?, color?, label }] }

export function ImageLightbox({ src, caption, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative max-w-full max-h-full p-4 flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        <img src={src} alt={caption} className="max-w-[92vw] max-h-[80vh] rounded-2xl object-contain select-none" style={{ touchAction: 'pinch-zoom' }} />
        {caption && <p className="text-white/60 text-xs text-center">{caption}</p>}
        <button onClick={onClose} aria-label="Fermer"
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}

// One image with optional numbered / circled hotspots and a legend. Tap to enlarge.
export function InlineImage({ img, onOpen }) {
  const [active, setActive] = useState(null)
  const hotspots = img.hotspots || []
  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 bg-white">
      <div className="relative cursor-zoom-in" onClick={() => onOpen(img)}>
        <img src={img.src} alt={img.caption} className="w-full object-contain bg-gray-50" style={{ maxHeight: 220, display: 'block' }} loading="lazy" />
        {hotspots.map((h, i) => (
          <div key={h.id || i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
            style={{ left: `${h.pos.x * 100}%`, top: `${h.pos.y * 100}%` }}
            onClick={e => { e.stopPropagation(); setActive(active === (h.id || i) ? null : (h.id || i)) }}>
            {h.type === 'circle' ? (
              <div className="rounded-full border-[3px] shadow-lg"
                style={{ width: `${(h.radius || 0.08) * 200}px`, height: `${(h.radius || 0.08) * 200}px`, borderColor: h.color || '#F050F8' }} />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: h.color || '#F050F8' }}>{i + 1}</div>
            )}
            {active === (h.id || i) && (
              <div className="bg-brand-navy text-white text-[11px] font-medium px-2.5 py-1.5 rounded-xl shadow-lg whitespace-nowrap max-w-[160px] text-center leading-tight">{h.label}</div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 font-medium">{img.caption}</p>
        <span className="text-[11px] font-medium text-brand-purple flex-shrink-0 ml-2">Appuyer pour agrandir</span>
      </div>
      {hotspots.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1">
          {hotspots.map((h, i) => (
            <div key={h.id || i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: h.color || '#F050F8' }}>{i + 1}</div>
              <p className="text-xs font-medium text-brand-navy">{h.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// A row of reference images shown side by side. Tap to enlarge.
export function ImageRow({ images, title = 'Images de référence' }) {
  const [lightbox, setLightbox] = useState(null)
  return (
    <>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
        <div className="flex gap-3">
          {images.map((img, i) => (
            <button key={i} onClick={() => setLightbox(img)}
              className="flex-1 rounded-2xl overflow-hidden border border-gray-200 active:border-brand-purple transition-all">
              <img src={img.src} alt={img.caption} className="w-full object-contain bg-gray-50" style={{ maxHeight: 160 }} loading="lazy" />
              <div className="px-2.5 py-2 bg-white border-t border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium leading-tight">{img.caption}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      {lightbox && <ImageLightbox src={lightbox.src} caption={lightbox.caption} onClose={() => setLightbox(null)} />}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'

// Dependency-free signature pad. onChange receives a PNG Blob, or null when cleared.
export default function SignaturePad({ label, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#100030'
  }, [])

  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function start(e) {
    e.preventDefault()
    canvasRef.current.setPointerCapture?.(e.pointerId)
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke()
  }
  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.lineTo(x, y); ctx.stroke()
  }
  function end() {
    if (!drawing.current) return
    drawing.current = false
    setEmpty(false)
    canvasRef.current.toBlob(b => onChange(b), 'image/png')
  }
  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setEmpty(true); onChange(null)
  }

  return (
    <div>
      {label && <label className="form-label">{label}<span className="text-red-400 ml-1">*</span></label>}
      <div className="relative border-2 border-gray-200 rounded-2xl overflow-hidden bg-white">
        <canvas ref={canvasRef} className="w-full block" style={{ height: 120, touchAction: 'none' }}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} />
        {empty && <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm pointer-events-none">Signer ici</p>}
        {!empty && (
          <button type="button" onClick={clear}
            className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-xs text-gray-500 shadow border border-gray-200">
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}

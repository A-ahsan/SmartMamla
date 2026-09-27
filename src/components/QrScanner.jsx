import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, ImageUp, ScanLine, Flashlight, ZoomIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { Spinner } from './ui'

/**
 * Live QR scanner that works on iPhone Safari and Android Chrome.
 *
 * - Uses the browser's native BarcodeDetector when it supports QR (Android Chrome),
 *   otherwise the `barcode-detector` ponyfill = ZXing-C++ compiled to WebAssembly
 *   (much stronger than the old JS decoder, handles small / angled / glossy codes).
 * - Each frame we try the centre of the picture first (what's inside the green corners,
 *   at full camera resolution), then every few frames the whole picture.
 * - Zoom + flashlight when the camera supports them (mostly Android).
 */

let detectorPromise = null
async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        if ('BarcodeDetector' in window) {
          const formats = (await window.BarcodeDetector.getSupportedFormats?.()) || []
          if (formats.includes('qr_code')) return new window.BarcodeDetector({ formats: ['qr_code'] })
        }
      } catch {
        /* fall through */
      }
      const { BarcodeDetector } = await import('barcode-detector/ponyfill')
      return new BarcodeDetector({ formats: ['qr_code'] })
    })()
  }
  return detectorPromise
}

export default function QrScanner({ onResult, autoStart = false }) {
  const { t } = useApp()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const loopRef = useRef(0)
  const doneRef = useRef(false)
  const fileRef = useRef(null)
  const [state, setState] = useState('idle') // idle | starting | running
  const [zoom, setZoom] = useState(null) // { min, max, step, value }
  const [torch, setTorch] = useState(null) // null = unsupported

  const track = () => streamRef.current?.getVideoTracks?.()[0]

  const stop = () => {
    cancelAnimationFrame(loopRef.current)
    loopRef.current = 0
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setZoom(null)
    setTorch(null)
    setState('idle')
  }

  const finish = (text) => {
    if (doneRef.current) return
    doneRef.current = true
    navigator.vibrate?.(60)
    stop()
    onResult(text)
  }

  const scanLoop = async () => {
    const detector = await getDetector()
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let frame = 0
    let busy = false
    let last = 0

    const tick = async (now) => {
      if (!streamRef.current || doneRef.current) return
      loopRef.current = requestAnimationFrame(tick)
      if (busy || now - last < 110 || video.readyState < 2) return
      busy = true
      last = now
      try {
        const vw = video.videoWidth
        const vh = video.videoHeight
        let codes = []
        // 1) centre crop at native resolution (≈ the area inside the viewfinder)
        const side = Math.round(Math.min(vw, vh) * 0.75)
        canvas.width = side
        canvas.height = side
        ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, side, side)
        codes = await detector.detect(canvas)
        // 2) every 3rd frame also try the full frame
        if (!codes.length && frame % 3 === 0) codes = await detector.detect(video)
        frame++
        const text = codes.find((c) => c.rawValue)?.rawValue
        if (text) finish(text)
      } catch {
        /* keep scanning */
      } finally {
        busy = false
      }
    }
    loopRef.current = requestAnimationFrame(tick)
  }

  const start = async () => {
    doneRef.current = false
    setState('starting')
    try {
      // start loading the decoder in parallel with the camera
      const detectorReady = getDetector()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      video.setAttribute('playsinline', 'true') // iOS: don't go fullscreen
      video.muted = true
      await video.play()
      await detectorReady
      setState('running')

      // Optional controls
      try {
        const tr = track()
        const caps = tr?.getCapabilities?.() || {}
        const adv = {}
        if (caps.focusMode?.includes?.('continuous')) adv.focusMode = 'continuous'
        if (caps.zoom) {
          const z = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.5))
          adv.zoom = z
          setZoom({ min: caps.zoom.min, max: Math.min(caps.zoom.max, 5), step: caps.zoom.step || 0.1, value: z })
        }
        if (Object.keys(adv).length) await tr.applyConstraints({ advanced: [adv] })
        if (caps.torch) setTorch(false)
      } catch {
        /* not supported */
      }

      scanLoop()
    } catch (e) {
      console.warn(e)
      toast.error(t('scan_error'))
      stop()
    }
  }

  const changeZoom = async (value) => {
    setZoom((z) => z && { ...z, value })
    try {
      await track()?.applyConstraints({ advanced: [{ zoom: value }] })
    } catch {
      /* ignore */
    }
  }

  const toggleTorch = async () => {
    const next = !torch
    try {
      await track()?.applyConstraints({ advanced: [{ torch: next }] })
      setTorch(next)
    } catch {
      /* ignore */
    }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    stop()
    try {
      const detector = await getDetector()
      const bitmap = await createImageBitmap(file)
      const codes = await detector.detect(bitmap)
      const text = codes.find((c) => c.rawValue)?.rawValue
      if (!text) throw new Error('none')
      doneRef.current = false
      finish(text)
    } catch {
      // last resort: the older decoder
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const s = new Html5Qrcode('qr-file')
        const text = await s.scanFile(file, false)
        s.clear()
        doneRef.current = false
        finish(text)
      } catch {
        toast.error(t('not_found'))
      }
    }
  }

  useEffect(() => {
    if (autoStart) start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const running = state === 'running'

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[28px] bg-ink-950">
        <video ref={videoRef} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${running ? '' : 'opacity-0'}`} />
        <canvas ref={canvasRef} className="hidden" />
        <div id="qr-file" className="hidden" />

        <AnimatePresence>
          {!running && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,rgba(13,174,128,.25),transparent_60%)] text-white"
            >
              <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.4, repeat: Infinity }} className="relative">
                <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-500/40" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 shadow-glow">
                  {state === 'starting' ? <Spinner size={30} /> : <ScanLine size={36} />}
                </div>
              </motion.div>
              <p className="max-w-[240px] text-center text-sm text-white/70">{t('scan_hint')}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Viewfinder */}
        <div className="pointer-events-none absolute inset-[12.5%]">
          {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl'].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-brand-400 ${c}`} />
          ))}
          {running && <span className="absolute inset-x-2 h-0.5 animate-scan-line rounded-full bg-brand-400 shadow-[0_0_20px_4px_rgba(47,203,154,.7)]" />}
        </div>
      </div>

      {running && (zoom || torch !== null) && (
        <div className="mx-auto mt-3 flex max-w-sm items-center gap-3 rounded-2xl bg-ink-100 px-4 py-2.5 dark:bg-white/5">
          {zoom && (
            <>
              <ZoomIn size={18} className="shrink-0 text-ink-500" />
              <input
                type="range"
                min={zoom.min}
                max={zoom.max}
                step={zoom.step}
                value={zoom.value}
                onChange={(e) => changeZoom(Number(e.target.value))}
                className="h-2 flex-1 accent-brand-600"
                aria-label="Zoom"
              />
            </>
          )}
          {torch !== null && (
            <button
              onClick={toggleTorch}
              aria-label="Flashlight"
              className={`ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${torch ? 'bg-amber-400 text-amber-950' : 'bg-white text-ink-600 dark:bg-white/10 dark:text-ink-200'}`}
            >
              <Flashlight size={17} />
            </button>
          )}
        </div>
      )}

      <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-3">
        {running ? (
          <button onClick={stop} className="btn-ghost">
            <CameraOff size={18} /> {t('scan_stop')}
          </button>
        ) : (
          <button onClick={start} disabled={state === 'starting'} className="btn-primary">
            <Camera size={18} /> {t('scan_start')}
          </button>
        )}
        <button onClick={() => fileRef.current?.click()} className="btn-ghost">
          <ImageUp size={18} /> {t('scan_upload')}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  )
}

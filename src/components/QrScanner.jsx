import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, ImageUp, ScanLine } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApp } from '../contexts/AppContext'
import { Spinner } from './ui'

/**
 * Camera QR scanner with a custom animated viewfinder.
 * Calls onResult(text) once per successful scan and stops the camera.
 */
export default function QrScanner({ onResult, autoStart = false }) {
  const { t } = useApp()
  const scannerRef = useRef(null)
  const doneRef = useRef(false)
  const fileRef = useRef(null)
  const [state, setState] = useState('idle') // idle | starting | running

  const stop = async () => {
    const s = scannerRef.current
    scannerRef.current = null
    if (s) {
      try {
        if (s.isScanning) await s.stop()
        s.clear()
      } catch {
        /* already stopped */
      }
    }
    setState('idle')
  }

  const handle = async (text) => {
    if (doneRef.current) return
    doneRef.current = true
    navigator.vibrate?.(60)
    await stop()
    onResult(text)
  }

  const start = async () => {
    doneRef.current = false
    setState('starting')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const s = new Html5Qrcode('qr-reader', { verbose: false })
      scannerRef.current = s
      await s.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.72, height: Math.min(w, h) * 0.72 }), aspectRatio: 1 },
        handle,
        () => {}
      )
      setState('running')
    } catch (e) {
      console.warn(e)
      toast.error(t('scan_error'))
      await stop()
    }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      await stop()
      const { Html5Qrcode } = await import('html5-qrcode')
      const s = new Html5Qrcode('qr-file')
      const text = await s.scanFile(file, false)
      s.clear()
      doneRef.current = false
      handle(text)
    } catch {
      toast.error(t('not_found'))
    }
  }

  useEffect(() => {
    if (autoStart) start()
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const running = state === 'running'

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[28px] bg-ink-950">
        <div id="qr-reader" className="absolute inset-0 [&>div]:!hidden [&_img]:hidden" />
        <div id="qr-file" className="hidden" />

        {/* Idle illustration */}
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
        <div className="pointer-events-none absolute inset-[14%]">
          {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl'].map((c) => (
            <span key={c} className={`absolute h-10 w-10 border-brand-400 ${c}`} />
          ))}
          {running && <span className="absolute inset-x-2 h-0.5 animate-scan-line rounded-full bg-brand-400 shadow-[0_0_20px_4px_rgba(47,203,154,.7)]" />}
        </div>
      </div>

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

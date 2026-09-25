import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/** Bottom sheet on phones, centred dialog on larger screens. Drag down to dismiss on mobile. */
export default function Sheet({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose?.()}
            className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-white shadow-lift dark:bg-ink-900 sm:rounded-[28px] ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink-200 dark:bg-white/15 sm:hidden" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3 sm:px-6 sm:pt-5">
              <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-4 sm:px-6" onPointerDown={(e) => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div onPointerDown={(e) => e.stopPropagation()} className="pb-safe border-t border-ink-100 px-5 pt-3 dark:border-white/5 sm:px-6 sm:pb-5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

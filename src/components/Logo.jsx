import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'

/** Uses the project logo in public/brta.png */
export function LogoMark({ size = 36 }) {
  return (
    <motion.img
      src="/brta.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-white object-contain p-0.5 shadow-sm"
      style={{ width: size, height: size }}
      initial={{ rotate: -20, scale: 0.8, opacity: 0 }}
      animate={{ rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    />
  )
}

export default function Logo({ size = 36, subtitle = false, light = false, compact = false }) {
  const { t, lang } = useApp()
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className={`leading-tight ${compact ? 'hidden min-[390px]:block' : ''}`}>
        <div className={`font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink-900 dark:text-white'} ${lang === 'bn' ? 'text-lg' : 'text-[17px]'}`}>
          {t('appName')}
        </div>
        {subtitle && <div className={`text-[11px] font-medium ${light ? 'text-white/70' : 'text-ink-500'}`}>{t('appTagline')}</div>}
      </div>
    </div>
  )
}

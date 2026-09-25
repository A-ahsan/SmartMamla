import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { num } from '../lib/format'

export default function NotFound() {
  const { t, lang } = useApp()
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }} className="bg-gradient-to-br from-brand-500 to-brand-800 bg-clip-text text-8xl font-extrabold text-transparent">
        {num(404, lang)}
      </motion.div>
      <p className="mt-2 text-lg font-bold">{t('notfound_title')}</p>
      <Link to="/" className="btn-primary mt-6">
        {t('back_home')}
      </Link>
    </div>
  )
}

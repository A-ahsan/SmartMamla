import { motion } from 'framer-motion'
import { IdCard, Car } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { Page, PageHeader, Skeleton, EmptyState } from '../../components/ui'
import LicenseCard from '../../components/LicenseCard'
import VehicleCard from '../../components/VehicleCard'
import { useCitizen } from './CitizenData'
import { date } from '../../lib/format'

export default function Documents() {
  const { t, lang } = useApp()
  const { record } = useCitizen()

  if (!record)
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="aspect-[1.586]" />
        <Skeleton className="h-56" />
      </div>
    )

  const l = record.licenses[0]

  return (
    <Page>
      <PageHeader title={t('c_documents')} />
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <IdCard size={18} /> {t('licence')}
          </h2>
          {l ? (
            <>
              <LicenseCard license={l} name={lang === 'bn' ? l.full_name_bn : l.full_name} />
              <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card mt-4 grid grid-cols-2 gap-4 p-5 text-sm">
                {[
                  [t('dob'), date(l.date_of_birth, lang)],
                  [t('blood'), l.blood_group],
                  [t('issued'), date(l.issue_date, lang)],
                  [t('valid_till'), date(l.expiry_date, lang)],
                  [t('class'), lang === 'bn' ? l.license_class_bn || l.license_class : l.license_class],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-ink-500">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </motion.dl>
            </>
          ) : (
            <EmptyState icon={IdCard} title={lang === 'bn' ? 'কোনো লাইসেন্স নেই' : 'No licence linked'} />
          )}
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <Car size={18} /> {t('vehicles')}
          </h2>
          <div className="space-y-4">
            {record.vehicles.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} />
            ))}
            {!record.vehicles.length && <EmptyState icon={Car} title={lang === 'bn' ? 'কোনো গাড়ি নেই' : 'No vehicles registered'} />}
          </div>
        </section>
      </div>
    </Page>
  )
}

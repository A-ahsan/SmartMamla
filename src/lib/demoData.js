// Sample data used in DEMO MODE (no Supabase keys). Mirrors the Supabase schema in supabase/schema.sql.

export const VIOLATION_TYPES = [
  { code: 'SIGNAL', name_en: 'Signal violation', name_bn: 'সিগন্যাল অমান্য', fine: 1500, severity: 'moderate', points: 2 },
  { code: 'OVERSPEED', name_en: 'Over speeding', name_bn: 'অতিরিক্ত গতি', fine: 2000, severity: 'moderate', points: 2 },
  { code: 'NO_HELMET', name_en: 'Riding without helmet', name_bn: 'হেলমেট ছাড়া চালানো', fine: 500, severity: 'minor', points: 1 },
  { code: 'NO_SEATBELT', name_en: 'No seatbelt', name_bn: 'সিটবেল্ট না পরা', fine: 500, severity: 'minor', points: 1 },
  { code: 'MOBILE_USE', name_en: 'Phone use while driving', name_bn: 'চালানোর সময় মোবাইল ব্যবহার', fine: 1000, severity: 'moderate', points: 1 },
  { code: 'WRONG_SIDE', name_en: 'Wrong-side driving', name_bn: 'উল্টো পথে চালানো', fine: 3000, severity: 'severe', points: 3 },
  { code: 'NO_PARKING', name_en: 'Illegal parking', name_bn: 'অবৈধ পার্কিং', fine: 1000, severity: 'minor', points: 1 },
  { code: 'NO_LICENSE', name_en: 'Driving without licence', name_bn: 'লাইসেন্স ছাড়া চালানো', fine: 5000, severity: 'severe', points: 4 },
  { code: 'EXPIRED_DOCS', name_en: 'Expired tax token / fitness', name_bn: 'মেয়াদোত্তীর্ণ ট্যাক্স টোকেন / ফিটনেস', fine: 3000, severity: 'severe', points: 2 },
  { code: 'OVERLOAD', name_en: 'Overloading', name_bn: 'অতিরিক্ত যাত্রী/মাল বহন', fine: 2500, severity: 'moderate', points: 2 },
  { code: 'RASH_DRIVE', name_en: 'Rash & negligent driving', name_bn: 'বেপরোয়া গাড়ি চালানো', fine: 5000, severity: 'severe', points: 4 },
  { code: 'DRUNK_DRIVE', name_en: 'Drunk driving', name_bn: 'মাদকাসক্ত অবস্থায় চালানো', fine: 10000, severity: 'critical', points: 6 },
  { code: 'HORN', name_en: 'Hydraulic horn / excess noise', name_bn: 'হাইড্রোলিক হর্ন / অতিরিক্ত শব্দ', fine: 1000, severity: 'minor', points: 1 },
  { code: 'POLLUTION', name_en: 'Excess smoke emission', name_bn: 'অতিরিক্ত কালো ধোঁয়া', fine: 1500, severity: 'moderate', points: 1 },
]

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString()
const daysAhead = (n) => new Date(Date.now() + n * 864e5).toISOString()

export const DEMO_USERS = [
  {
    id: 'u-citizen-1',
    email: 'citizen@demo.bd',
    password: 'demo1234',
    role: 'citizen',
    full_name: 'Rafiqul Islam',
    full_name_bn: 'রফিকুল ইসলাম',
    phone: '01711-000111',
    nid: '1995 2690 1234',
  },
  {
    id: 'u-citizen-2',
    email: 'nusrat@demo.bd',
    password: 'demo1234',
    role: 'citizen',
    full_name: 'Nusrat Jahan',
    full_name_bn: 'নুসরাত জাহান',
    phone: '01822-000222',
    nid: '1998 2690 5678',
  },
  {
    id: 'u-police-1',
    email: 'police@demo.bd',
    password: 'demo1234',
    role: 'police',
    full_name: 'SI Mahmudul Hasan',
    full_name_bn: 'এসআই মাহমুদুল হাসান',
    badge_number: 'DMP-TR-4521',
    rank: 'Sub-Inspector (Traffic)',
    rank_bn: 'উপ-পরিদর্শক (ট্রাফিক)',
    station: 'Tejgaon Traffic Division',
    station_bn: 'তেজগাঁও ট্রাফিক বিভাগ',
    phone: '01320-000333',
    area: 'Tejgaon, Farmgate',
    sms_alerts: true,
  },
]

export const DEMO_LICENSES = [
  {
    id: 'l-1',
    user_id: 'u-citizen-1',
    license_number: 'DK0123456789',
    full_name: 'Rafiqul Islam',
    full_name_bn: 'রফিকুল ইসলাম',
    date_of_birth: '1995-03-14',
    blood_group: 'B+',
    license_class: 'Light + Motorcycle',
    license_class_bn: 'হালকা + মোটরসাইকেল',
    issue_date: '2021-06-02',
    expiry_date: '2031-06-01',
    status: 'active',
    address: 'House 12, Road 4, Mirpur 10, Dhaka',
  },
  {
    id: 'l-2',
    user_id: 'u-citizen-2',
    license_number: 'CT0987654321',
    full_name: 'Nusrat Jahan',
    full_name_bn: 'নুসরাত জাহান',
    date_of_birth: '1998-11-02',
    blood_group: 'O+',
    license_class: 'Light',
    license_class_bn: 'হালকা',
    issue_date: '2022-01-20',
    expiry_date: '2032-01-19',
    status: 'active',
    address: 'Agrabad C/A, Chattogram',
  },
]

export const DEMO_VEHICLES = [
  {
    id: 'v-1',
    owner_id: 'u-citizen-1',
    registration_number: 'DHAKA METRO-GA-12-3456',
    registration_number_bn: 'ঢাকা মেট্রো-গ-১২-৩৪৫৬',
    vehicle_type: 'car',
    make: 'Toyota',
    model: 'Axio 2018',
    color: 'Pearl White',
    chassis_number: 'NZE161-7054321',
    engine_number: '1NZ-J98765',
    registration_date: '2019-02-11',
    tax_token_expiry: daysAhead(120).slice(0, 10),
    fitness_expiry: daysAgo(12).slice(0, 10),
  },
  {
    id: 'v-2',
    owner_id: 'u-citizen-1',
    registration_number: 'DHAKA METRO-HA-45-6789',
    registration_number_bn: 'ঢাকা মেট্রো-হ-৪৫-৬৭৮৯',
    vehicle_type: 'motorcycle',
    make: 'Yamaha',
    model: 'FZS V3',
    color: 'Matte Blue',
    chassis_number: 'ME1RG0716K0012345',
    engine_number: 'G3E4E-123456',
    registration_date: '2021-08-30',
    tax_token_expiry: daysAhead(300).slice(0, 10),
    fitness_expiry: null,
  },
  {
    id: 'v-3',
    owner_id: 'u-citizen-2',
    registration_number: 'CHATTA METRO-GA-11-2233',
    registration_number_bn: 'চট্ট মেট্রো-গ-১১-২২৩৩',
    vehicle_type: 'car',
    make: 'Honda',
    model: 'Vezel 2020',
    color: 'Crystal Black',
    chassis_number: 'RU3-1345678',
    engine_number: 'LEB-7654321',
    registration_date: '2021-03-05',
    tax_token_expiry: daysAhead(40).slice(0, 10),
    fitness_expiry: daysAhead(200).slice(0, 10),
  },
]

const vt = (code) => VIOLATION_TYPES.find((v) => v.code === code)
const mk = (i, user, vehicle, license, code, ago, status, location, location_bn) => {
  const v = vt(code)
  return {
    id: `c-${i}`,
    case_number: `SM-2026-${String(104200 + i).padStart(6, '0')}`,
    user_id: user,
    vehicle_id: vehicle,
    license_id: license,
    officer_id: 'u-police-1',
    officer_name: 'SI Mahmudul Hasan',
    officer_badge: 'DMP-TR-4521',
    violation_code: code,
    violation_en: v.name_en,
    violation_bn: v.name_bn,
    severity: v.severity,
    fine_amount: v.fine,
    location,
    location_bn,
    notes: '',
    status,
    created_at: daysAgo(ago),
    due_date: new Date(Date.now() - ago * 864e5 + 30 * 864e5).toISOString(),
    paid_at: status === 'paid' ? daysAgo(Math.max(ago - 3, 0)) : null,
    transaction_id: status === 'paid' ? `SMTX${1700 + i}` : null,
  }
}

export const DEMO_CASES = [
  mk(1, 'u-citizen-1', 'v-1', 'l-1', 'SIGNAL', 4, 'unpaid', 'Farmgate, Dhaka', 'ফার্মগেট, ঢাকা'),
  mk(2, 'u-citizen-1', 'v-2', 'l-1', 'NO_HELMET', 11, 'unpaid', 'Mirpur 10 Circle, Dhaka', 'মিরপুর ১০ গোলচত্বর, ঢাকা'),
  mk(3, 'u-citizen-1', 'v-1', 'l-1', 'EXPIRED_DOCS', 42, 'unpaid', 'Bijoy Sarani, Dhaka', 'বিজয় সরণি, ঢাকা'),
  mk(4, 'u-citizen-1', 'v-1', 'l-1', 'NO_PARKING', 75, 'paid', 'Gulshan 2, Dhaka', 'গুলশান ২, ঢাকা'),
  mk(5, 'u-citizen-1', 'v-2', 'l-1', 'OVERSPEED', 130, 'paid', 'Hatirjheel, Dhaka', 'হাতিরঝিল, ঢাকা'),
  mk(6, 'u-citizen-2', 'v-3', 'l-2', 'MOBILE_USE', 20, 'paid', 'GEC Circle, Chattogram', 'জিইসি মোড়, চট্টগ্রাম'),
]

export const DEMO_PAYMENTS = [
  { id: 'p-1', tran_id: 'SMTX1704', user_id: 'u-citizen-1', case_ids: ['c-4'], amount: 1000, status: 'success', method: 'bKash', created_at: daysAgo(72) },
  { id: 'p-2', tran_id: 'SMTX1705', user_id: 'u-citizen-1', case_ids: ['c-5'], amount: 2000, status: 'success', method: 'VISA', created_at: daysAgo(127) },
  { id: 'p-3', tran_id: 'SMTX1706', user_id: 'u-citizen-2', case_ids: ['c-6'], amount: 1000, status: 'success', method: 'Nagad', created_at: daysAgo(17) },
]

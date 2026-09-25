-- ════════════════════════════════════════════════════════════════
--  SmartMamla — seed data. Run after schema.sql.
--  Fine amounts are sample values — adjust to the current official schedule.
-- ════════════════════════════════════════════════════════════════

insert into public.violation_types (code, name_en, name_bn, fine, severity, points) values
  ('SIGNAL',       'Signal violation',              'সিগন্যাল অমান্য',                    1500,  'moderate', 2),
  ('OVERSPEED',    'Over speeding',                 'অতিরিক্ত গতি',                       2000,  'moderate', 2),
  ('NO_HELMET',    'Riding without helmet',         'হেলমেট ছাড়া চালানো',                 500,   'minor',    1),
  ('NO_SEATBELT',  'No seatbelt',                   'সিটবেল্ট না পরা',                     500,   'minor',    1),
  ('MOBILE_USE',   'Phone use while driving',       'চালানোর সময় মোবাইল ব্যবহার',          1000,  'moderate', 1),
  ('WRONG_SIDE',   'Wrong-side driving',            'উল্টো পথে চালানো',                    3000,  'severe',   3),
  ('NO_PARKING',   'Illegal parking',               'অবৈধ পার্কিং',                        1000,  'minor',    1),
  ('NO_LICENSE',   'Driving without licence',       'লাইসেন্স ছাড়া চালানো',                5000,  'severe',   4),
  ('EXPIRED_DOCS', 'Expired tax token / fitness',   'মেয়াদোত্তীর্ণ ট্যাক্স টোকেন / ফিটনেস', 3000,  'severe',   2),
  ('OVERLOAD',     'Overloading',                   'অতিরিক্ত যাত্রী/মাল বহন',             2500,  'moderate', 2),
  ('RASH_DRIVE',   'Rash & negligent driving',      'বেপরোয়া গাড়ি চালানো',                5000,  'severe',   4),
  ('DRUNK_DRIVE',  'Drunk driving',                 'মাদকাসক্ত অবস্থায় চালানো',            10000, 'critical', 6),
  ('HORN',         'Hydraulic horn / excess noise', 'হাইড্রোলিক হর্ন / অতিরিক্ত শব্দ',     1000,  'minor',    1),
  ('POLLUTION',    'Excess smoke emission',         'অতিরিক্ত কালো ধোঁয়া',                 1500,  'moderate', 1)
on conflict (code) do update
  set name_en = excluded.name_en, name_bn = excluded.name_bn, fine = excluded.fine,
      severity = excluded.severity, points = excluded.points;


-- ────────────────────────────────────────────────────────────────
--  OPTIONAL demo records
--  1. In Supabase → Authentication → Users, create:
--       citizen@demo.bd  /  demo1234
--       police@demo.bd   /  demo1234
--  2. Run the block below.
-- ────────────────────────────────────────────────────────────────

-- Promote the police account
update public.profiles set
  role = 'police',
  full_name = 'SI Mahmudul Hasan',
  full_name_bn = 'এসআই মাহমুদুল হাসান',
  badge_number = 'DMP-TR-4521',
  rank = 'Sub-Inspector (Traffic)',
  rank_bn = 'উপ-পরিদর্শক (ট্রাফিক)',
  station = 'Tejgaon Traffic Division',
  station_bn = 'তেজগাঁও ট্রাফিক বিভাগ'
where email = 'police@demo.bd';

-- Citizen profile + licence + vehicles
update public.profiles set full_name = 'Rafiqul Islam', full_name_bn = 'রফিকুল ইসলাম', phone = '01711-000111'
where email = 'citizen@demo.bd';

insert into public.driving_licenses (user_id, license_number, full_name, full_name_bn, date_of_birth, blood_group, license_class, license_class_bn, issue_date, expiry_date, address)
select id, 'DK0123456789', 'Rafiqul Islam', 'রফিকুল ইসলাম', '1995-03-14', 'B+', 'Light + Motorcycle', 'হালকা + মোটরসাইকেল', '2021-06-02', '2031-06-01', 'Mirpur 10, Dhaka'
from public.profiles where email = 'citizen@demo.bd'
on conflict (license_number) do nothing;

insert into public.vehicles (owner_id, registration_number, registration_number_bn, vehicle_type, make, model, color, chassis_number, engine_number, registration_date, tax_token_expiry, fitness_expiry)
select id, 'DHAKA METRO-GA-12-3456', 'ঢাকা মেট্রো-গ-১২-৩৪৫৬', 'car', 'Toyota', 'Axio 2018', 'Pearl White', 'NZE161-7054321', '1NZ-J98765', '2019-02-11', current_date + 120, current_date - 12
from public.profiles where email = 'citizen@demo.bd'
on conflict (registration_number) do nothing;

insert into public.vehicles (owner_id, registration_number, registration_number_bn, vehicle_type, make, model, color, chassis_number, engine_number, registration_date, tax_token_expiry)
select id, 'DHAKA METRO-HA-45-6789', 'ঢাকা মেট্রো-হ-৪৫-৬৭৮৯', 'motorcycle', 'Yamaha', 'FZS V3', 'Matte Blue', 'ME1RG0716K0012345', 'G3E4E-123456', '2021-08-30', current_date + 300
from public.profiles where email = 'citizen@demo.bd'
on conflict (registration_number) do nothing;

-- ────────────────────────────────────────────────────────────────
--  To make any real account a police officer:
--  update public.profiles set role = 'police', badge_number = 'XXX-000', rank = '…', station = '…'
--  where email = 'officer@example.com';
-- ────────────────────────────────────────────────────────────────

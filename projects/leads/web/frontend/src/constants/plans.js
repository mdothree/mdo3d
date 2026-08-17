export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    leads: '100 leads',
    runs: '1 run / day',
    reports: 'Weekly reports',
    extras: ['Email delivery', 'CSV export', 'Basic filters'],
    stripePriceId: 'price_1TbTQNCRLa19N9qBa7wk8c3j',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    leads: '2,000 leads',
    runs: 'Unlimited runs',
    reports: 'Daily reports',
    extras: ['All entity types', 'Keyword filters', 'Priority support'],
    popular: true,
    stripePriceId: 'price_1TbTQNCRLa19N9qBezJO7C2P',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 249,
    leads: 'Unlimited leads',
    runs: 'Unlimited runs',
    reports: 'Real-time alerts',
    extras: ['Custom integrations', 'Dedicated support', 'SLA guarantee'],
    stripePriceId: 'price_1TbTQOCRLa19N9qBpRYvkhZC',
  },
];

export const ENTITY_TYPES = [
  'Commercial Companies',
  'Government Agencies',
  'Defense Contractors',
  'Startups & SMBs',
  'Universities & Labs',
  'National Laboratories',
  'Prime Contractors',
  'Research Institutions',
];

export const CADENCE_OPTS = [
  { val: 'realtime', label: 'Real-time',      sub: 'As leads are enriched'       },
  { val: 'daily',    label: 'Daily Digest',   sub: 'Every day at 6:00 AM'        },
  { val: 'twice',    label: 'Twice Weekly',   sub: 'Monday & Thursday mornings'  },
  { val: 'weekly',   label: 'Weekly Roundup', sub: 'Monday at 8:00 AM'           },
  { val: 'monthly',  label: 'Monthly',        sub: '1st of each month'           },
];

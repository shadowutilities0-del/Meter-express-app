// Shared sample data for the staff portal. Replace `applications` with a real
// API/fetch call once a backend exists — every staff page currently imports
// from this module rather than talking to storage directly.

export const statusStyles = {
  'Application Review': 'bg-[#FBEBC7] text-[#8A6D1F]',
  'Site Survey': 'bg-[#DCE6F5] text-[#2C5A9A]',
  'Quote Preparation': 'bg-[#DCE6F5] text-[#2C5A9A]',
  'Quote Issued': 'bg-[#F3E3D5] text-[#B5651D]',
  'Awaiting Payment': 'bg-[#FBEBC7] text-[#8A6D1F]',
  Scheduled: 'bg-[#DCE6F5] text-[#2C5A9A]',
  Completed: 'bg-[#E4EAE1] text-[#4B5D45]',
  'On Hold': 'bg-red-50 text-red-600',
  Rejected: 'bg-red-50 text-red-600',
};

export const applications = [
  {
    ref: 'APP-1042',
    type: 'New Connection',
    utility: 'Gas',
    applicantName: 'Isha Sharma',
    applicantEmail: 'isha123@gmail.com',
    property: '77A Central Avenue',
    postcode: 'EN1 3QF',
    submittedDate: '2026-08-02',
    status: 'Application Review',
    notes: 1,
  },
  {
    ref: 'APP-1038',
    type: 'Alteration',
    utility: 'Water',
    applicantName: 'Marcus Webb',
    applicantEmail: 'marcus.webb@buildco.com',
    property: '103-105 Pinner Road',
    postcode: 'HA1 4EU',
    submittedDate: '2026-07-28',
    status: 'Site Survey',
    notes: 0,
  },
  {
    ref: 'APP-1035',
    type: 'New Connection',
    utility: 'Electric',
    applicantName: 'Priya Anand',
    applicantEmail: 'priya.anand@example.com',
    property: 'Ground Floor East, 2 Lupus Street',
    postcode: 'SW1V 3DY',
    submittedDate: '2026-07-20',
    status: 'Quote Issued',
    notes: 2,
    quote: {
      version: 1,
      total: 4280.5,
      validUntil: '2026-09-20',
      items: [
        { label: 'New service connection', amount: 3200 },
        { label: 'Excavation & reinstatement', amount: 950 },
        { label: 'Admin fee', amount: 180.5 },
        { label: 'Loyalty discount', amount: -50 },
      ],
    },
  },
  {
    ref: 'APP-1030',
    type: 'Disconnection',
    utility: 'Gas',
    applicantName: 'Shadow Utilities',
    applicantEmail: 'shadowutilities0@gmail.com',
    property: 'Third Floor Flat, 2 Lupus Street',
    postcode: 'SW1V 3DY',
    submittedDate: '2026-07-10',
    status: 'Completed',
    notes: 1,
  },
  {
    ref: 'APP-1021',
    type: 'New Connection',
    utility: 'Drainage',
    applicantName: 'Tom Ellery',
    applicantEmail: 'tom.ellery@example.com',
    property: '14 Foxglove Way',
    postcode: 'RG21 7LT',
    submittedDate: '2026-06-18',
    status: 'Completed',
    notes: 0,
  },
];

/* ---------------------------------------------------------------- */
/* Progress tracker helper, used by StaffApplicationView             */
/* ---------------------------------------------------------------- */

const PROGRESS_STEPS = [
  { key: 'received', label: 'Application Received' },
  { key: 'review', label: 'Application Review' },
  { key: 'survey', label: 'Site Survey' },
  { key: 'quote', label: 'Quote' },
  { key: 'works', label: 'Works Scheduled' },
  { key: 'completed', label: 'Completed' },
];

const QUOTE_SUB_STEPS = [
  { key: 'preparing', label: 'Preparing quote' },
  { key: 'issued', label: 'Quote issued' },
  { key: 'accepted', label: 'Quote accepted' },
];

const STATUS_PERCENT = {
  'Application Review': 20,
  'Site Survey': 35,
  'Quote Preparation': 50,
  'Quote Issued': 65,
  'Awaiting Payment': 75,
  Scheduled: 85,
  Completed: 100,
  'On Hold': 40,
  Rejected: 100,
};

/**
 * Returns the progress-tracker shape consumed by StaffApplicationView:
 * { percent, steps, quoteStepPercent, quoteSubSteps }
 */
export function getProgress(status) {
  return {
    percent: STATUS_PERCENT[status] ?? 10,
    steps: PROGRESS_STEPS,
    quoteStepPercent: status === 'Quote Issued' ? 65 : 40,
    quoteSubSteps: QUOTE_SUB_STEPS,
  };
}
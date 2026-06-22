import Dexie from 'dexie';

export const db = new Dexie('AetherDB_Intervals');

// Declare schemas
db.version(1).stores({
  days: 'date, dayIndex',
  nonNegotiables: 'id, name',
  settings: 'key'
});

// Helper to format Date safe from timezone offsets
export function getFormattedDate(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Generate the 21 dates in the challenge
export function generateChallengeDates() {
  const dates = [];
  // Start: June 13, 2026
  // End: July 3, 2026
  for (let i = 0; i < 21; i++) {
    const d = new Date(2026, 5, 13); // 5 = June
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    dates.push({
      dateStr: getFormattedDate(year, month, day),
      dayIndex: i + 1,
      label: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' })
    });
  }
  return dates;
}

// Seed Database with Initial 30 days and default non-negotiables
export async function seedDatabase() {
  const dayCount = await db.days.count();
  if (dayCount > 0) return; // Already seeded

  console.log("Seeding database with 30-day challenge...");

  // 1. Seed global non-negotiables (user's daily essentials)
  const defaultNonNegotiables = [
    { id: 'nn-seo', name: 'SEO', order: 0 },
    { id: 'nn-quran', name: 'Quran', order: 1 },
    { id: 'nn-arabic', name: 'Arabic', order: 2 },
    { id: 'nn-exercise', name: 'Exercise', order: 3 },
    { id: 'nn-mbbs', name: 'Extraordinary in MBBS', order: 4 },
    { id: 'nn-communication', name: 'Communication', order: 5 },
    { id: 'nn-social', name: 'Quit Social media', order: 6 },
    { id: 'nn-phone', name: 'Quit Mobile Phone', order: 7 },
    { id: 'nn-read', name: 'Read Book about 10 mins daily', order: 8 },
    { id: 'nn-schedule', name: 'Make and report daily schedule', order: 9 }
  ];
  await db.nonNegotiables.bulkAdd(defaultNonNegotiables);

  // 2. Generate 30 challenge days
  const challengeDates = generateChallengeDates();
  const daysToSeed = challengeDates.map((d) => {
    return {
      date: d.dateStr,
      dayIndex: d.dayIndex,
      label: d.label,
      weekday: d.weekday,
      schedule: [], // Clean empty schedule array to prevent ghost tasks
      nonNegotiables: {}, // stores { [id]: 'done' | 'not_done' | 'partial' | 'pending' }
      satisfaction: { score: 5, successText: '', improvementText: '' },
      finance: { revenue: 0, expenses: 0, savings: 0 },
      notes: ''
    };
  });

  await db.days.bulkAdd(daysToSeed);

  // 3. Set default settings
  await db.settings.put({ key: 'theme', value: 'dark' });
  await db.settings.put({ key: 'current_view', value: 'dashboard' });
  await db.settings.put({
    key: 'time_intervals',
    value: [
      '04:30 AM - 05:30 AM',
      '05:30 AM - 06:30 AM',
      '06:30 AM - 07:30 AM',
      '07:30 AM - 08:30 AM',
      '08:30 AM - 09:30 AM',
      '09:30 AM - 10:30 AM',
      '10:30 AM - 11:30 AM',
      '11:30 AM - 12:30 PM',
      '01:30 PM - 02:30 PM',
      '02:30 PM - 03:30 PM',
      '03:30 PM - 04:30 PM',
      '04:30 PM - 05:30 PM',
      '06:00 PM - 07:00 PM',
      '07:30 PM - 09:00 PM',
      '09:30 PM - 10:30 PM'
    ]
  });

  console.log("Database seeded successfully!");
}

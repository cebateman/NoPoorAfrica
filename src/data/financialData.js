// Financial data for No Poor Africa
// All amounts in USD unless noted otherwise
// Mozambique amounts converted from MZN at approximate rate

export const FISCAL_YEAR = 2026;
export const CURRENCY = { US: 'USD', MZ: 'MZN' };
export const MZN_TO_USD = 0.016; // approximate exchange rate

// Monthly labels
export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Current month index (0-based) — through January means index 0 is the last completed month
export const CURRENT_MONTH_INDEX = 0; // January 2026 completed

// ──────────────────────────────────────────────
// US Operations
// ──────────────────────────────────────────────
export const usCategories = [
  {
    id: 'fundraising',
    name: 'Fundraising & Development',
    budgetAnnual: 85000,
    budgetMonthly: [7000, 7000, 7500, 7000, 7000, 7500, 7000, 7000, 7500, 7000, 7000, 7500],
    actualMonthly: [6800],
    priorYearMonthly: [6200, 6500, 7100, 6400, 6800, 7200, 6600, 6900, 7400, 6500, 6700, 7100],
  },
  {
    id: 'admin',
    name: 'Administration & Overhead',
    budgetAnnual: 62000,
    budgetMonthly: [5200, 5200, 5200, 5200, 5200, 5000, 5000, 5200, 5200, 5200, 5200, 5000],
    actualMonthly: [5400],
    priorYearMonthly: [4800, 4900, 5000, 4900, 5100, 4800, 4700, 5000, 5100, 4900, 5000, 4800],
  },
  {
    id: 'transfers',
    name: 'Program Transfers to Mozambique',
    budgetAnnual: 320000,
    budgetMonthly: [25000, 25000, 28000, 25000, 25000, 28000, 27000, 27000, 28000, 27000, 27000, 28000],
    actualMonthly: [26500],
    priorYearMonthly: [22000, 22000, 24000, 23000, 23000, 25000, 24000, 24000, 26000, 25000, 25000, 27000],
  },
  {
    id: 'communications',
    name: 'Communications & Marketing',
    budgetAnnual: 28000,
    budgetMonthly: [2500, 2500, 2500, 2000, 2000, 2000, 2500, 2500, 2500, 2000, 2500, 2500],
    actualMonthly: [2300],
    priorYearMonthly: [2000, 2100, 2200, 1800, 1900, 2000, 2100, 2200, 2300, 1900, 2100, 2200],
  },
  {
    id: 'travel',
    name: 'Travel & Field Visits',
    budgetAnnual: 18000,
    budgetMonthly: [1000, 1000, 2000, 1500, 1500, 2000, 1500, 1500, 2000, 1500, 1500, 1500],
    actualMonthly: [800],
    priorYearMonthly: [900, 1100, 1800, 1400, 1200, 1900, 1300, 1400, 1700, 1200, 1400, 1500],
  },
];

export const usRevenue = [
  {
    id: 'individual_donations',
    name: 'Individual Donations',
    budgetAnnual: 280000,
    budgetMonthly: [20000, 20000, 25000, 22000, 22000, 25000, 23000, 23000, 25000, 23000, 25000, 27000],
    actualMonthly: [21500],
    priorYearMonthly: [18000, 18500, 22000, 19000, 20000, 22000, 20000, 21000, 23000, 20000, 22000, 24000],
  },
  {
    id: 'grants',
    name: 'Grants & Foundations',
    budgetAnnual: 180000,
    budgetMonthly: [15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000],
    actualMonthly: [15000],
    priorYearMonthly: [12000, 12000, 14000, 13000, 13000, 14000, 13000, 14000, 14000, 13000, 14000, 14000],
  },
  {
    id: 'corporate',
    name: 'Corporate Partnerships',
    budgetAnnual: 45000,
    budgetMonthly: [3500, 3500, 4000, 3500, 3500, 4000, 4000, 4000, 4000, 3500, 3500, 4000],
    actualMonthly: [4200],
    priorYearMonthly: [3000, 3000, 3500, 3200, 3000, 3500, 3200, 3500, 3500, 3000, 3200, 3500],
  },
  {
    id: 'events',
    name: 'Fundraising Events',
    budgetAnnual: 30000,
    budgetMonthly: [0, 0, 5000, 0, 0, 10000, 0, 0, 5000, 0, 0, 10000],
    actualMonthly: [0],
    priorYearMonthly: [0, 0, 4500, 0, 0, 8000, 0, 0, 4800, 0, 0, 9000],
  },
];

// ──────────────────────────────────────────────
// Mozambique Operations (amounts in USD)
// ──────────────────────────────────────────────
export const mzCategories = [
  {
    id: 'education',
    name: 'Education Programs',
    budgetAnnual: 120000,
    budgetMonthly: [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
    actualMonthly: [9800],
    priorYearMonthly: [8500, 8800, 9000, 8700, 9000, 9200, 8800, 9100, 9500, 8900, 9200, 9400],
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Nutrition',
    budgetAnnual: 95000,
    budgetMonthly: [8000, 8000, 8000, 8000, 8000, 7500, 7500, 8000, 8000, 8000, 8000, 8000],
    actualMonthly: [8200],
    priorYearMonthly: [7000, 7200, 7500, 7100, 7300, 7000, 7000, 7200, 7500, 7100, 7300, 7500],
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Livelihoods',
    budgetAnnual: 55000,
    budgetMonthly: [4500, 4500, 5000, 4500, 4500, 5000, 4500, 4500, 5000, 4500, 4500, 4500],
    actualMonthly: [4700],
    priorYearMonthly: [3800, 4000, 4200, 3900, 4100, 4300, 4000, 4100, 4500, 4000, 4200, 4300],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure & Facilities',
    budgetAnnual: 40000,
    budgetMonthly: [3000, 3000, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3000, 3500, 3500],
    actualMonthly: [3200],
    priorYearMonthly: [2500, 2800, 3000, 2800, 3000, 3200, 2900, 3000, 3200, 2700, 3000, 3200],
  },
  {
    id: 'staff',
    name: 'Local Staff & Operations',
    budgetAnnual: 72000,
    budgetMonthly: [6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000],
    actualMonthly: [6100],
    priorYearMonthly: [5200, 5300, 5400, 5300, 5400, 5500, 5400, 5500, 5600, 5500, 5600, 5700],
  },
  {
    id: 'community',
    name: 'Community Development',
    budgetAnnual: 30000,
    budgetMonthly: [2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
    actualMonthly: [2400],
    priorYearMonthly: [2000, 2100, 2200, 2100, 2200, 2300, 2200, 2300, 2400, 2200, 2300, 2400],
  },
];

export const mzRevenue = [
  {
    id: 'us_transfers',
    name: 'Transfers from US Office',
    budgetAnnual: 320000,
    budgetMonthly: [25000, 25000, 28000, 25000, 25000, 28000, 27000, 27000, 28000, 27000, 27000, 28000],
    actualMonthly: [26500],
    priorYearMonthly: [22000, 22000, 24000, 23000, 23000, 25000, 24000, 24000, 26000, 25000, 25000, 27000],
  },
  {
    id: 'local_grants',
    name: 'Local & Regional Grants',
    budgetAnnual: 65000,
    budgetMonthly: [5000, 5000, 6000, 5500, 5500, 6000, 5500, 5500, 6000, 5000, 5000, 5500],
    actualMonthly: [5200],
    priorYearMonthly: [4000, 4200, 5000, 4500, 4500, 5000, 4500, 4800, 5200, 4200, 4500, 5000],
  },
  {
    id: 'in_kind',
    name: 'In-Kind Contributions',
    budgetAnnual: 28000,
    budgetMonthly: [2000, 2000, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2000, 2000, 2500],
    actualMonthly: [2200],
    priorYearMonthly: [1800, 1800, 2000, 2000, 2200, 2200, 2000, 2100, 2200, 1800, 1900, 2200],
  },
];

// ──────────────────────────────────────────────
// Leadership team data
// ──────────────────────────────────────────────
export const usLeadership = [
  { name: 'Executive Director', person: 'C. Bateman' },
  { name: 'Director of Development', person: 'S. Johnson' },
  { name: 'Finance Manager', person: 'R. Chen' },
  { name: 'Communications Lead', person: 'M. Okafor' },
];

export const mzLeadership = [
  { name: 'Country Director', person: 'A. Machava' },
  { name: 'Program Manager', person: 'F. Nhaca' },
  { name: 'Finance Officer', person: 'L. Mondlane' },
  { name: 'Operations Lead', person: 'T. Cossa' },
];

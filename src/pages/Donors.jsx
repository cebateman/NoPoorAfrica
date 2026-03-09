import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { useCurrency } from '../data/CurrencyContext';
import { ArrowUpDown, Search, Users } from 'lucide-react';

const SORT_FIELDS = [
  { key: 'source', label: 'Donor' },
  { key: 'date', label: 'Date' },
  { key: 'amountUSD', label: 'Amount' },
  { key: 'category', label: 'Category' },
];

function parseDate(str) {
  if (!str) return new Date(0);
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export default function Donors() {
  const { allRevenueRows, hasRevenue } = useData();
  const { fmt } = useCurrency();

  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');

  // Get unique years for filter
  const years = useMemo(() => {
    const yrs = [...new Set(allRevenueRows.map((r) => r.year))].sort((a, b) => b - a);
    return yrs;
  }, [allRevenueRows]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let rows = allRevenueRows;

    // Year filter
    if (yearFilter !== 'all') {
      rows = rows.filter((r) => String(r.year) === yearFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.source || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.date || '').toLowerCase().includes(q),
      );
    }

    // Sort
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'amountUSD') {
        cmp = (a.amountUSD || 0) - (b.amountUSD || 0);
      } else if (sortField === 'date') {
        cmp = parseDate(a.date) - parseDate(b.date);
      } else {
        const aVal = (a[sortField] || '').toLowerCase();
        const bVal = (b[sortField] || '').toLowerCase();
        cmp = aVal.localeCompare(bVal);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [allRevenueRows, yearFilter, search, sortField, sortDir]);

  // Summary stats
  const totalAmount = useMemo(
    () => filteredRows.reduce((sum, r) => sum + (r.amountUSD || 0), 0),
    [filteredRows],
  );
  const uniqueDonors = useMemo(
    () => new Set(filteredRows.map((r) => (r.source || '').toLowerCase())).size,
    [filteredRows],
  );

  function handleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'amountUSD' || field === 'date' ? 'desc' : 'asc');
    }
  }

  if (!hasRevenue) {
    return (
      <div className="donors-page">
        <div className="donors-empty">
          <Users size={48} />
          <h2>No Donor Data Available</h2>
          <p>Upload a Revenue CSV file to see donor information here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="donors-page">
      <div className="donors-header">
        <div className="donors-header__title">
          <Users size={22} />
          <h2>Donor Contributions</h2>
        </div>
        <div className="donors-header__stats">
          <div className="donors-stat">
            <span className="donors-stat__label">Total Donations</span>
            <span className="donors-stat__value">{fmt(totalAmount)}</span>
          </div>
          <div className="donors-stat">
            <span className="donors-stat__label">Donors</span>
            <span className="donors-stat__value">{uniqueDonors}</span>
          </div>
          <div className="donors-stat">
            <span className="donors-stat__label">Transactions</span>
            <span className="donors-stat__value">{filteredRows.length}</span>
          </div>
        </div>
      </div>

      <div className="donors-controls">
        <div className="donors-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search donors, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="donors-search__input"
          />
        </div>
        <select
          className="filter-select"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="all">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="donors-table-container">
        <table className="donors-table">
          <thead>
            <tr>
              {SORT_FIELDS.map((f) => (
                <th
                  key={f.key}
                  onClick={() => handleSort(f.key)}
                  className={`donors-table__th ${sortField === f.key ? 'donors-table__th--active' : ''}`}
                >
                  {f.label}
                  <ArrowUpDown size={12} />
                  {sortField === f.key && (
                    <span className="donors-table__sort-dir">
                      {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="donors-table__empty">
                  No donations match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr key={i} className="donors-table__row">
                  <td className="donors-table__donor">{row.source || '—'}</td>
                  <td className="donors-table__date">{row.date || '—'}</td>
                  <td className="donors-table__amount">{fmt(row.amountUSD || 0)}</td>
                  <td className="donors-table__category">{row.category || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="donors-table__total-row">
                <td><strong>Total</strong></td>
                <td></td>
                <td className="donors-table__amount"><strong>{fmt(totalAmount)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

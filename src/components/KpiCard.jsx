import { formatPct } from '../utils/calculations';
import { useCurrency } from '../data/CurrencyContext';

export default function KpiCard({ title, amount, comparisons, icon: Icon, type }) {
  const { format } = useCurrency();

  return (
    <div className={`kpi-card kpi-card--${type || 'default'}`}>
      <div className="kpi-card__header">
        {Icon && <Icon size={20} className="kpi-card__icon" />}
        <span className="kpi-card__title">{title}</span>
      </div>
      <div className="kpi-card__amount">{format(amount)}</div>
      {comparisons && (
        <div className="kpi-card__comparisons">
          {comparisons.map((c, i) => (
            <div key={i} className="kpi-card__comparison">
              <span className="kpi-card__label">{c.label}:</span>
              <span
                className={`kpi-card__variance ${
                  c.favorable
                    ? 'kpi-card__variance--favorable'
                    : c.favorable === false
                      ? 'kpi-card__variance--unfavorable'
                      : ''
                }`}
              >
                {format(c.value)}{c.pct != null ? ` (${formatPct(c.pct)})` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

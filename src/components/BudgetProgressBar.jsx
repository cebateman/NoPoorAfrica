import { useCurrency } from '../data/CurrencyContext';

export default function BudgetProgressBar({ label, actual, budget, priorYear, location, monthsCompleted = 1 }) {
  const { format } = useCurrency();
  const pct = budget > 0 ? (actual / budget) * 100 : 0;
  const priorPct = budget > 0 ? (priorYear / budget) * 100 : 0;
  const cappedPct = Math.min(pct, 100);

  // Expected position based on how far through the year we are
  const expectedPct = (monthsCompleted / 12) * 100;
  const isOver = pct > expectedPct + 5;
  const isUnder = pct < expectedPct - 5;

  return (
    <div className="progress-bar-row">
      <div className="progress-bar__label">
        {label}
        {location && <span className={`location-tag location-tag--${location.toLowerCase()}`}>{location}</span>}
      </div>
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill ${isOver ? 'progress-bar__fill--over' : ''} ${isUnder ? 'progress-bar__fill--under' : ''}`}
          style={{ width: `${cappedPct}%` }}
        />
        <div
          className="progress-bar__marker progress-bar__marker--expected"
          style={{ left: `${expectedPct}%` }}
          title={`Expected pace: ${expectedPct.toFixed(1)}% (${monthsCompleted} of 12 months)`}
        />
        {priorPct > 0 && (
          <div
            className="progress-bar__marker progress-bar__marker--prior"
            style={{ left: `${Math.min(priorPct, 100)}%` }}
            title={`Prior Year: ${priorPct.toFixed(1)}%`}
          />
        )}
      </div>
      <div className="progress-bar__values">
        <span>{format(actual)}</span>
        <span className="progress-bar__of">of {format(budget)}</span>
        <span className={`progress-bar__pct ${isOver ? 'progress-bar__pct--over' : ''} ${isUnder ? 'progress-bar__pct--under' : ''}`}>
          ({pct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

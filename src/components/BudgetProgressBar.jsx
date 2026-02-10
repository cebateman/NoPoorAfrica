import { formatCurrency } from '../utils/calculations';

export default function BudgetProgressBar({ label, actual, budget, priorYear }) {
  const pct = budget > 0 ? (actual / budget) * 100 : 0;
  const priorPct = budget > 0 ? (priorYear / budget) * 100 : 0;
  const cappedPct = Math.min(pct, 100);

  // Expected progress through the year (1 month / 12)
  const expectedPct = (1 / 12) * 100; // ~8.3% through January

  return (
    <div className="progress-bar-row">
      <div className="progress-bar__label">{label}</div>
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill ${pct > expectedPct + 5 ? 'progress-bar__fill--over' : ''}`}
          style={{ width: `${cappedPct}%` }}
        />
        <div
          className="progress-bar__marker progress-bar__marker--expected"
          style={{ left: `${expectedPct}%` }}
          title={`Expected: ${expectedPct.toFixed(1)}%`}
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
        <span>{formatCurrency(actual)}</span>
        <span className="progress-bar__of">of {formatCurrency(budget)}</span>
        <span className="progress-bar__pct">({pct.toFixed(1)}%)</span>
      </div>
    </div>
  );
}

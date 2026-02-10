import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useData } from '../data/DataContext';
import { useCurrency } from '../data/CurrencyContext';

const FILE_CONFIGS = [
  {
    key: 'mapping',
    title: 'Category Mapping',
    description:
      'Maps line items to expense types (People, Girls Program, Auto, etc.). Columns: Line Item Account, Account, Sub-Account, Expense Type',
    required: true,
  },
  {
    key: 'budget',
    title: 'Budget Data',
    description:
      'Monthly budget amounts. Same format as actuals: Center Location, Date, Month, Year, Line Item, Category, Account, Sub Account, Amount (MT), Amount (USD)',
    required: true,
  },
  {
    key: 'actuals',
    title: 'Actuals Data',
    description:
      'Actual monthly spending. Columns: Center Location, Date, Month, Year, Line Item, Category, Account, Sub Account, Amount (MT), Amount (USD)',
    required: true,
  },
  {
    key: 'priorYear',
    title: 'Prior Year Data (Optional)',
    description:
      'Last year\'s actuals for comparison. Same format as actuals data.',
    required: false,
  },
];

function FileDropZone({ config, csvText, rowCount, onUpload, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const hasFile = csvText && csvText.length > 0;

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => onUpload(e.target.result);
      reader.readAsText(file);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      handleFile(e.target.files[0]);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className={`upload-card ${hasFile ? 'upload-card--loaded' : ''}`}>
      <div className="upload-card__header">
        <div className="upload-card__title-row">
          {hasFile ? (
            <CheckCircle size={18} className="upload-card__icon upload-card__icon--success" />
          ) : (
            <FileText size={18} className="upload-card__icon" />
          )}
          <h3>
            {config.title}
            {!config.required && <span className="upload-card__optional"> (optional)</span>}
          </h3>
        </div>
        <p className="upload-card__desc">{config.description}</p>
      </div>

      {hasFile ? (
        <div className="upload-card__status">
          <div className="upload-card__file-info">
            <CheckCircle size={14} className="upload-card__icon--success" />
            <span>
              File loaded &middot; {rowCount.toLocaleString()} data rows &middot;{' '}
              {(csvText.length / 1024).toFixed(1)} KB
            </span>
          </div>
          <div className="upload-card__actions">
            <button className="btn btn--sm btn--outline" onClick={handleClick}>
              Replace
            </button>
            <button className="btn btn--sm btn--danger" onClick={onClear}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`upload-card__dropzone ${dragOver ? 'upload-card__dropzone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <Upload size={32} className="upload-card__upload-icon" />
          <p>
            <strong>Drop CSV file here</strong> or click to browse
          </p>
          <p className="upload-card__hint">Supports .csv and .tsv files exported from Google Sheets</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
    </div>
  );
}

export default function DataUpload() {
  const data = useData();
  const { format } = useCurrency();

  const getCSVText = (key) => {
    const map = { mapping: data.mappingCSV, budget: data.budgetCSV, actuals: data.actualsCSV, priorYear: data.priorYearCSV };
    return map[key] || '';
  };

  const getRowCount = (key) => {
    const map = {
      mapping: Object.keys(data.mapping).length,
      budget: data.budgetRows.length,
      actuals: data.actualsRows.length,
      priorYear: data.priorYearRows.length,
    };
    return map[key] || 0;
  };

  const getUploader = (key) => {
    const map = {
      mapping: data.uploadMapping,
      budget: data.uploadBudget,
      actuals: data.uploadActuals,
      priorYear: data.uploadPriorYear,
    };
    return map[key];
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>Upload Financial Data</h2>
        <p className="dashboard__subtitle">
          Upload CSV files exported from Google Sheets to populate the dashboard.
          Data is stored in your browser and persists between sessions.
        </p>
      </div>

      {/* Instructions */}
      <div className="upload-instructions">
        <Info size={18} />
        <div>
          <strong>How to export from Google Sheets:</strong>
          <ol>
            <li>Open your Google Sheet</li>
            <li>Go to <strong>File &rarr; Download &rarr; Comma-separated values (.csv)</strong></li>
            <li>Upload the downloaded file below</li>
          </ol>
          <p>
            Upload in order: <strong>1) Mapping</strong> first, then <strong>2) Budget</strong>,{' '}
            <strong>3) Actuals</strong>, and optionally <strong>4) Prior Year</strong>.
          </p>
        </div>
      </div>

      {/* Upload cards */}
      <div className="upload-grid">
        {FILE_CONFIGS.map((config) => (
          <FileDropZone
            key={config.key}
            config={config}
            csvText={getCSVText(config.key)}
            rowCount={getRowCount(config.key)}
            onUpload={getUploader(config.key)}
            onClear={() => data.clearFile(config.key)}
          />
        ))}
      </div>

      {/* Data summary */}
      {data.hasData && (
        <div className="upload-summary">
          <h3>Data Summary</h3>
          <div className="upload-summary__grid">
            {data.centers.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Centers</span>
                <span className="upload-summary__value">{data.centers.join(', ')}</span>
              </div>
            )}
            {data.dataYears.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Years</span>
                <span className="upload-summary__value">{data.dataYears.join(', ')}</span>
              </div>
            )}
            {data.hasActuals && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Months with Actuals</span>
                <span className="upload-summary__value">
                  {data.dataMonths.map((m) =>
                    ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]
                  ).join(', ')}
                </span>
              </div>
            )}
            {data.allCategories.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Expense Categories</span>
                <span className="upload-summary__value">
                  {data.allCategories.map((c) => c.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear all */}
      {data.hasData && (
        <div className="upload-clear">
          <button className="btn btn--danger" onClick={data.clearAll}>
            <Trash2 size={16} /> Clear All Uploaded Data
          </button>
        </div>
      )}

      {/* Data preview */}
      {data.hasActuals && data.allCategories.length > 0 && (
        <div className="fin-table-container">
          <h3 className="fin-table__title">Actuals Preview by Expense Type</h3>
          <div className="fin-table-scroll">
            <table className="fin-table">
              <thead>
                <tr>
                  <th className="fin-table__category">Expense Type</th>
                  {data.dataMonths.map((m) => (
                    <th key={m}>
                      {['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]}
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.allCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="fin-table__category">{cat.name}</td>
                    {data.dataMonths.map((m) => (
                      <td key={m}>
                        {format(cat.actualMonthly[m - 1] || 0)}
                      </td>
                    ))}
                    <td>
                      <strong>
                        {format(cat.actualMonthly.reduce((a, b) => a + b, 0))}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

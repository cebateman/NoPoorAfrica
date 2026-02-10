import { createContext, useContext, useState, useCallback } from 'react';

const USD_TO_MZN = 63; // 63 MZN : 1 USD (from data header)

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');

  const toggle = useCallback(() => {
    setCurrency((c) => (c === 'USD' ? 'MZN' : 'USD'));
  }, []);

  const convert = useCallback(
    (amountUSD) => {
      if (currency === 'MZN') return amountUSD * USD_TO_MZN;
      return amountUSD;
    },
    [currency],
  );

  const format = useCallback(
    (amountUSD) => {
      const value = convert(amountUSD);
      if (currency === 'MZN') {
        return new Intl.NumberFormat('pt-MZ', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value) + ' MZN';
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    },
    [currency, convert],
  );

  return (
    <CurrencyContext.Provider value={{ currency, toggle, convert, format, rate: USD_TO_MZN }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

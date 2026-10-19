import type { InputHTMLAttributes } from 'react';
import { currencySymbol } from '../../lib/utils';

/** Number input with the currency symbol inside it. Defaults to the app currency. */
export function MoneyInput({ currency, style, ...props }: { currency?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const symbol = currencySymbol(currency);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-muted))] text-sm">{symbol}</span>
      <input type="number" placeholder="0.00" {...props} className="input"
        style={{ paddingLeft: `calc(0.75rem + ${symbol.length}ch + 0.4rem)`, ...style }} />
    </div>
  );
}

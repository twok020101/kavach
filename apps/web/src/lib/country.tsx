'use client';

import { formatMoney, type Country } from '@kavach/engine';
import { createContext, useContext, type ReactNode } from 'react';

/** The market the shown household lives in; the landing and anything outside a household is India. */
const CountryContext = createContext<Country>('IN');

export function CountryProvider({ country, children }: { country?: Country; children: ReactNode }) {
  return <CountryContext.Provider value={country ?? 'IN'}>{children}</CountryContext.Provider>;
}

export const useCountry = () => useContext(CountryContext);

/** Money in the household's currency: ₹ with Indian grouping, or S$ for a Singapore family. */
export function useMoney() {
  const country = useCountry();
  return (amount: number) => formatMoney(amount, country);
}

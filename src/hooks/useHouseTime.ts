import { useEffect, useState } from 'react';
import { periods, STATIC_PERIOD } from '../data/houseConfig';
import type { Period, PeriodTheme } from '../types/house';

export function getPeriod(date: Date): Period {
  const h = date.getHours();
  const found = (Object.keys(periods) as Period[]).find((p) => h >= periods[p].from && h < periods[p].to);
  return found ?? 'noite';
}

/**
 * Período do dia pelo horário local do visitante (atualiza com a página aberta).
 * - `override`: força um período (prévia no editor ou ?periodo=noite).
 * - `dynamic = false`: janela dinâmica desligada → período fixo.
 */
export function useHouseTime(override?: Period | null, dynamic = true): { now: Date; period: Period; theme: PeriodTheme; clock: string } {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const period = override ?? (dynamic ? getPeriod(now) : STATIC_PERIOD);
  const clock = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { now, period, theme: periods[period], clock };
}

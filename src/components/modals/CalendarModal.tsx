import type { SpecialDate } from '../../types/house';
import { BaseModal } from './BaseModal';

interface CalendarModalProps {
  open: boolean;
  onClose: () => void;
  dates: SpecialDate[];
  togetherSince: { date: string; label: string };
  now: Date;
}

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const DAY = 86_400_000;

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY);
}

const nf = new Intl.NumberFormat('pt-BR');

/** Datas especiais em ordem cronológica, com o tempo decorrido. */
export function CalendarModal({ open, onClose, dates, togetherSince, now }: CalendarModalProps) {
  const since = parseDate(togetherSince.date);
  const total = daysBetween(since, now);
  const sorted = [...dates].sort((x, y) => parseDate(x.date).getTime() - parseDate(y.date).getTime());

  return (
    <BaseModal open={open} onClose={onClose} title="Calendário · Datas especiais" headerClass="bg-rug" widthClass="max-w-[620px]">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-[3px] border-ink bg-highlight px-4 py-3.5">
          <span className="font-sans text-[40px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[44px]">{nf.format(Math.max(0, total))}</span>
          <span className="text-base">
            {togetherSince.label} desde {since.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <ol className="flex flex-col">
          {sorted.map((d) => {
            const date = parseDate(d.date);
            const diff = daysBetween(date, now);
            const rel = diff === 0 ? 'hoje' : diff > 0 ? `há ${nf.format(diff)} dias` : `daqui a ${nf.format(-diff)} dias`;
            return (
              <li key={d.id} className="flex gap-4 border-b-2 border-dashed border-wall-2 py-3.5 last:border-b-0">
                <div className="flex w-16 shrink-0 flex-col items-center self-start border-[3px] border-ink bg-white" aria-hidden="true">
                  <span className="w-full bg-rug py-0.5 text-center text-xs font-bold text-ink-deep">{MONTHS[date.getMonth()]}</span>
                  <span className="py-0.5 font-pixel text-[26px] font-semibold">{date.getDate()}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-pixel text-lg font-semibold">{d.title}</span>
                  <span className="text-[15px] leading-snug">{d.description}</span>
                  <span className="text-[13px] text-muted">
                    <time dateTime={d.date}>{date.toLocaleDateString('pt-BR')}</time> · {rel}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </BaseModal>
  );
}

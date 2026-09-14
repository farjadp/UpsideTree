import { createClient } from "@/utils/supabase/server";
import { getGivingByQuarter, getGivingSettings, type GivingReport } from "@/lib/giving";
import { GIVING_RATE } from "@/lib/pricing";
import { formatMoney } from "@/lib/account";
import { GivingSwitch, NewReportForm, ReportActions } from "./GivingControls";

export default async function AdminGivingPage() {
  const supabase = await createClient();
  const [settings, periods, { data: reportRows }] = await Promise.all([
    getGivingSettings(supabase),
    getGivingByQuarter(supabase),
    supabase.from("giving_reports").select("*").order("period_end", { ascending: false }),
  ]);

  const reports = (reportRows ?? []) as GivingReport[];
  const totalCollected = periods.reduce((sum, period) => sum + period.collectedCad, 0);
  const totalGiven = reports.reduce((sum, report) => sum + Number(report.donated_cad ?? 0), 0);
  const latest = periods[0] ?? null;

  const card = "p-5 rounded-2xl bg-slate-900/50 border border-white/10";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Giving</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            {Math.round(GIVING_RATE * 100)}% of every paid order&apos;s product subtotal (excluding shipping and tax) is set
            aside for people in need in Iran. Prices already account for it. The public messaging stays hidden until you
            switch it on.
          </p>
        </div>
        <GivingSwitch enabled={settings.enabled} />
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
        Before switching this on: confirm with a lawyer that your giving route complies with Canada&apos;s sanctions on
        Iran (give through registered charities or international organisations, not direct transfers), and that the
        public wording matches exactly what you do.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={card}>
          <p className="text-xs uppercase text-slate-400">Collected (all time)</p>
          <p className="mt-2 text-2xl font-bold text-white">{formatMoney(totalCollected)}</p>
        </div>
        <div className={card}>
          <p className="text-xs uppercase text-slate-400">Given (reported)</p>
          <p className="mt-2 text-2xl font-bold text-white">{formatMoney(totalGiven)}</p>
        </div>
        <div className={card}>
          <p className="text-xs uppercase text-slate-400">Still to give</p>
          <p className="mt-2 text-2xl font-bold text-gold-300">{formatMoney(Math.max(0, totalCollected - totalGiven))}</p>
        </div>
      </div>

      <div className={card}>
        <h2 className="mb-3 text-sm font-semibold text-white">Collected by quarter</h2>
        {periods.length === 0 ? (
          <p className="text-sm text-slate-500">No paid orders yet.</p>
        ) : (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Quarter</th>
                <th className="py-2">Paid orders</th>
                <th className="py-2 text-right">Set aside</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {periods.map((period) => (
                <tr key={period.label}>
                  <td className="py-2">{period.label} <span className="text-slate-500">({period.start} → {period.end})</span></td>
                  <td className="py-2">{period.orders}</td>
                  <td className="py-2 text-right text-white">{formatMoney(period.collectedCad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={card}>
        <h2 className="mb-1 text-sm font-semibold text-white">Add a report</h2>
        <p className="mb-4 text-xs text-slate-500">Written every 3–6 months. Saved unpublished; publish it when it&apos;s final.</p>
        <NewReportForm suggested={latest ? { start: latest.start, end: latest.end, collected: latest.collectedCad } : null} />
      </div>

      <div className={card}>
        <h2 className="mb-3 text-sm font-semibold text-white">Reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">No reports yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-3 text-sm">
                <div>
                  <p className="text-white">
                    {report.period_start} → {report.period_end} · {report.recipient}{" "}
                    <span className={report.published ? "text-emerald-400" : "text-slate-500"}>
                      {report.published ? "published" : "draft"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Collected {formatMoney(report.collected_cad)} · Given {formatMoney(report.donated_cad)}
                  </p>
                </div>
                <ReportActions id={report.id} published={report.published} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

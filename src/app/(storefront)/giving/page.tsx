import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/layout/InfoPage";
import { createClient } from "@/utils/supabase/server";
import { getGivingSettings, type GivingReport } from "@/lib/giving";
import { formatMoney } from "@/lib/account";

export const metadata: Metadata = { title: "Giving" };

// Public page for the giving commitment and its published reports. Returns
// 404 while the program is switched off in the admin.
export default async function GivingPage() {
  const supabase = await createClient();
  const settings = await getGivingSettings(supabase);
  if (!settings.enabled) notFound();

  const { data } = await supabase
    .from("giving_reports")
    .select("*")
    .eq("published", true)
    .order("period_end", { ascending: false });
  const reports = (data ?? []) as GivingReport[];

  return (
    <InfoPage
      titleEn="Giving"
      titleFa="کمک به نیازمندان"
      intro="3% of every order's product total goes to people in need in Iran, through registered charities. We report what was set aside and where it went every few months."
    >
      <div>
        <h2>How it works</h2>
        <ul>
          <li>For every paid order, 3% of the product total (not shipping or tax) is set aside.</li>
          <li>It&apos;s given through registered charities and humanitarian organisations — never as direct transfers.</li>
          <li>Every 3–6 months we publish a report: how much was set aside, how much was given, and to whom.</li>
        </ul>
      </div>

      <div dir="rtl" lang="fa" className="text-right">
        <h2 className="font-persian">چطور کار می‌کند</h2>
        <p className="font-persian">
          از هر سفارش پرداخت‌شده، ۳٪ از مبلغ محصولات (بدون هزینهٔ ارسال و مالیات) کنار گذاشته می‌شود و از طریق خیریه‌ها و
          نهادهای بشردوستانهٔ معتبر صرف کمک به مردم نیازمند ایران می‌شود. هر سه تا شش ماه گزارش مبلغ جمع‌شده، مبلغ
          پرداخت‌شده و دریافت‌کنندگان را منتشر می‌کنیم.
        </p>
      </div>

      <div>
        <h2>Reports</h2>
        {reports.length === 0 ? (
          <p>The first report will be published at the end of the first reporting period.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((report) => (
              <article key={report.id} className="rounded-brand-lg border border-ivory-500 bg-ivory-200 p-5">
                <p className="font-display text-lg text-ink-500">
                  {report.period_start} → {report.period_end}
                </p>
                <p>
                  Set aside {formatMoney(report.collected_cad)} · Given {formatMoney(report.donated_cad)} to{" "}
                  {report.recipient_url ? (
                    <a href={report.recipient_url} target="_blank" rel="noopener noreferrer">{report.recipient}</a>
                  ) : (
                    report.recipient
                  )}
                </p>
                {report.notes_en && <p>{report.notes_en}</p>}
                {report.notes_fa && (
                  <p dir="rtl" lang="fa" className="font-persian text-right">{report.notes_fa}</p>
                )}
                {report.proof_url && (
                  <p>
                    <a href={report.proof_url} target="_blank" rel="noopener noreferrer">View receipt</a>
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </InfoPage>
  );
}

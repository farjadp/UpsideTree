import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <InfoPage
      titleEn="FAQ"
      titleFa="پرسش‌های پرتکرار"
    >
      <div>
        <h2>Where do you ship?</h2>
        <p>
          Canada, the US, the UK, Australia, and most of Western Europe — the full list is on{" "}
          <Link href="/how-to-buy">How to Buy</Link>. Each order is produced by the partner closest to you;
          see <Link href="/shipping">Shipping &amp; Returns</Link> for timelines.
        </p>
      </div>
      <div>
        <h2>When will my order arrive?</h2>
        <p>
          Made-to-order production takes 2–7 business days, then shipping (3–8 business days in
          Canada/US). You get tracking by email the moment it ships.
        </p>
      </div>
      <div>
        <h2>Can I return a piece?</h2>
        <p>
          Damaged, misprinted, or wrong item — yes, within 30 days, replaced or refunded. Change of
          mind — no, because every piece is produced specifically for you.
        </p>
      </div>
      <div>
        <h2>Is checkout secure?</h2>
        <p>Payments are processed end-to-end by Stripe. Your card details never touch our servers.</p>
      </div>
      <div>
        <h2>Something else?</h2>
        <p>
          <Link href="/contact">Contact us</Link> — we answer in English and Persian.
        </p>
      </div>
    </InfoPage>
  );
}

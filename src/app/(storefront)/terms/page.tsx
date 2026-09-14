import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";
import { CONTACT_EMAIL } from "@/lib/site-contact";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <InfoPage
      titleEn="Terms of Service"
      titleFa="شرایط استفاده"
      intro="The short, honest version of the agreement between you and Upside Tree when you shop here. Last updated August 2026."
    >
      <div>
        <h2>Orders</h2>
        <p>
          Every piece is made to order. Your order is confirmed when payment completes; production
          starts shortly after, so changes or cancellations are only possible before production begins
          — <Link href="/contact">contact us</Link> immediately if you need one.
        </p>
      </div>
      <div>
        <h2>Prices &amp; payment</h2>
        <p>
          Prices are in Canadian dollars unless stated otherwise. Taxes and shipping are shown at
          checkout before you pay. Payment is processed by Stripe.
        </p>
      </div>
      <div>
        <h2>Returns</h2>
        <p>
          Damaged, misprinted, or incorrect items are replaced or refunded within 30 days of delivery
          — see <Link href="/shipping">Shipping &amp; Returns</Link>.
        </p>
      </div>
      <div>
        <h2>Intellectual property</h2>
        <p>
          Designs, artwork, and text on this site belong to Upside Tree. Buying a piece gives you the
          piece — not the right to reproduce its design.
        </p>
      </div>
      <div>
        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </InfoPage>
  );
}

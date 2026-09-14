import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";
import { CONTACT_EMAIL } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "The limits of what Upside Tree's product images, cultural stories, prices, and delivery estimates promise.",
};

export default function DisclaimerPage() {
  return (
    <InfoPage
      titleEn="Disclaimer"
      titleFa="سلب مسئولیت"
      intro="What the information on this site does and doesn't promise. Please read it together with our Terms of Service. Last updated September 2026."
    >
      <div>
        <h2>Product images and colours</h2>
        <p>
          Most product images are digital mockups of the design on the product. Every piece is printed to
          order, so small differences in colour, placement, and scale are normal, and colours on your screen
          depend on your display. These variations aren&apos;t defects. Pieces that arrive damaged, misprinted,
          or wrong are covered by our <Link href="/shipping">replacement policy</Link>.
        </p>
      </div>

      <div>
        <h2>Cultural and historical content</h2>
        <p>
          Our stories about Persian motifs, poetry, and history are written with care and checked against
          sources we trust, but they are interpretive writing for a general audience, not academic or
          authoritative scholarship. Symbols often carry more than one meaning across regions and eras. If you
          spot an error, <Link href="/contact">tell us</Link> and we&apos;ll correct it.
        </p>
      </div>

      <div>
        <h2>Care and use</h2>
        <p>
          Follow the <Link href="/care">care instructions</Link> for each product. We aren&apos;t responsible for
          damage caused by using a piece in ways it isn&apos;t made for — for example, putting non-microwave-safe
          items in a microwave or leaving canvas in direct sun or damp spaces.
        </p>
      </div>

      <div>
        <h2>Prices, availability, and errors</h2>
        <p>
          Prices are set in Canadian dollars. Prices shown in other currencies are converted at a current
          exchange rate, and your bank may apply its own conversion or foreign transaction fees. We try to keep
          all information accurate, but if a product, price, or description is listed in error, we may cancel
          the affected order and refund you in full.
        </p>
      </div>

      <div>
        <h2>Delivery estimates</h2>
        <p>
          Production and shipping times are estimates, not guarantees. Carrier delays, customs, holidays, and
          events outside our control can extend them. Import duties or taxes charged by your country on
          delivery are the recipient&apos;s responsibility.
        </p>
      </div>

      <div>
        <h2>Giving</h2>
        <p>
          When our giving program is active, a share of each order&apos;s product total is given by Upside Tree,
          from its own proceeds, to people in need in Iran through registered charities. It isn&apos;t a donation
          made by you, it doesn&apos;t qualify for a tax receipt, and we don&apos;t control how the receiving
          charities carry out their work.
        </p>
      </div>

      <div>
        <h2>Third-party links</h2>
        <p>
          Links to other websites and social platforms are provided for convenience. We don&apos;t control their
          content or privacy practices and aren&apos;t responsible for them.
        </p>
      </div>

      <div>
        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, Upside Tree&apos;s liability for any claim related to a purchase is
          limited to the amount you paid for that order. Nothing here limits rights you have under consumer
          protection laws that can&apos;t be waived, including Ontario&apos;s Consumer Protection Act.
        </p>
      </div>

      <div>
        <h2>Questions</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </div>
    </InfoPage>
  );
}

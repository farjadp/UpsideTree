import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Shipping & Returns" };

export default function ShippingPage() {
  return (
    <InfoPage
      titleEn="Shipping & Returns"
      titleFa="ارسال و مرجوعی"
      intro="Every piece is made to order — produced for you after you order it, then shipped from the production partner closest to you."
    >
      <div>
        <h2>Production time</h2>
        <p>
          Made-to-order pieces typically enter production within 1 business day of payment and take
          2–7 business days to produce, depending on the product.
        </p>
      </div>
      <div>
        <h2>Shipping</h2>
        <ul>
          <li>Shipping cost is calculated for your exact address at checkout and shown before you pay.</li>
          <li>Canada &amp; US: usually 3–8 business days after production.</li>
          <li>International: usually 10–30 business days after production.</li>
          <li>You'll receive a tracking number by email the moment your order ships.</li>
        </ul>
      </div>
      <div>
        <h2>Returns &amp; replacements</h2>
        <p>
          Because each piece is produced specifically for you, we can't accept returns for change of
          mind. If your order arrives damaged, misprinted, or not what you ordered, contact us within
          30 days of delivery with a photo and we'll replace it or refund you — whichever you prefer.
        </p>
      </div>
    </InfoPage>
  );
}

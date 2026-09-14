import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <InfoPage
      titleEn="Contact"
      titleFa="تماس با ما"
      intro="Questions about an order, a piece, or a story? We answer in English and Persian."
    >
      <div>
        <h2>Email</h2>
        <p>
          Write to <a href="mailto:hello@upsidetree.ca">hello@upsidetree.ca</a> — we reply within one
          business day.
        </p>
      </div>
      <div>
        <h2>Order support</h2>
        <p>
          Already ordered? Open a support ticket from{" "}
          <Link href="/account/support/new">your account</Link> and we'll pick it up with your order
          history in front of us.
        </p>
      </div>
      <div>
        <h2>Social</h2>
        <p>
          Find us on Instagram at <a href="https://www.instagram.com/upsidetreeshop/" target="_blank" rel="noopener noreferrer">@upsidetreeshop</a>.
        </p>
      </div>
    </InfoPage>
  );
}

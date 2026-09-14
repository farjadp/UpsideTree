import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach Upside Tree by email, phone, or the support form. Based in Newmarket, Ontario, Canada. We answer in English and Persian.",
};

const FOUNDER_LINKS = [
  { href: "https://www.linkedin.com/in/farjadpourmohammad/", label: "LinkedIn" },
  { href: "https://instagram.com/FarjadTalks", label: "Instagram — @FarjadTalks" },
  { href: "https://www.youtube.com/@FarjadTalks", label: "YouTube — @FarjadTalks" },
  { href: "https://t.me/FarjadTalks", label: "Telegram — @FarjadTalks" },
  { href: "https://www.farjadp.com", label: "farjadp.com" },
];

export default function ContactPage() {
  return (
    <InfoPage
      titleEn="Contact"
      titleFa="تماس با ما"
      intro="Questions about an order, a piece, or a story behind a design? Write to us — we answer in English and Persian."
    >
      <div>
        <h2>Email</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — we reply within one business day. For an
          existing order, include your order number so we can find it quickly.
        </p>
      </div>

      <div>
        <h2>Phone</h2>
        <p>
          <a href={`tel:${CONTACT_PHONE_E164}`}>{CONTACT_PHONE_DISPLAY}</a> — business days, Eastern Time. If we
          miss your call, leave a message or send an email and we&apos;ll get back to you.
        </p>
      </div>

      <div>
        <h2>Support &amp; complaints</h2>
        <p>
          For a problem with an order, a damaged or wrong item, or a complaint, use the{" "}
          <Link href="/support">support form</Link>. You&apos;ll get a reference number and an email copy right away,
          and it reaches us faster than a general message. Signed-in customers can also follow requests under{" "}
          <Link href="/account/support">your account</Link>.
        </p>
      </div>

      <div>
        <h2>Where we are</h2>
        <p>
          Upside Tree is an online store based in Newmarket, Ontario, Canada. We don&apos;t have a showroom;
          every order is produced and shipped by our print partners.
        </p>
      </div>

      <div>
        <h2>Follow the store</h2>
        <p>
          Instagram:{" "}
          <a href="https://www.instagram.com/upsidetreeshop/" target="_blank" rel="noopener noreferrer">
            @upsidetreeshop
          </a>
        </p>
      </div>

      <div>
        <h2>Founder</h2>
        <p>
          Upside Tree was founded by Farjad Pourmohammad. For collaborations, press, or wholesale, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or reach Farjad on:
        </p>
        <ul>
          {FOUNDER_LINKS.map(({ href, label }) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Before you write</h2>
        <p>
          Many answers are already here: <Link href="/how-to-buy">How to Buy</Link>,{" "}
          <Link href="/faq">FAQ</Link>, and <Link href="/care">Care Instructions</Link>.
        </p>
      </div>
    </InfoPage>
  );
}

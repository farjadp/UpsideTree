import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach Upside Tree by email or through your account for order support. Based in Newmarket, Ontario, Canada. We answer in English and Persian.",
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
          <a href="mailto:hello@upsidetree.ca">hello@upsidetree.ca</a> — we reply within one business day
          (Monday to Friday, Eastern Time). For an existing order, include your order number so we can find it
          quickly.
        </p>
      </div>

      <div>
        <h2>Order support</h2>
        <p>
          Signed in? Open a support ticket from <Link href="/account/support/new">your account</Link> and
          we&apos;ll pick it up with your order history in front of us. For a damaged or misprinted piece, email
          us a photo — see <Link href="/shipping">Shipping &amp; Returns</Link>.
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
          Upside Tree was founded by Farjad Pourmohammad. For collaborations, press, or wholesale, email us or
          reach Farjad directly:
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

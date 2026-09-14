import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Upside Tree collects when you shop, why, who we share it with, and how to access or delete your data.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      titleEn="Privacy Policy"
      titleFa="حریم خصوصی"
      intro="A plain-language account of what we collect when you visit or shop, why we need it, and the control you have over it. Upside Tree is based in Ontario, Canada, and handles personal information under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). Last updated September 2026."
    >
      <div>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>When you order:</strong> your name, email, shipping and billing address, and phone
            number if you give one, plus the items, any gift message, and order notes.
          </li>
          <li>
            <strong>If you create an account:</strong> your login email, saved addresses, order history,
            wishlist, loyalty points, and any support tickets you open.
          </li>
          <li>
            <strong>For fraud prevention:</strong> the IP address and browser type used to place an order.
          </li>
          <li>
            <strong>Reviews:</strong> the name and text you choose to publish with a product review.
          </li>
        </ul>
      </div>

      <div>
        <h2>What we never see</h2>
        <p>
          Your card details. Payment is handled entirely by Stripe on their secure checkout; card numbers
          never pass through or get stored on our servers.
        </p>
      </div>

      <div>
        <h2>Why we use it</h2>
        <ul>
          <li>To produce, ship, and track your order, and to email you about it.</li>
          <li>To answer your questions and handle replacements or refunds.</li>
          <li>To keep your account, wishlist, and loyalty points working.</li>
          <li>To detect fraudulent orders and keep the store secure.</li>
          <li>To understand, in aggregate, which pieces and pages people find useful.</li>
        </ul>
        <p>
          We don't send marketing email unless you ask for it, and we never sell or rent personal
          information.
        </p>
      </div>

      <div>
        <h2>Who we share it with</h2>
        <p>Only the services needed to run the store, and only what each one needs:</p>
        <ul>
          <li>
            <strong>Stripe</strong> — payment processing.
          </li>
          <li>
            <strong>Printify and its print partners</strong> — your name, shipping address, and phone
            number, so your piece can be made and delivered.
          </li>
          <li>
            <strong>Shipping carriers</strong> — delivery address and tracking.
          </li>
          <li>
            <strong>Supabase</strong> — secure hosting for our database and accounts.
          </li>
          <li>
            <strong>Resend</strong> — delivery of order confirmation and shipping emails.
          </li>
          <li>
            <strong>Pinterest</strong> — see &ldquo;Cookies and tracking&rdquo; below.
          </li>
        </ul>
        <p>
          Some of these providers store data outside Canada, including in the United States, where it may
          be accessible to authorities under local law. We may also disclose information when legally
          required to.
        </p>
      </div>

      <div>
        <h2>Cookies and tracking</h2>
        <ul>
          <li>
            <strong>Essential cookies</strong> keep you signed in and your checkout secure.
          </li>
          <li>
            <strong>Your browser&apos;s local storage</strong> remembers your cart, chosen currency, and
            recently viewed pieces. It stays on your device.
          </li>
          <li>
            <strong>Pinterest Tag</strong> tells Pinterest when someone arriving from a Pinterest ad views
            a page, adds to cart, or checks out, so we can see which pins are worth running. You can opt out
            in your Pinterest privacy settings or block it with your browser&apos;s tracking protection.
          </li>
        </ul>
      </div>

      <div>
        <h2>How long we keep it</h2>
        <p>
          Order records are kept for as long as Canadian tax and accounting rules require (generally six
          years). Account data stays until you delete your account. Server logs record IP addresses in
          hashed form only.
        </p>
      </div>

      <div>
        <h2>Your rights</h2>
        <p>
          You can ask to see the personal information we hold about you, correct it, or have your account
          and its data deleted (except order records we&apos;re legally required to keep). Email{" "}
          <a href="mailto:hello@upsidetree.ca">hello@upsidetree.ca</a> and we&apos;ll respond within 30
          days. If you&apos;re not satisfied with our answer, you can contact the{" "}
          <a href="https://www.priv.gc.ca/" target="_blank" rel="noopener noreferrer">
            Office of the Privacy Commissioner of Canada
          </a>
          .
        </p>
      </div>

      <div>
        <h2>Children</h2>
        <p>
          This store isn&apos;t directed at children under 13, and we don&apos;t knowingly collect their
          information.
        </p>
      </div>

      <div>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, we&apos;ll update the date at the top of this page. Questions go to{" "}
          <a href="mailto:hello@upsidetree.ca">hello@upsidetree.ca</a> — see also our{" "}
          <Link href="/terms">Terms of Service</Link> and <Link href="/disclaimer">Disclaimer</Link>.
        </p>
      </div>
    </InfoPage>
  );
}

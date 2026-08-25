import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <InfoPage
      titleEn="Privacy Policy"
      titleFa="حریم خصوصی"
      intro="Plain-language summary of what we collect and why. Last updated August 2026."
    >
      <div>
        <h2>What we collect</h2>
        <ul>
          <li>Order details: name, email, shipping address, phone — to produce and deliver your order.</li>
          <li>Account details, if you create one: your orders, addresses, and wishlist.</li>
          <li>Basic usage data (pages viewed) to understand what people are interested in.</li>
        </ul>
      </div>
      <div>
        <h2>What we never see</h2>
        <p>
          Your payment details. Checkout is processed entirely by Stripe; card numbers never touch our
          servers.
        </p>
      </div>
      <div>
        <h2>Who we share with</h2>
        <p>
          Only the services needed to fulfill your order: Stripe (payment) and our print production
          partners (name and shipping address, so your order can be made and delivered). We don't sell
          or rent personal data to anyone.
        </p>
      </div>
      <div>
        <h2>Your choices</h2>
        <p>
          Email <a href="mailto:hello@upsidetree.ca">hello@upsidetree.ca</a> to ask what we hold about
          you, correct it, or delete your account and its data.
        </p>
      </div>
    </InfoPage>
  );
}

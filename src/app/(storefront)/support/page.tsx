import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";
import { createClient } from "@/utils/supabase/server";
import { CONTACT_EMAIL, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164 } from "@/lib/site-contact";
import { SUPPORT_CATEGORY_VALUES } from "@/lib/support-categories";
import { SupportForm } from "./SupportForm";

export const metadata: Metadata = {
  title: "Support & Complaints",
  description:
    "Get help with an order, report a damaged or wrong item, or make a complaint. Every request gets a reference number and a reply.",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const defaultCategory = SUPPORT_CATEGORY_VALUES.find((value) => value === type) ?? "order";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let defaultName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    defaultName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  }

  return (
    <InfoPage
      titleEn="Support & Complaints"
      titleFa="پشتیبانی و شکایات"
      intro="Something wrong with an order, a question before you buy, or a complaint about how we handled something? Tell us here. Every request gets a reference number, an email copy, and a reply from a real person — in English or Persian."
    >
      <div>
        <h2>Send a request</h2>
        <p className="mb-6">
          No account needed.{" "}
          {user ? (
            <>
              Because you&apos;re signed in, this request will also appear under{" "}
              <Link href="/account/support">your support requests</Link>.
            </>
          ) : (
            <>
              Have an account? <Link href="/admin/login?next=/account/support/new">Sign in</Link> to pick the order
              from a list and follow the conversation there.
            </>
          )}
        </p>
        <SupportForm defaultCategory={defaultCategory} defaultName={defaultName} defaultEmail={user?.email ?? ""} />
      </div>

      <div>
        <h2>Response times</h2>
        <ul>
          <li>Questions and order issues: a reply within one business day.</li>
          <li>Damaged, misprinted, or wrong items: reported within 30 days of delivery, replaced or refunded.</li>
          <li>Complaints: acknowledged within 2 business days, resolved within 10 business days where possible.</li>
          <li>Privacy requests (access, correction, deletion): answered within 30 days.</li>
        </ul>
      </div>

      <div>
        <h2>How we handle complaints</h2>
        <ul>
          <li>
            <strong>1. Acknowledge.</strong>{" "}You get a reference number immediately and a personal reply confirming who
            is handling it.
          </li>
          <li>
            <strong>2. Investigate.</strong>{" "}We review your order, production and carrier records, and any photos you
            send, and may ask a few questions.
          </li>
          <li>
            <strong>3. Resolve.</strong>{" "}We explain what we found and what we&apos;ll do — a replacement, refund, or
            another fair remedy — and follow through.
          </li>
          <li>
            <strong>4. Escalate.</strong>{" "}If you&apos;re not satisfied, reply asking for a review and the founder will
            look at it personally. You can also contact{" "}
            <a href="https://www.ontario.ca/page/file-complaint-about-business" target="_blank" rel="noopener noreferrer">
              Consumer Protection Ontario
            </a>
            , and for payment disputes your card issuer.
          </li>
        </ul>
        <p>We never treat a complaint as a reason to refuse future orders or support.</p>
      </div>

      <div>
        <h2>Other ways to reach us</h2>
        <ul>
          <li>
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </li>
          <li>
            Phone: <a href={`tel:${CONTACT_PHONE_E164}`}>{CONTACT_PHONE_DISPLAY}</a> — business days, Eastern Time
          </li>
        </ul>
        <p>
          Before writing, you may find the answer in <Link href="/faq">FAQ</Link>,{" "}
          <Link href="/shipping">Shipping &amp; Returns</Link>, or <Link href="/how-to-buy">How to Buy</Link>.
        </p>
      </div>
    </InfoPage>
  );
}

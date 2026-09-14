import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "How to Buy",
  description:
    "Ordering from Upside Tree step by step: choosing a piece, checkout, secure payment with Stripe, production, and tracking.",
};

const STEPS = [
  {
    title: "Find your piece",
    body: (
      <>
        Browse <Link href="/collections">collections</Link> or <Link href="/search">search</Link>. Every
        product page tells the story behind its design. Choose a size or variant where there is one — the{" "}
        <Link href="/sizing">size guide</Link> helps.
      </>
    ),
  },
  {
    title: "Add to cart",
    body: (
      <>
        Tap <strong>Add to cart</strong>, then open your cart to review quantities. Want it as a gift? Add
        gift wrapping and a personal message in the cart. You can switch the display currency between CAD and
        EUR at the top of the page.
      </>
    ),
  },
  {
    title: "Check out",
    body: (
      <>
        Enter your email and shipping address. No account is needed — guest checkout works. Shipping and any
        tax for your exact address are calculated and shown before you pay.
      </>
    ),
  },
  {
    title: "Pay securely",
    body: (
      <>
        You&apos;re taken to Stripe&apos;s secure payment page. Pay by credit or debit card, or with a digital
        wallet such as Apple Pay or Google Pay when Stripe offers it on your device. Your card details never reach our servers.
      </>
    ),
  },
  {
    title: "We make it",
    body: (
      <>
        You get an order confirmation by email right away. Your piece usually enters production within one
        business day and takes 2–7 business days to make.
      </>
    ),
  },
  {
    title: "Track your delivery",
    body: (
      <>
        As soon as it ships, we email you a tracking number. If you have an account, you can also follow the
        order under <Link href="/account/orders">My orders</Link>. Delivery times are on the{" "}
        <Link href="/shipping">Shipping &amp; Returns</Link> page.
      </>
    ),
  },
];

export default function HowToBuyPage() {
  return (
    <InfoPage
      titleEn="How to Buy"
      titleFa="نحوه‌ی خرید"
      intro="Ordering takes a few minutes. Here's everything that happens between choosing a piece and opening the box."
    >
      <ol className="flex flex-col gap-8" role="list">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500 font-display text-base font-semibold text-gold-600"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-2">
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div>
        <h2>Where we ship</h2>
        <p>
          Canada, the United States, the United Kingdom, Australia, and most of Western Europe (Germany, France,
          the Netherlands, Belgium, Austria, Ireland, Italy, Spain, Portugal, Finland, Luxembourg, Sweden,
          Denmark, Norway, and Switzerland). If your country isn&apos;t listed at checkout,{" "}
          <Link href="/contact">write to us</Link>.
        </p>
      </div>

      <div>
        <h2>Why create an account?</h2>
        <ul>
          <li>Faster checkout with saved addresses.</li>
          <li>Your full order history and tracking in one place.</li>
          <li>A wishlist for pieces you&apos;re considering.</li>
          <li>Support tickets tied to your order, so we already have the details.</li>
        </ul>
      </div>

      <div>
        <h2>Changes, cancellations, and problems</h2>
        <p>
          Because every piece is made for you, changes and cancellations are only possible before production
          begins — <Link href="/contact">contact us</Link> as soon as possible. If something arrives damaged,
          misprinted, or wrong, send us a photo within 30 days of delivery and we&apos;ll replace it or refund you.
        </p>
      </div>

      <div>
        <h2>Need help?</h2>
        <p>
          Read the <Link href="/faq">FAQ</Link> or email{" "}
          <a href="mailto:hello@upsidetree.ca">hello@upsidetree.ca</a>. We answer in English and Persian.
        </p>
      </div>
    </InfoPage>
  );
}

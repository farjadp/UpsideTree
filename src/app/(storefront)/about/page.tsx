// ============================================================================
// File: upside-tree/src/app/about/page.tsx
// Version: 1.1.0 — 2026-09-13
// Why: About page — brand manifesto, "what we are / what we are not",
//      how pieces are made, and the founder. Content-first, no product grid.
// Env / Identity: Frontend — Next.js App Router (Server Component)
// ============================================================================

import type { Metadata } from "next";
import { PersianMotif } from "@/components/brand/PersianMotif";
import { buttonVariants } from "@/components/ui/Button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Upside Tree is a Persian cultural product brand built for the Iranian diaspora and anyone who finds meaning in ancient symbols made modern.",
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section
        id="about-hero"
        className="pt-[calc(var(--navbar-height)+5rem)] pb-16 bg-ivory-200"
      >
        <div className="container mx-auto max-w-[640px]">
          <div className="mb-8 opacity-50">
            <PersianMotif motif="cypress" size={48} color="#1D4E89" />
          </div>
          <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-4">
            About
          </p>
          <h1 className="font-display text-display-lg text-lapis-500 font-semibold mb-6 leading-tight">
            We are a living branch<br />of a very old tree.
          </h1>
          <p
            className="font-persian text-lg text-ink-400 mb-6"
            lang="fa"
            dir="rtl"
          >
            ما شاخه‌ای زنده از درختی بسیار کهن هستیم.
          </p>
          <div className="w-12 h-0.5 bg-gold-500 mb-8" aria-hidden="true" />
          <p className="font-body text-base text-ink-400 leading-relaxed">
            Upside Tree (درخت وارونه) is a Persian cultural product brand built for the
            Iranian diaspora and anyone who finds meaning in ancient symbols made modern.
            We make contemporary objects — wall art, mugs, jewelry, and everyday pieces — that
            carry the weight of thousands of years of Iranian heritage without the heaviness.
            Every design starts from a real motif, verse, or story, and every product page
            tells you where it comes from.
          </p>
        </div>
      </section>

      {/* What we are / what we are not */}
      <section
        id="about-identity"
        className="py-16 bg-ivory-300 border-y border-ivory-400"
        aria-labelledby="identity-heading"
      >
        <div className="container mx-auto">
          <h2
            id="identity-heading"
            className="font-display text-display-sm text-lapis-500 font-semibold mb-12 text-center"
          >
            Who we are
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-3xl mx-auto">
            {/* We are */}
            <div>
              <h3 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-turquoise-500 mb-5">
                We are
              </h3>
              <ul className="flex flex-col gap-4 font-body text-base text-ink-400" role="list">
                {[
                  "A brand rooted in Iranian cultural heritage",
                  "Design-led and story-first",
                  "Built for everyday life, not just occasions",
                  "A bridge between diaspora and homeland",
                  "Precise about cultural context and accuracy",
                  "Growing with our community",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-turquoise-500 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* We are not */}
            <div>
              <h3 className="font-body text-xs font-semibold tracking-[0.2em] uppercase text-pomegranate-500 mb-5">
                We are not
              </h3>
              <ul className="flex flex-col gap-4 font-body text-base text-ink-400" role="list">
                {[
                  "A museum or archival institution",
                  "Nostalgic or backward-looking",
                  "A mass-market souvenir store",
                  "Appropriating a culture we don't belong to",
                  "Rushed, trend-driven, or disposable",
                  "Just aesthetics without meaning",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pomegranate-500 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it's made */}
      <section
        id="about-making"
        className="py-16"
        aria-labelledby="making-heading"
      >
        <div className="container mx-auto max-w-[640px]">
          <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-4">
            How it&apos;s made
          </p>
          <h2
            id="making-heading"
            className="font-display text-display-sm text-lapis-500 font-semibold mb-6"
          >
            Made for you, not for a warehouse
          </h2>
          <div className="flex flex-col gap-4 font-body text-base text-ink-400 leading-relaxed">
            <p>
              We design every piece in-house, drawing on Persian patterns, calligraphy, poetry, and
              architecture. Nothing sits on a shelf waiting to be sold: when you order, your piece is
              printed and made by a production partner close to you, then shipped straight to your door.
            </p>
            <p>
              Making to order means less waste and no overstock — and it lets a small, independent
              brand offer a wide range of pieces to the diaspora wherever they live.
            </p>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section
        id="about-founder"
        className="py-16 bg-ivory-300 border-y border-ivory-400"
        aria-labelledby="founder-heading"
      >
        <div className="container mx-auto max-w-[640px] text-center">
          <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-gold-500 mb-4">
            The founder
          </p>
          <h2
            id="founder-heading"
            className="font-display text-display-sm text-lapis-500 font-semibold mb-6"
          >
            Started in Newmarket, Ontario
          </h2>
          <p className="font-body text-base text-ink-400 leading-relaxed mb-10">
            Upside Tree was founded by Farjad Pourmohammad to give
            people living far from Iran objects that keep its stories close — and to introduce
            those stories to everyone else.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/collections" className={buttonVariants({ variant: "primary" })}>
              Explore the collections
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: "ghost" })}>
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

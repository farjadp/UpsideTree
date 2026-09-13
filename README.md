# Upside Tree 🌳

Upside Tree is a premium e-commerce platform built with modern web technologies. It features a bilingual (English/Persian) interface, a dynamic administrative dashboard, and a fully custom purchase flow with a robust pre-Islamic Iranian cultural identity design.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions, Server Components)
- **Styling**: Tailwind CSS
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **State Management**: Zustand
- **Payments**: Stripe (Integrated purchase flow)
- **UI Components**: Radix UI / custom components with Framer Motion

## Key Features

- **Bilingual Support**: Full support for English (EN) and Persian (FA).
- **Admin Panel**: Comprehensive administrative dashboard for managing products, collections, media, customers, and global settings.
- **Dynamic Settings System**: All store configurations (branding, SEO, payments, shipping, emails) are stored in the database and manageable via the Admin UI.
- **Cart & Purchase Flow**: Complex cart state tracking with guest checkout support, coupon validation, and multi-step transaction handling.
- **Loyalty System**: Built-in points and rewards system for registered customers.
- **Modern UI/UX**: Glassmorphism, dynamic gradients, and responsive layouts.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:4508](http://localhost:4508) with your browser to see the result.

> Pinned to port 4508 (see `package.json`'s `dev`/`start` scripts and
> `.claude/launch.json`) — this project is usually run alongside other
> local projects at the same time, and letting Next.js fall back to
> whatever port is free caused more than one dev server mix-up.

## Environment Variables

To run this project locally, you will need to add the following environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_signing_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Order confirmation + shipping emails (Resend). If unset, emails are
# skipped with a warning in the logs; checkout still works.
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="Upside Tree <orders@upsidetree.ca>"
EMAIL_REPLY_TO=hello@upsidetree.ca
# Used for links in emails and product structured data
NEXT_PUBLIC_SITE_URL=https://www.upsidetree.ca
```

## Architecture

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: Reusable UI components.
- `src/store`: Zustand stores (e.g., `useCartStore`, `useLanguageStore`).
- `src/utils`: Helper functions, Supabase clients.
- `schema.sql`: Complete PostgreSQL database schema.

## License

All rights reserved to Upside Tree.

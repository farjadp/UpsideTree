# Changelog

All notable changes to the **Upside Tree** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Global Admin Settings Architecture**:
  - Implemented dynamic database schema for `settings`, `media_assets`, `navigation_menus`, `announcement_bars`, `redirects`, and `custom_scripts`.
  - Created `GET`, `POST`, `PUT`, `DELETE` API endpoints for settings (`/api/admin/settings`).
  - Built the Settings Shell Layout (`SettingsLayout`) with a responsive 2-column sidebar navigation.
  - Implemented the General Settings page and interactive client form.
  - Implemented the Branding Settings page, featuring dynamic color pickers, font selectors, and brand asset (logo) upload slots.
- **Purchase Flow Foundation**:
  - Defined comprehensive database schema for `carts`, `orders`, `coupons`, `shipping_zones`, and `tax_rates`.
  - Integrated cart session logic and anonymous/guest cart support.
- **Internationalization (i18n)**:
  - Added bilingual support for English (EN) and Persian (FA).
  - Integrated `zustand` store (`useLanguageStore`) for seamless language switching across the frontend.

### Changed
- Refactored `schema.sql` to consolidate all database schemas (Admin Settings, Purchase Flow, Products, Users) with comprehensive Row Level Security (RLS) policies.
- Upgraded Admin layout to feature modern glassmorphism UI and dynamic background effects.

### Fixed
- Addressed module resolution issues with `zustand` imports in Next.js Client and Server components.

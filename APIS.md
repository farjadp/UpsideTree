# Upside Tree API Documentation

This document outlines the core internal and external APIs used within the Upside Tree platform.

## Admin Settings API

The Settings API is used by the admin dashboard to manage global configurations. All settings are stored in the `settings` database table.

### `GET /api/admin/settings`
Retrieves a list of settings.

**Query Parameters:**
- `namespace` (optional): Filter settings by namespace (e.g., `general`, `branding`, `seo`).
- `is_public` (optional): If set to `true`, only returns settings flagged as public.

**Response:**
Returns an object where keys are namespaces, containing key-value pairs of settings.
```json
{
  "settings": {
    "general": {
      "store_name": "Upside Tree",
      "currency": "USD"
    },
    "branding": {
      "color_primary": "#1D4E89"
    }
  },
  "raw": [ ... ]
}
```

### `POST /api/admin/settings`
Upserts a single setting. Requires Admin authentication.

**Body:**
```json
{
  "namespace": "general",
  "key": "store_name",
  "value": "Upside Tree",
  "value_type": "string",
  "label_en": "Store Name",
  "description": "The public name of your store",
  "is_secret": false,
  "is_public": true
}
```

### `GET /api/admin/settings/[namespace]/[key]`
Retrieves a specific setting by its namespace and key.

### `PUT /api/admin/settings/[namespace]/[key]`
Updates the value of a specific setting. Requires Admin authentication.

**Body:**
```json
{
  "value": "New Store Name",
  "value_type": "string"
}
```

### `DELETE /api/admin/settings/[namespace]/[key]`
Deletes a specific setting. Requires Admin authentication.

---

## Upcoming APIs (Phase 3 & 4)

- **Cart API**: Endpoints for managing the shopping cart session (add, remove, update quantities, apply coupons).
- **Checkout API**: Stripe integration endpoints for creating PaymentIntents and verifying transactions.
- **Media API**: Endpoints for uploading and managing images in Supabase Storage.
- **Loyalty API**: Endpoints for awarding and retrieving customer loyalty points.

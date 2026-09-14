// Public contact details shown across the storefront and in emails. One place
// so the legal pages, contact page, and support notifications never disagree.
// SUPPORT_INBOX_EMAIL can route staff notifications elsewhere without
// changing what customers see.

export const CONTACT_EMAIL = "farjad@ashavid.ca";
export const CONTACT_PHONE_E164 = "+14376611674";
export const CONTACT_PHONE_DISPLAY = "+1 (437) 661-1674";

export function supportInboxEmail() {
  return process.env.SUPPORT_INBOX_EMAIL || CONTACT_EMAIL;
}

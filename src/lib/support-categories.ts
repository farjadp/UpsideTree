// Ticket categories shared by the public support form, the account form, and
// the admin inbox. Values must match support_tickets_category_check.

export const SUPPORT_CATEGORIES = [
  { value: "order", label: "Order issue", fa: "مشکل سفارش" },
  { value: "shipping", label: "Shipping & delivery", fa: "ارسال و تحویل" },
  { value: "return", label: "Damaged, misprinted, or wrong item", fa: "کالای آسیب‌دیده یا اشتباه" },
  { value: "product", label: "Product question", fa: "سؤال درباره محصول" },
  { value: "payment", label: "Payment or billing", fa: "پرداخت" },
  { value: "account", label: "Account & login", fa: "حساب کاربری" },
  { value: "complaint", label: "Complaint", fa: "شکایت" },
  { value: "privacy", label: "Privacy or data request", fa: "درخواست حریم خصوصی" },
  { value: "general", label: "Something else", fa: "موارد دیگر" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["value"];

export const SUPPORT_CATEGORY_VALUES = SUPPORT_CATEGORIES.map((c) => c.value) as [
  SupportCategory,
  ...SupportCategory[],
];

export function supportCategoryLabel(value: string | null | undefined) {
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label ?? "General";
}

export const SUPPORT_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  orderReference: 60,
  subject: 150,
  bodyMin: 10,
  bodyMax: 5000,
} as const;

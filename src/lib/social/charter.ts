import "server-only";

// Brand Charter rules for the social engine (Notion: "00 · Brand Charter",
// v0.2, Sep 2026). The Charter is the source of truth; when it changes, update
// CHARTER_RULES, the term lists and the blackout dates here.

export const CHARTER_RULES = `BRAND CHARTER (overrides every other instruction):
Stance: Upside Tree is Iran-centred and patriotic. It tells all of Iran's history and culture, from Elam to today, through its Iranian roots; religion stays out of the content; it has nothing in common with the Islamic Republic.

Hard rules:
1. Era is never banned; religious content always is. No Islamic religious content: no Quranic verses, prayers, religious names, mosques/shrines/mihrabs, religious occasions (Ramadan, Muharram, Eid, etc.). Iranian forms seen in religious buildings are shown only through their non-religious Iranian root (Sasanian chahartaq, palaces, carpets, termeh, khatam, kilim), never via a mosque. Script is described as Persian (Nastaliq, Persian calligraphy), never "Arabic", unless the text truly is Arabic, which the brand does not use.
2. Excluded entirely: every Islamic Republic symbol, flag with its emblem, cleric, official or slogan (1979 and after); leftist symbols (hammer and sickle, red star, Che Guevara, leftist raised fist); the Tudeh party, Fadaiyan, MEK/Mojahedin, separatist groups; Shariati, Jalal Al-e Ahmad, Samad Behrangi, Khosrow Golsorkhi, Shamloo; Mosaddegh.
3. Patriotism: "Iranian" means every Iranian people (Persian, Kurdish, Turkic/Azeri, Lur, Baluch, Gilak, Mazani, Khuzestani Arab, Turkmen, Armenian, Assyrian, Zoroastrian). Never: separatism or questioning Iran's territorial integrity, an incomplete map of Iran, any name other than "Persian Gulf", mocking any Iranian people, anti-Iran content even as a joke. The Pahlavi era is never belittled.
4. Lion and Sun is a symbol of Iran, never placed next to a party, group or slogan. The crowned version belongs only to the "Pahlavi Iran" line with a precise historical caption.
5. "Woman, Life, Freedom" only in that exact Persian form (زن، زندگی، آزادی) / English "Woman, Life, Freedom" — never the Kurdish form, never next to leftist or separatist names or symbols — and only when the product itself is about it.
6. The events of Dey 1404: never mention, allude to or reference them in product posts. Memorial content is non-commercial and human-written only.
7. Faravahar is a cultural and national symbol; Avesta prayers are never decoration.
8. Truth: no invented history, dates, quotes, poems, statistics, provenance or symbol meanings. Until the Symbol Registry exists, make NO historical or symbolic claims beyond what is literally visible on the product and the facts provided. Never quote poetry or song lyrics. The brand never claims a personal memory; narrate as "we" (the brand) or "you" (the reader).
9. Tone: rooted, creative, bold, precise, warm — "proud, not loud". Professional language; firm stance, never insulting to any person or faith. No political slogans in product posts. Avoid ancient/royal/luxury/timeless/exotic/mystical and "premium".
10. Language: natural in each language, never word-for-word translation. Any Persian text printed on the product is given its English meaning in the English part.`;

// Checked on every generated field and hashtag. Lower-cased substring match;
// keep entries specific enough not to hit ordinary words.
const BANNED_TERMS: { term: string; rule: string }[] = [
  // Religion (Charter §1, §7)
  { term: "arabic", rule: "Script is Persian, not Arabic (§2)" },
  { term: "islamic", rule: "No Islamic content (§1)" },
  { term: "اسلامی", rule: "No Islamic content (§1)" },
  { term: "mosque", rule: "No religious buildings (§2)" },
  { term: "مسجد", rule: "No religious buildings (§2)" },
  { term: "quran", rule: "No religious text (§1)" },
  { term: "قرآن", rule: "No religious text (§1)" },
  { term: "ramadan", rule: "No religious occasions (§7)" },
  { term: "رمضان", rule: "No religious occasions (§7)" },
  { term: "muharram", rule: "No religious occasions (§7)" },
  { term: "محرم", rule: "No religious occasions (§7)" },
  { term: "girih", rule: "Use carpet, termeh or khatam instead of girih (§2)" },
  { term: "گره‌چینی", rule: "Use carpet, termeh or khatam instead of girih (§2)" },
  // Geography (§8)
  { term: "arabian gulf", rule: "Only 'Persian Gulf' (§8)" },
  { term: "خلیج عربی", rule: "Only 'Persian Gulf' (§8)" },
  // Kurdish form of Woman, Life, Freedom (§5)
  { term: "jin jiyan", rule: "Only the Persian form of Woman, Life, Freedom (§5)" },
  { term: "jinjiyan", rule: "Only the Persian form of Woman, Life, Freedom (§5)" },
  { term: "ژن ژیان", rule: "Only the Persian form of Woman, Life, Freedom (§5)" },
  { term: "ژن_ژیان", rule: "Only the Persian form of Woman, Life, Freedom (§5)" },
  // Excluded groups and people (§7)
  { term: "tudeh", rule: "Excluded group (§7)" },
  { term: "توده‌ای", rule: "Excluded group (§7)" },
  { term: "fadaiyan", rule: "Excluded group (§7)" },
  { term: "فدایی", rule: "Excluded group (§7)" },
  { term: "mojahedin", rule: "Excluded group (§7)" },
  { term: "mujahedin", rule: "Excluded group (§7)" },
  { term: "مجاهدین", rule: "Excluded group (§7)" },
  { term: "shariati", rule: "Excluded figure (§7)" },
  { term: "شریعتی", rule: "Excluded figure (§7)" },
  { term: "آل‌احمد", rule: "Excluded figure (§7)" },
  { term: "al-e ahmad", rule: "Excluded figure (§7)" },
  { term: "behrangi", rule: "Excluded figure (§7)" },
  { term: "بهرنگی", rule: "Excluded figure (§7)" },
  { term: "golsorkhi", rule: "Excluded figure (§7)" },
  { term: "گلسرخی", rule: "Excluded figure (§7)" },
  { term: "shamloo", rule: "Excluded figure (§3, §7)" },
  { term: "شاملو", rule: "Excluded figure (§3, §7)" },
  { term: "mosaddegh", rule: "Not used (§7)" },
  { term: "mossadegh", rule: "Not used (§7)" },
  { term: "مصدق", rule: "Not used (§7)" },
  { term: "che guevara", rule: "Excluded symbol (§7)" },
  { term: "چه‌گوارا", rule: "Excluded symbol (§7)" },
  // Dey 1404 stays out of automatic product posts (§4)
  { term: "دی ۱۴۰۴", rule: "Dey 1404 is never in product posts (§4)" },
  { term: "دی 1404", rule: "Dey 1404 is never in product posts (§4)" },
  { term: "جان‌باختگان", rule: "Memorial content is human-written only (§4)" },
  // Voice (§9, Brand Identity)
  { term: "premium", rule: "No 'premium' on print-on-demand (Brand Identity)" },
];

export type CharterViolation = { field: string; term: string; rule: string };

/** Deterministic Charter check over every text field of a generated post. */
export function lintAgainstCharter(fields: Record<string, string | string[]>): CharterViolation[] {
  const violations: CharterViolation[] = [];
  for (const [field, value] of Object.entries(fields)) {
    const text = (Array.isArray(value) ? value.join(" ") : value).toLowerCase().replace(/\u200c/g, "");
    for (const { term, rule } of BANNED_TERMS) {
      if (text.includes(term.toLowerCase().replace(/\u200c/g, ""))) violations.push({ field, term, rule });
    }
  }
  return violations;
}

/** Drops hashtags that break the Charter; the rest of the post can still go out. */
export function cleanHashtags(tags: string[]) {
  return tags.filter((tag) => lintAgainstCharter({ tag }).length === 0);
}

// Commercial auto-posting is paused on the Dey 1404 anniversaries (§4).
// Jalali month/day ranges, inclusive. The founder confirms the exact days;
// until then the whole month of Dey is paused. Override with
// SOCIAL_BLACKOUT_JALALI="10/01-10/30,..." (month/day).
const DEFAULT_BLACKOUT = "10/01-10/30";

function jalaliMonthDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/Toronto",
  }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return month * 100 + day;
}

export function blackoutReason(date = new Date()): string | null {
  const today = jalaliMonthDay(date);
  const ranges = (process.env.SOCIAL_BLACKOUT_JALALI || DEFAULT_BLACKOUT).split(",");
  for (const range of ranges) {
    const [start, end] = range.trim().split("-").map((part) => {
      const [month, day] = part.split("/").map(Number);
      return month * 100 + day;
    });
    if (!start || !end) continue;
    const inRange = start <= end ? today >= start && today <= end : today >= start || today <= end;
    if (inRange) return `Publishing paused: Dey 1404 anniversary period (${range.trim()} Jalali), Brand Charter §4.`;
  }
  return null;
}

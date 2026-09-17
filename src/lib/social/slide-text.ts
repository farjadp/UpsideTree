import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Bilingual story text on Instagram carousel slides. Text is typeset here,
// never by the image model (which garbles Persian): HarfBuzz shapes it with
// the brand fonts and the glyphs are drawn as SVG paths, so the result doesn't
// depend on which fonts or text engine the server has. Fonts are OFL-licensed
// and ship in assets/fonts/social (see outputFileTracingIncludes).

export type SlideText = { fa: string; en: string };

const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 72;
const TEXT_WIDTH = WIDTH - MARGIN * 2;
const INK = "#18231F";
const IVORY = "#F4EFE3";
const GOLD = "#B48635";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts", "social");
const FONTS = {
  persian: "Vazirmatn-Bold.ttf",
  english: "CormorantGaramond_500Medium_Italic.ttf",
  small: "CormorantGaramond_600SemiBold.ttf",
} as const;

type FontKey = keyof typeof FONTS;
type HbModule = typeof import("harfbuzzjs");
type LoadedFont = { hb: HbModule; font: InstanceType<HbModule["Font"]>; upem: number };

const fontCache = new Map<FontKey, Promise<LoadedFont>>();

function loadFont(key: FontKey) {
  let pending = fontCache.get(key);
  if (!pending) {
    pending = (async () => {
      const hb = await import("harfbuzzjs");
      const data = await readFile(path.join(FONT_DIR, FONTS[key]));
      const face = new hb.Face(new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
      return { hb, font: new hb.Font(face), upem: face.upem };
    })();
    fontCache.set(key, pending);
  }
  return pending;
}

type ShapedLine = { glyphs: { d: string; x: number; y: number }[]; width: number };

function shapeLine({ hb, font, upem }: LoadedFont, text: string, size: number): ShapedLine {
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(font, buffer);
  const scale = size / upem;
  let penX = 0;
  const glyphs: ShapedLine["glyphs"] = [];
  // HarfBuzz returns glyphs in visual (left-to-right) order, RTL included.
  const positions = buffer.getGlyphPositions();
  buffer.getGlyphInfos().forEach((info, index) => {
    const { xAdvance, xOffset, yOffset } = positions[index];
    const d = font.glyphToPath(info.codepoint);
    if (d) glyphs.push({ d, x: (penX + xOffset) * scale, y: -yOffset * scale });
    penX += xAdvance;
  });
  return { glyphs, width: penX * scale };
}

/** Greedy word wrap, measuring each candidate line with real shaping. */
function wrap(font: LoadedFont, text: string, size: number): ShapedLine[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: ShapedLine[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && shapeLine(font, candidate, size).width > TEXT_WIDTH) {
      lines.push(shapeLine(font, current, size));
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(shapeLine(font, current, size));
  return lines;
}

type Block = { svg: string; height: number };

async function textBlock(key: FontKey, text: string, size: number, color: string, align: "left" | "right"): Promise<(top: number) => Block> {
  const font = await loadFont(key);
  const lines = wrap(font, text, size);
  const lineHeight = Math.round(size * 1.45);
  const scale = size / font.upem;
  const height = Math.max(1, lines.length) * lineHeight;
  return (top) => {
    const paths: string[] = [];
    lines.forEach((line, index) => {
      const baseline = top + Math.round(size * 1.05) + index * lineHeight;
      const startX = align === "right" ? WIDTH - MARGIN - line.width : MARGIN;
      for (const glyph of line.glyphs) {
        // Font units are y-up; SVG is y-down.
        paths.push(
          `<path transform="translate(${(startX + glyph.x).toFixed(2)} ${(baseline + glyph.y).toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${glyph.d}"/>`
        );
      }
    });
    return { svg: `<g fill="${color}">${paths.join("")}</g>`, height };
  };
}

async function isBrightBottom(photo: Buffer) {
  const { data } = await sharp(photo)
    .extract({ left: 0, top: Math.round(HEIGHT * 0.65), width: WIDTH, height: Math.round(HEIGHT * 0.35) })
    .greyscale()
    .resize(32, 16)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
  return mean > 225;
}

/**
 * One carousel slide: the photo cropped to 4:5 with its Persian line and
 * English line at the bottom. Scenes get a dark scrim with ivory text; studio
 * mockups (band: true, or a bright bottom) get a solid ivory band with ink text.
 */
export async function renderSlideText(
  photo: Buffer,
  text: SlideText,
  options: { footer?: string; band?: boolean } = {}
) {
  const base = await sharp(photo).rotate().resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" }).toBuffer();
  const bright = options.band ?? (await isBrightBottom(base));
  const color = bright ? INK : IVORY;

  const [placeFa, placeEn, placeFooter] = await Promise.all([
    textBlock("persian", text.fa, 56, color, "right"),
    textBlock("english", text.en, 46, color, "left"),
    options.footer ? textBlock("small", options.footer, 26, GOLD, "left") : null,
  ]);

  // Stack against the bottom margin: Persian, English, optional footer.
  const gap = 16;
  const faHeight = placeFa(0).height;
  const enHeight = placeEn(0).height;
  const footerHeight = placeFooter ? placeFooter(0).height + gap : 0;
  const faTop = HEIGHT - MARGIN - (faHeight + gap + enHeight + footerHeight);
  const enTop = faTop + faHeight + gap;
  const ruleTop = faTop - 22;
  const fa = placeFa(faTop);
  const en = placeEn(enTop);
  const footer = placeFooter ? placeFooter(enTop + enHeight + gap) : null;

  const scrimTop = Math.max(0, ruleTop - 260);
  const backdrop = bright
    ? `<rect x="0" y="${ruleTop - 48}" width="${WIDTH}" height="${HEIGHT - ruleTop + 48}" fill="${IVORY}"/>`
    : `<defs><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="${INK}" stop-opacity="0"/>
         <stop offset="0.35" stop-color="${INK}" stop-opacity="0.55"/>
         <stop offset="1" stop-color="${INK}" stop-opacity="0.9"/>
       </linearGradient></defs>
       <rect x="0" y="${scrimTop}" width="${WIDTH}" height="${HEIGHT - scrimTop}" fill="url(#scrim)"/>`;

  const overlay = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${backdrop}
    <rect x="${WIDTH - MARGIN - 64}" y="${ruleTop}" width="64" height="4" fill="${GOLD}"/>
    ${fa.svg}${en.svg}${footer?.svg ?? ""}
  </svg>`;

  return sharp(base)
    .composite([{ input: Buffer.from(overlay), left: 0, top: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

// ============================================================================
// File: upside-tree/src/components/brand/PersianMotif.tsx
// Version: 1.0.0 — 2026-08-01
// Why: Decorative SVG Persian motif elements for use in hero sections and
//      brand story areas. Design rule: one motif per hero section maximum.
//      These are purely decorative (aria-hidden) — never used as content.
//
//      Available motifs:
//        cypress      — Geometric cypress silhouette (brand symbol)
//        pomegranate  — Stylized pomegranate (fertility, abundance)
//        geometric    — Muqarnas-inspired geometric pattern tile
//        border       — Repeating border ornament (horizontal)
//
//      Colors inherit from brand tokens via props.
//      All SVGs are self-contained — no external dependencies.
// Env / Identity: Frontend (React Server Component)
// ============================================================================

import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type MotifType = "cypress" | "pomegranate" | "geometric" | "border";

interface PersianMotifProps {
  motif?:     MotifType;
  size?:      number;
  color?:     string;
  className?: string;
  opacity?:   number;
}

// ------------------------------------------------------------------
// Individual Motif SVGs
// ------------------------------------------------------------------

function CypressMotif({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size * 1.8} viewBox="0 0 40 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stylized upright cypress */}
      <rect x="18" y="60" width="4" height="10" rx="2" fill={color} />
      <polygon points="20,4 4,36 36,36" fill={color} opacity="0.85" />
      <polygon points="20,16 7,44 33,44" fill={color} opacity="0.9" />
      <polygon points="20,28 10,52 30,52" fill={color} />
      <polygon points="20,38 13,58 27,58" fill={color} />
    </svg>
  );
}

function PomegranateMotif({ size, color, gold }: { size: number; color: string; gold: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pomegranate body */}
      <ellipse cx="30" cy="34" rx="18" ry="20" fill={color} opacity="0.15" />
      <ellipse cx="30" cy="34" rx="18" ry="20" stroke={color} strokeWidth="2" />
      {/* Crown */}
      <path d="M22 14 L24 8 L27 13 L30 6 L33 13 L36 8 L38 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Stem */}
      <line x1="30" y1="14" x2="30" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Seeds (gold dots) */}
      {[
        [24, 28], [30, 25], [36, 28], [22, 34], [30, 32], [38, 34],
        [25, 40], [30, 38], [35, 40],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2" fill={gold} />
      ))}
    </svg>
  );
}

function GeometricMotif({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Eight-pointed star — common in Persian/Islamic geometry */}
      <g opacity="0.12" fill={color}>
        <rect x="28" y="8" width="24" height="64" rx="2" transform="rotate(0, 40, 40)" />
        <rect x="28" y="8" width="24" height="64" rx="2" transform="rotate(45, 40, 40)" />
        <rect x="28" y="8" width="24" height="64" rx="2" transform="rotate(90, 40, 40)" />
        <rect x="28" y="8" width="24" height="64" rx="2" transform="rotate(135, 40, 40)" />
      </g>
      {/* Outline star */}
      <path
        d="M40 10 L47 28 L66 28 L52 40 L58 58 L40 47 L22 58 L28 40 L14 28 L33 28 Z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <circle cx="40" cy="40" r="4" fill={color} opacity="0.5" />
    </svg>
  );
}

function BorderMotif({ width, color }: { width: number; color: string }) {
  // Repeating knotwork border — 12px tall, variable width
  const pattern = "M0 6 Q3 0 6 6 Q9 12 12 6 Q15 0 18 6 Q21 12 24 6";
  const repeats = Math.floor(width / 24);
  return (
    <svg width={width} height={12} viewBox={`0 0 ${repeats * 24} 12`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: repeats }).map((_, i) => (
        <path
          key={i}
          d={pattern}
          transform={`translate(${i * 24}, 0)`}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------
// PersianMotif — main exported component
// ------------------------------------------------------------------

export function PersianMotif({
  motif     = "cypress",
  size      = 48,
  color     = "#1D4E89",
  className,
  opacity   = 1,
}: PersianMotifProps) {
  const goldColor = "#B48635";

  const renderMotif = () => {
    switch (motif) {
      case "cypress":
        return <CypressMotif size={size} color={color} />;
      case "pomegranate":
        return <PomegranateMotif size={size} color={color} gold={goldColor} />;
      case "geometric":
        return <GeometricMotif size={size} color={color} />;
      case "border":
        return <BorderMotif width={size * 4} color={color} />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn("inline-block pointer-events-none select-none", className)}
      style={{ opacity }}
      aria-hidden="true"
      role="presentation"
    >
      {renderMotif()}
    </span>
  );
}

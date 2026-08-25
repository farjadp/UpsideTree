import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Size Guide" };

export default function SizingPage() {
  return (
    <InfoPage
      titleEn="Size Guide"
      titleFa="راهنمای سایز"
      intro="Exact dimensions live on each product page under its size options — this is the quick orientation."
    >
      <div>
        <h2>Canvas wall art</h2>
        <ul>
          <li>Small (up to 11×14″) — desks, shelves, gallery walls.</li>
          <li>Medium (16×20″ / 18×24″) — the everyday statement size.</li>
          <li>Large (24×32″ and up) — a focal point for a living room wall.</li>
        </ul>
      </div>
      <div>
        <h2>Jewelry</h2>
        <p>
          Pendant and dog tag dimensions are listed per product. Chains are standard lengths noted in
          each piece's options.
        </p>
      </div>
      <div>
        <h2>Mugs</h2>
        <p>11oz is the classic coffee mug; 15oz is the generous one.</p>
      </div>
    </InfoPage>
  );
}

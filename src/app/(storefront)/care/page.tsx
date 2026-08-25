import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Care Instructions" };

export default function CarePage() {
  return (
    <InfoPage
      titleEn="Care Instructions"
      titleFa="نگهداری"
      intro="Objects that carry stories deserve to last. A few habits keep each piece the way it arrived."
    >
      <div>
        <h2>Canvas</h2>
        <ul>
          <li>Dust with a soft, dry cloth — no sprays or solvents.</li>
          <li>Hang away from direct sunlight and humidity (bathrooms, kitchens).</li>
        </ul>
      </div>
      <div>
        <h2>Jewelry</h2>
        <ul>
          <li>Wipe with a soft cloth after wear; store dry.</li>
          <li>Remove before swimming or showering.</li>
        </ul>
      </div>
      <div>
        <h2>Mugs</h2>
        <p>Dishwasher and microwave safe — though hand washing keeps the print crisp longest.</p>
      </div>
    </InfoPage>
  );
}

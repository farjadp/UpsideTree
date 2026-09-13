import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { CartDrawer } from "@/components/store/CartDrawer";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { getUsdRates } from "@/lib/fx";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Without rates, EUR simply isn't offered.
  const cadToEur = await getUsdRates()
    .then((rates) => rates.EUR / rates.CAD)
    .catch(() => null);

  return (
    <CurrencyProvider cadToEur={cadToEur}>
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <CartDrawer />
    </div>
    </CurrencyProvider>
  );
}

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { CartDrawer } from "@/components/store/CartDrawer";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { getUsdRates } from "@/lib/fx";
import { GivingProvider } from "@/components/giving/GivingProvider";
import { getGivingSettings } from "@/lib/giving";
import { createClient } from "@/utils/supabase/server";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Without rates, EUR simply isn't offered.
  const supabase = await createClient();
  const [cadToEur, giving] = await Promise.all([
    getUsdRates()
      .then((rates) => rates.EUR / rates.CAD)
      .catch(() => null),
    getGivingSettings(supabase).catch(() => ({ enabled: false })),
  ]);

  return (
    <CurrencyProvider cadToEur={cadToEur}>
    <GivingProvider enabled={giving.enabled}>
    <div className="min-h-screen flex flex-col relative">
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer givingEnabled={giving.enabled} />
      <BottomNav />
      <CartDrawer />
    </div>
    </GivingProvider>
    </CurrencyProvider>
  );
}

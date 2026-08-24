"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

// The invoice page itself is a server component; only the print trigger
// needs to be a client component.
export function PrintInvoiceButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="gap-2 bg-[#18231F] text-[#F4EFE3] hover:bg-[#18231F]/90"
    >
      <Printer className="h-4 w-4" />
      Print / Save as PDF
    </Button>
  );
}

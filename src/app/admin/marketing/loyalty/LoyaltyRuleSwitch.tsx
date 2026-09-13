"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setLoyaltyRuleActive } from "./actions";

export function LoyaltyRuleSwitch({ ruleId, active }: { ruleId: string; active: boolean }) {
  const [checked, setChecked] = useState(active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await setLoyaltyRuleActive(ruleId, next);
      if (result.error) {
        setChecked(!next);
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} disabled={pending} onCheckedChange={toggle} />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

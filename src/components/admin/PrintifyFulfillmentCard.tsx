"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Package, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export function PrintifyFulfillmentCard({
  orderId,
  printifyOrderId,
  fulfillmentStatus,
  fulfillmentError,
  fulfillmentAttempts,
  paymentStatus,
}: {
  orderId: string;
  printifyOrderId: string | null;
  fulfillmentStatus: string | null;
  fulfillmentError: string | null;
  fulfillmentAttempts: number | null;
  paymentStatus: string | null;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  // A "pending:" value is the in-flight claim token fulfillOrder() writes
  // before Printify responds — it isn't a real Printify id.
  const isClaimToken = printifyOrderId?.startsWith("pending:") ?? false;
  const submitted = Boolean(printifyOrderId) && !isClaimToken;
  const isPaid = paymentStatus === "paid";

  async function handleFulfill() {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/fulfill`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({ kind: "error", text: data.error ?? "Fulfillment failed." });
      } else {
        setFeedback({
          kind: "success",
          text:
            data.status === "already_submitted"
              ? "This order was already sent to Printify."
              : "Sent to Printify and queued for production.",
        });
        router.refresh();
      }
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Fulfillment failed." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Printify Fulfillment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md bg-gray-50 p-3 text-sm">
          {submitted ? (
            <>
              <p className="mb-1 flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Sent to Printify
              </p>
              <p className="text-gray-500">
                Printify order <span className="font-mono text-xs">{printifyOrderId}</span>
              </p>
              {fulfillmentStatus && (
                <p className="mt-1 text-gray-500">Status: {fulfillmentStatus.replace(/_/g, " ")}</p>
              )}
            </>
          ) : (
            <>
              <p className="mb-1 font-medium text-gray-900">
                {isPaid ? "Not yet sent" : "Waiting for payment"}
              </p>
              <p className="mb-3 text-gray-500">
                {isPaid
                  ? "Paid orders are sent to Printify automatically. Use retry if that didn't happen."
                  : "This order will be sent to Printify automatically once payment is confirmed."}
              </p>
              {isPaid && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleFulfill}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    `Send to Printify${(fulfillmentAttempts ?? 0) > 0 ? " (retry)" : ""}`
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        {fulfillmentError && !submitted && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <p className="font-medium">Last attempt failed</p>
              <p className="mt-0.5">{fulfillmentError}</p>
              {(fulfillmentAttempts ?? 0) > 0 && (
                <p className="mt-1 text-amber-700/70">
                  {fulfillmentAttempts} attempt{fulfillmentAttempts === 1 ? "" : "s"} so far
                </p>
              )}
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={`rounded-md p-3 text-xs ${
              feedback.kind === "error"
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

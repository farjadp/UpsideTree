"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { regenerateSocialAssets, retrySocialPost, runSocialQueueNow, skipSocialPost } from "./actions";

type Result = { error: string | null; message?: string };

function useAction() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Result | null>(null);
  const run = (action: () => Promise<Result>) => {
    setFeedback(null);
    startTransition(async () => setFeedback(await action()));
  };
  return { pending, feedback, run };
}

function Feedback({ result }: { result: Result | null }) {
  if (!result) return null;
  if (result.error) return <span className="text-xs text-red-600">{result.error}</span>;
  if (result.message) return <span className="text-xs text-gray-500">{result.message}</span>;
  return null;
}

export function RunQueueButton() {
  const { pending, feedback, run } = useAction();
  return (
    <div className="flex items-center gap-3">
      <Feedback result={feedback} />
      <Button disabled={pending} onClick={() => run(runSocialQueueNow)}>
        {pending ? "Posting… (can take 2–3 min)" : "Post next product now"}
      </Button>
    </div>
  );
}

export function SocialRowActions({ productId, status }: { productId: string; status: string }) {
  const { pending, feedback, run } = useAction();
  // Posted platforms are never re-posted, so a finished product has nothing to act on.
  if (status === "done") return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => retrySocialPost(productId))}>
          {status === "skipped" ? "Queue" : "Retry"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => regenerateSocialAssets(productId))}>
          New image
        </Button>
        {status !== "skipped" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => skipSocialPost(productId))}>
            Skip
          </Button>
        )}
      </div>
      <Feedback result={feedback} />
    </div>
  );
}

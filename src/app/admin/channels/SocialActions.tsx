"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { REJECT_REASONS } from "@/lib/social/approval-protocol";
import {
  approveSocialPost,
  chooseAlternativeAngle,
  regenerateSocialAssets,
  rejectSocialPost,
  retrySocialPost,
  runSocialQueueNow,
  skipSocialPost,
} from "./actions";

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

// A draft waiting for the founder: approve, swap the angle, or reject with a
// reason. The same decisions as the Telegram buttons, written to the same log.
function ReviewActions({ productId, alternatives, stage }: { productId: string; alternatives: number; stage: "copy" | "visual" }) {
  const { pending, feedback, run } = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string>("repeat");
  const [note, setNote] = useState("");

  if (rejecting) {
    return (
      <div className="flex flex-col items-end gap-2">
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1 text-xs">
          {Object.entries(REJECT_REASONS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-56 rounded-md border border-gray-200 px-2 py-1 text-xs"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>
            Back
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => rejectSocialPost(productId, reason, note))}>
            Reject
          </Button>
        </div>
        <Feedback result={feedback} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => approveSocialPost(productId))}>
          {stage === "copy" ? "Approve text" : "Approve & post"}
        </Button>
        {alternatives > 0 && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => chooseAlternativeAngle(productId, 0))}>
            Angle 1
          </Button>
        )}
        {alternatives > 1 && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => chooseAlternativeAngle(productId, 1))}>
            Angle 2
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejecting(true)}>
          Reject
        </Button>
      </div>
      <Feedback result={feedback} />
    </div>
  );
}

export function SocialRowActions({ productId, status, alternatives }: { productId: string; status: string; alternatives: number }) {
  const { pending, feedback, run } = useAction();
  // Posted platforms are never re-posted, so a finished product has nothing to act on.
  if (status === "done") return null;
  if (status === "copy_review") return <ReviewActions productId={productId} alternatives={alternatives} stage="copy" />;
  if (status === "review") return <ReviewActions productId={productId} alternatives={alternatives} stage="visual" />;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => retrySocialPost(productId))}>
          {status === "skipped" || status === "rejected" ? "Queue" : status === "approved" ? "Post again" : status === "copy_approved" ? "Make images" : "Retry"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => regenerateSocialAssets(productId))}>
          New draft
        </Button>
        {status !== "skipped" && status !== "rejected" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => skipSocialPost(productId))}>
            Skip
          </Button>
        )}
      </div>
      <Feedback result={feedback} />
    </div>
  );
}

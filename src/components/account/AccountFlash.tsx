import { AlertCircle, CheckCircle2 } from "lucide-react";

// Every account action redirects back with ?message= or ?error=, so the
// banner is rendered from searchParams on the server rather than held in
// client state — a full page load after a mutation still shows it.
export function AccountFlash({
  message,
  error,
}: {
  message?: string | string[];
  error?: string | string[];
}) {
  const messageText = Array.isArray(message) ? message[0] : message;
  const errorText = Array.isArray(error) ? error[0] : error;

  if (!messageText && !errorText) return null;

  return (
    <div className="mb-6 space-y-3">
      {errorText && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}
      {messageText && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{messageText}</span>
        </div>
      )}
    </div>
  );
}

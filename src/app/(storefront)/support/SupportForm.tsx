"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { SUPPORT_CATEGORIES, SUPPORT_LIMITS } from "@/lib/support-categories";
import { submitSupportRequest, type SupportFormState } from "./actions";

const fieldClass =
  "w-full rounded border border-ink-500/20 bg-white px-3 text-sm text-ink-500 placeholder:text-ink-400/60 focus:border-lapis-500 focus:outline-none focus:ring-1 focus:ring-lapis-500 aria-invalid:border-pomegranate-500";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <div id={id} className="mt-1.5 text-xs text-pomegranate-500">
      {message}
    </div>
  );
}

function Label({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-500">
      {children}
      {optional && <span className="ml-1 font-normal text-ink-400">(optional)</span>}
    </label>
  );
}

export function SupportForm({
  defaultCategory,
  defaultName = "",
  defaultEmail = "",
}: {
  defaultCategory: string;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, formAction, pending] = useActionState<SupportFormState, FormData>(submitSupportRequest, {
    status: "idle",
  });
  // Stamped after mount rather than during render, so server and client markup match.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const [bodyLength, setBodyLength] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    setBodyLength(state.status === "error" ? state.values?.body?.length ?? 0 : 0);
  }

  if (state.status === "success") {
    const isComplaint = state.category === "complaint";
    return (
      <div className="rounded-lg border border-turquoise-500/30 bg-white p-6" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-turquoise-500" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <div className="font-display text-lg font-semibold text-ink-500">We&apos;ve received your request</div>
            <div className="text-sm text-ink-400">
              Your reference number is <strong className="font-mono text-ink-500">{state.ticketNumber}</strong>. A
              copy is on its way to your inbox.{" "}
              {isComplaint
                ? "We'll acknowledge your complaint within 2 business days and aim to resolve it within 10."
                : "We usually reply within one business day."}
            </div>
            <div className="font-persian text-sm text-ink-400" lang="fa" dir="rtl">
              درخواست شما ثبت شد. شماره پیگیری را نزد خود نگه دارید.
            </div>
            <Link href="/" className="mt-2 text-sm font-medium text-lapis-500 hover:text-turquoise-500">
              Back to the store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors ?? {} : {};
  const values = state.status === "error" ? state.values ?? {} : {};
  const invalid = (key: string) => (errors[key] ? { "aria-invalid": true, "aria-describedby": `${key}-error` } : {});

  return (
    // Remount on each result so inputs pick up the echoed values after React's form reset.
    <form
      key={JSON.stringify(values)}
      action={(formData) => {
        formData.set("started_at", String(startedAt.current));
        formAction(formData);
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      {state.status === "error" && (
        <div
          className="flex items-start gap-3 rounded border border-pomegranate-500/30 bg-pomegranate-500/5 px-4 py-3 text-sm text-pomegranate-500"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
      )}

      {/* Spam traps: hidden from people, filled by bots. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <Label htmlFor="category">What is this about?</Label>
        <select
          id="category"
          name="category"
          defaultValue={values.category || defaultCategory}
          required
          className={cn(fieldClass, "h-11")}
          {...invalid("category")}
        >
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label} · {c.fa}
            </option>
          ))}
        </select>
        <FieldError id="category-error" message={errors.category} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            maxLength={SUPPORT_LIMITS.name}
            defaultValue={values.name ?? defaultName}
            className={cn(fieldClass, "h-11")}
            {...invalid("name")}
          />
          <FieldError id="name-error" message={errors.name} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={SUPPORT_LIMITS.email}
            defaultValue={values.email ?? defaultEmail}
            className={cn(fieldClass, "h-11")}
            {...invalid("email")}
          />
          <FieldError id="email-error" message={errors.email} />
        </div>
        <div>
          <Label htmlFor="phone" optional>
            Phone
          </Label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={values.phone}
            maxLength={SUPPORT_LIMITS.phone}
            className={cn(fieldClass, "h-11")}
            {...invalid("phone")}
          />
          <FieldError id="phone-error" message={errors.phone} />
        </div>
        <div>
          <Label htmlFor="order_reference" optional>
            Order number
          </Label>
          <input
            id="order_reference"
            name="order_reference"
            type="text"
            placeholder="UT-20260913-A1B2C3"
            defaultValue={values.order_reference}
            maxLength={SUPPORT_LIMITS.orderReference}
            className={cn(fieldClass, "h-11 font-mono")}
            {...invalid("orderReference")}
          />
          <FieldError id="orderReference-error" message={errors.orderReference} />
        </div>
      </div>

      <div>
        <Label htmlFor="subject">Subject</Label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={SUPPORT_LIMITS.subject}
          placeholder="A short summary"
          defaultValue={values.subject}
          className={cn(fieldClass, "h-11")}
          {...invalid("subject")}
        />
        <FieldError id="subject-error" message={errors.subject} />
      </div>

      <div>
        <Label htmlFor="body">Message</Label>
        <textarea
          id="body"
          name="body"
          rows={7}
          required
          minLength={SUPPORT_LIMITS.bodyMin}
          maxLength={SUPPORT_LIMITS.bodyMax}
          defaultValue={values.body}
          onChange={(event) => setBodyLength(event.target.value.length)}
          placeholder="What happened, what you expected, and what would put it right. For a damaged or misprinted item, mention it here and we'll ask for a photo."
          className={cn(fieldClass, "py-2.5 leading-relaxed")}
          {...invalid("body")}
        />
        <div className="mt-1.5 flex justify-between gap-4">
          <FieldError id="body-error" message={errors.body} />
          <span className="ml-auto text-xs text-ink-400">
            {bodyLength}/{SUPPORT_LIMITS.bodyMax}
          </span>
        </div>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-ink-400">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={values.consent === "on"}
            className="mt-0.5 h-4 w-4 shrink-0 accent-lapis-500"
            {...invalid("consent")}
          />
          <span>
            Upside Tree may use these details to respond to my request, as described in the{" "}
            <Link href="/privacy" className="font-medium text-lapis-500 hover:text-turquoise-500">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <FieldError id="consent-error" message={errors.consent} />
      </div>

      <div>
        <Button type="submit" disabled={pending} className="h-11 px-6">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}

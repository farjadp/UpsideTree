import type { UserActivityPayload } from "./server";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class UpsideLogger {
  private queue: UserActivityPayload[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private sessionId: string;
  private customerId: string | null = null;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === "undefined") return generateUUID();
    
    let sid = sessionStorage.getItem("upside_session_id");
    if (!sid) {
      sid = generateUUID();
      sessionStorage.setItem("upside_session_id", sid);
    }
    return sid;
  }

  public setCustomerId(id: string) {
    this.customerId = id;
    // Retroactively update queued events that missed the customer ID
    this.queue = this.queue.map(event => ({
      ...event,
      customer_id: event.customer_id || id
    }));
  }

  public track(event_type: string, event_category: string, metadata?: any) {
    if (typeof window === "undefined") return;

    const event: UserActivityPayload = {
      session_id: this.sessionId,
      customer_id: this.customerId,
      event_type,
      event_category,
      page_url: window.location.href,
      referrer_url: document.referrer || undefined,
      device_type: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      metadata,
    };

    this.queue.push(event);
    this.scheduleBatch();
  }

  private scheduleBatch() {
    if (this.batchInterval) return;

    this.batchInterval = setTimeout(() => {
      this.flush();
    }, 5000); // 5 seconds batching
  }

  private async flush(isRetry = false) {
    if (this.queue.length === 0) {
      this.batchInterval = null;
      return;
    }

    const payload = [...this.queue];
    this.queue = [];
    this.batchInterval = null;

    try {
      const response = await fetch("/api/logger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activities: payload }),
      });

      if (!response.ok && !isRetry) {
        // Retry once after 10 seconds if failed
        setTimeout(() => {
          this.queue.push(...payload);
          this.flush(true);
        }, 10000);
      }
    } catch (error) {
      // Retry once if network error
      if (!isRetry) {
        setTimeout(() => {
          this.queue.push(...payload);
          this.flush(true);
        }, 10000);
      }
    }
  }

  private getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "tablet";
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "mobile";
    return "desktop";
  }

  private getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("SamsungBrowser")) return "Samsung Browser";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
    if (ua.includes("Trident")) return "Internet Explorer";
    if (ua.includes("Edge")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Safari")) return "Safari";
    return "Unknown";
  }

  private getOS() {
    const ua = navigator.userAgent;
    if (ua.includes("Win")) return "Windows";
    if (ua.includes("Mac")) return "MacOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("like Mac")) return "iOS";
    return "Unknown";
  }
}

export const logger = new UpsideLogger();

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { PINTEREST_TAG_ID, pinTrack } from "@/lib/pinterest-tag";

/** Pinterest base tag plus a `page` event on every client-side navigation. */
export function PinterestTag() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    // The inline script already fires `page` for the first load.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (window.pintrk && !pathname.startsWith("/admin")) window.pintrk("page");
  }, [pathname]);

  if (!PINTEREST_TAG_ID || pathname.startsWith("/admin")) return null;

  return (
    <>
      <Script id="pinterest-tag" strategy="afterInteractive">
        {`!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', ${JSON.stringify(PINTEREST_TAG_ID)});
pintrk('page');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Pinterest's no-JS pixel */}
        <img
          height="1"
          width="1"
          className="hidden"
          alt=""
          src={`https://ct.pinterest.com/v3/?event=init&tid=${PINTEREST_TAG_ID}&noscript=1`}
        />
      </noscript>
    </>
  );
}

/** Fires `pagevisit` once for a product page. */
export function PinterestProductView({ productId, name, price }: { productId: string; name: string; price: number }) {
  useEffect(() => {
    pinTrack("pagevisit", { line_items: [{ product_id: productId, product_name: name, product_price: price }] });
  }, [productId, name, price]);
  return null;
}

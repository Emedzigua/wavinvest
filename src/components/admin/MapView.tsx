"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Depot } from "@/lib/admin/types";

export type Pin = { id: string; lat: number; lng: number; label: string; sub?: string; href?: string; color?: string };

// Modern vector map (OpenFreeMap, free incl. commercial use, no key)
const STYLE = "https://tiles.openfreemap.org/styles/positron";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const FACTORY =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M2 21V10l6 3.5V10l6 3.5V4h3v4h3v13H2Zm4-3h2v-2H6v2Zm5 0h2v-2h-2v2Zm5 0h2v-2h-2v2Z"/></svg>';
const CUSTOMER =
  '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.5" r="4"/><path d="M4 20.5c0-4.1 3.6-7 8-7s8 2.9 8 7v.5H4v-.5Z"/></svg>';

function marker(html: string, className: string, color?: string) {
  const el = document.createElement("div");
  el.className = className;
  if (color) el.style.setProperty("--pin", color);
  el.innerHTML = html;
  return el;
}

export default function MapView({
  pins,
  depots = [],
  height = 360,
  zoom = 11,
}: {
  pins: Pin[];
  depots?: Depot[];
  height?: number;
  zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  // Only rebuild the map when the data really changes, not on every render
  const key = JSON.stringify([pins, depots.map((d) => [d.id, d.name, d.lat, d.lng])]);

  useEffect(() => {
    const node = el.current;
    if (!node || pins.length === 0) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    import("maplibre-gl").then((ml) => {
      if (cancelled) return;
      // The bundler can't resolve MapLibre's worker, so it is served from /public (same version)
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new ml.Map({ container: node, style: STYLE, attributionControl: { compact: true }, cooperativeGestures: true });
      map = m;
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-left");

      for (const d of depots) {
        new ml.Marker({ element: marker(FACTORY, "pin-depot") })
          .setLngLat([d.lng, d.lat])
          .setPopup(new ml.Popup({ offset: 18, closeButton: false }).setHTML(`<strong>Sklad ${escape(d.name)}</strong>`))
          .addTo(m);
      }
      for (const p of pins) {
        const title = p.href ? `<a href="${p.href}">${escape(p.label)}</a>` : escape(p.label);
        new ml.Marker({ element: marker(CUSTOMER, "pin-customer", p.color) })
          .setLngLat([p.lng, p.lat])
          .setPopup(
            new ml.Popup({ offset: 18, closeButton: false }).setHTML(
              `<strong>${title}</strong>${p.sub ? `<br><span>${escape(p.sub)}</span>` : ""}`,
            ),
          )
          .addTo(m);
      }

      const bounds = new ml.LngLatBounds();
      for (const p of pins) bounds.extend([p.lng, p.lat]);
      for (const d of depots) bounds.extend([d.lng, d.lat]);
      m.fitBounds(bounds, { padding: 56, maxZoom: zoom, duration: 0 });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers pins and depots
  }, [key, zoom]);

  if (pins.length === 0) return null;
  return <div ref={el} className="adm-map" style={{ minHeight: height }} />;
}

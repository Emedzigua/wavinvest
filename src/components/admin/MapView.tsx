"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Depot } from "@/lib/admin/types";

export type Pin = { id: string; lat: number; lng: number; label: string; sub?: string; href?: string; status?: string };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// OpenStreetMap map with customer pins and the warehouses as dark squares.
// Leaflet touches `window`, so it is loaded in the browser only.
export default function MapView({
  pins,
  depots = [],
  height = 360,
  zoom = 12,
}: {
  pins: Pin[];
  depots?: Depot[];
  height?: number;
  zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  // Only rebuild the map when the data really changes, not on every render
  const key = JSON.stringify([pins, depots.map((d) => [d.id, d.lat, d.lng])]);

  useEffect(() => {
    const node = el.current;
    if (!node || pins.length === 0) return;
    let map: import("leaflet").Map | undefined;
    let observer: ResizeObserver | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled) return;
      map = L.map(node, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      for (const p of pins) {
        const icon = L.divIcon({ className: `map-pin map-pin--${p.status ?? "active"}`, iconSize: [18, 18] });
        const title = p.href ? `<a href="${p.href}">${escape(p.label)}</a>` : escape(p.label);
        L.marker([p.lat, p.lng], { icon, title: p.label })
          .bindPopup(`<strong>${title}</strong>${p.sub ? `<br>${escape(p.sub)}` : ""}`)
          .addTo(map);
      }
      for (const d of depots) {
        const icon = L.divIcon({ className: "map-depot", iconSize: [16, 16] });
        L.marker([d.lat, d.lng], { icon, title: `Sklad ${d.name}` })
          .bindPopup(`<strong>Sklad ${escape(d.name)}</strong>`)
          .addTo(map);
      }

      if (pins.length === 1 && depots.length === 0) map.setView([pins[0].lat, pins[0].lng], zoom);
      else {
        const points = [...pins.map((p) => [p.lat, p.lng]), ...depots.map((d) => [d.lat, d.lng])] as [number, number][];
        map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: zoom });
      }

      // The container can still be resizing when the map starts (grid layout,
      // fonts loading); without this, tiles only fill part of the box.
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(node);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers pins and depots
  }, [key, zoom]);

  if (pins.length === 0) return null;
  return <div ref={el} className="adm-map" style={{ minHeight: height }} />;
}

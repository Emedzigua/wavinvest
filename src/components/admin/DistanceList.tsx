import type { Depot, Distances } from "@/lib/admin/types";

function duration(min: number | null) {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
}

// Road distance from each warehouse; the selected one is highlighted
export default function DistanceList({
  depots,
  distances,
  selected,
}: {
  depots: Depot[];
  distances: Distances | null;
  selected?: string;
}) {
  if (!distances) return <p className="muted small">Vzdialenosť sa zobrazí po nájdení adresy na mape.</p>;
  return (
    <ul className="dist">
      {depots.map((d) => {
        const x = distances[d.id];
        if (!x) return null;
        return (
          <li key={d.id} className={d.id === selected ? "is-selected" : ""}>
            <span className="dist__from">z {d.name}</span>
            <strong>{x.km.toLocaleString("sk-SK")} km</strong>
            <span className="muted">{x.road ? duration(x.min) : "vzdušnou čiarou"}</span>
          </li>
        );
      })}
    </ul>
  );
}

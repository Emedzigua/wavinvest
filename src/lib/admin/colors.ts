// Distinct colors for customers on the map and in lists. Picked by id, so a
// customer keeps the same color everywhere.
const PALETTE = ["#3b6cb0", "#d08a3c", "#2f8f6b", "#b5441f", "#7a5bb0", "#c2408f", "#1f8fa8", "#8a7a1f", "#5b6e2f", "#a0522d"];

export function customerColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

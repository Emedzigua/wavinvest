// Shown instantly on every page switch while the data loads
export default function Loading() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Načítavam">
      <div className="skeleton__title" />
      <div className="skeleton__row">
        <div className="skeleton__card skeleton__card--big" />
        <div className="skeleton__card" />
      </div>
      <div className="skeleton__card skeleton__card--wide" />
    </div>
  );
}

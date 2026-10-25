// Placeholder wordmark until there is a real logo
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`logo ${className}`} aria-label="WAV Invest">
      <span className="logo__mark">WAV</span>
      <span className="logo__sq" aria-hidden />
      <span className="logo__sub">INVEST</span>
    </span>
  );
}

import Image from "next/image";

// Pick the version for the background: light logo on dark, dark logo with `onLight`
export default function Logo({ className = "", onLight = false }: { className?: string; onLight?: boolean }) {
  return (
    <span className={`logo ${className}`}>
      <Image
        src={onLight ? "/brand/logo-dark-on-light.png" : "/brand/logo-light-on-dark.png"}
        alt="WAV Invest"
        width={1200}
        height={293}
        sizes="240px"
        loading="eager"
      />
    </span>
  );
}

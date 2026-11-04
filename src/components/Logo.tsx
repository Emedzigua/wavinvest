import Image from "next/image";

const VERSIONS = {
  dark: { src: "/brand/logo-light-on-dark.png", width: 1200, height: 293 },
  light: { src: "/brand/logo-dark-on-light.png", width: 1200, height: 293 },
  // Same artwork for the slim header bar: larger INVEST, tighter spacing
  header: { src: "/brand/logo-header.png", width: 1000, height: 232 },
};

// `on` is the background it sits on: dark or light, or the dark header bar
export default function Logo({ className = "", on = "dark" }: { className?: string; on?: keyof typeof VERSIONS }) {
  return (
    <span className={`logo ${className}`}>
      <Image {...VERSIONS[on]} alt="WAV Invest" sizes="240px" loading="eager" />
    </span>
  );
}

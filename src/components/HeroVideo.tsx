"use client";

import { useEffect, useState } from "react";

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

// The poster shows straight away. The video only loads on larger screens,
// when the visitor has not asked for reduced motion or data saving.
export default function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData;
    const update = () => setPlay(wide.matches && !calm.matches && !saveData);
    update();
    wide.addEventListener("change", update);
    return () => wide.removeEventListener("change", update);
  }, []);

  return (
    <div className="hero__media" style={{ backgroundImage: `url("${poster}")` }}>
      {play && (
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      )}
    </div>
  );
}

// A number that counts up from 0 (stats, money totals). ms = 0 shows the final number at once.
import { useEffect, useState } from "react";
import { group } from "../lib/util.js";

export default function CountUp({ to, format = group, ms = 700 }) {
  const [value, setValue] = useState(ms ? 0 : to);
  useEffect(() => {
    if (!ms) { setValue(to); return; }
    let raf;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      setValue(to * (1 - Math.pow(1 - k, 3)));      // ease-out
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const done = setTimeout(() => setValue(to), ms + 100);   // always end on the real number (background tabs pause animations)
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [to, ms]);
  return format(value);
}

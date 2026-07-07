"use client";

import { useEffect, useState } from "react";

// The store persists to localStorage, so server HTML and first client render
// must not read store data. Gate data-dependent UI behind this flag.
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// Ticks every `ms` to drive live countdowns.
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

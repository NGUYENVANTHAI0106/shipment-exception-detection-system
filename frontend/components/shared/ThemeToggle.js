"use client";

import { useEffect, useState } from "react";
import { applyTheme, getPreferredTheme } from "@/app/lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(getPreferredTheme());
  }, []);

  function onToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="btn-secondary"
      aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
    >
      {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
    </button>
  );
}

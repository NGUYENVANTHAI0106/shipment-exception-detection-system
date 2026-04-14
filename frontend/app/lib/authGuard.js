"use client";

import { useEffect, useState } from "react";
import { getToken } from "./api";

export function useRequireAuth() {
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const t = getToken();
    setHasToken(!!t);
    setReady(true);
  }, []);

  return { ready, hasToken };
}


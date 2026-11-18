"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";

import { requestJson, type ApiFailure, type ApiResult } from "./api";
import { todayInBusinessZone } from "./dates";

function subscribeToClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}

const getClientToday = () => todayInBusinessZone();
const getServerToday = () => null;

/**
 * Today's date in America/Vancouver. `null` during server rendering and
 * hydration (so markup always matches), then the real value on the client.
 */
export function useBusinessToday(): string | null {
  return useSyncExternalStore(subscribeToClock, getClientToday, getServerToday);
}

type ResourceOptions<T> = {
  validate: (value: unknown) => value is T;
  /** Background refresh interval while the tab is visible. */
  pollMs?: number;
  /** Refresh when the window regains focus or the tab becomes visible. */
  refetchOnFocus?: boolean;
  /** Called with every successful response for the current URL. */
  onData?: (data: T) => void;
};

export type Resource<T> = {
  /** Latest data for the current URL (kept while background refreshes run). */
  data: T | null;
  /** Last failure for the current URL. */
  failure: ApiFailure | null;
  /** First load for the current URL is in flight. */
  loading: boolean;
  /** A user-initiated retry is in flight. */
  retrying: boolean;
  retry: () => void;
  /** Silent background refresh. */
  refresh: () => void;
};

type Entry<T> = { url: string; data: T | null; failure: ApiFailure | null };

const MIN_FOCUS_REFRESH_MS = 5_000;

/**
 * Fetches JSON for `url` (skips when null). Stale requests are aborted when the
 * URL changes or a newer request starts, and out-of-order responses are
 * ignored, so the UI only ever shows data for the current URL.
 */
export function useJsonResource<T>(url: string | null, options: ResourceOptions<T>): Resource<T> {
  const { pollMs, refetchOnFocus = false } = options;
  const [entry, setEntry] = useState<Entry<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const sequenceRef = useRef(0);
  const lastStartRef = useRef(0);

  const load = useEffectEvent((target: string, signal: AbortSignal) =>
    requestJson<T>(target, { signal, validate: options.validate }),
  );

  const settle = useEffectEvent((target: string, result: ApiResult<T>) => {
    setRetrying(false);
    if (result.ok) {
      setEntry({ url: target, data: result.data, failure: null });
      options.onData?.(result.data);
      return;
    }
    setEntry((previous) =>
      previous?.url === target
        ? { ...previous, failure: result.failure }
        : { url: target, data: null, failure: result.failure },
    );
  });

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const id = ++sequenceRef.current;
    lastStartRef.current = Date.now();
    void load(url, controller.signal).then((result) => {
      if (controller.signal.aborted || id !== sequenceRef.current) return;
      settle(url, result);
    });
    return () => controller.abort();
  }, [url, nonce]);

  useEffect(() => {
    if (!url || !pollMs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setNonce((value) => value + 1);
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [url, pollMs]);

  useEffect(() => {
    if (!url || !refetchOnFocus) return;
    const onWake = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastStartRef.current < MIN_FOCUS_REFRESH_MS) return;
      setNonce((value) => value + 1);
    };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [url, refetchOnFocus]);

  const retry = useCallback(() => {
    setRetrying(true);
    setNonce((value) => value + 1);
  }, []);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const current = url !== null && entry?.url === url ? entry : null;
  return {
    data: current?.data ?? null,
    failure: current?.failure ?? null,
    loading: url !== null && current === null,
    retrying,
    retry,
    refresh,
  };
}

/** True when the visitor asked the OS to minimise motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

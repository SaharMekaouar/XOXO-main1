import { Capacitor } from '@capacitor/core';
import { environment } from 'src/environments/environment';

const STORAGE_KEY = 'apiBaseUrl';

function stripSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isEmulator(): boolean {
  const ua = navigator.userAgent || '';
  return /emulator|sdk_gphone|android sdk|genymotion/i.test(ua);
}

function lanHostApiUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '10.0.2.2') {
    return `http://${host}:3000`;
  }
  return null;
}

export function getNativeApiCandidates(): string[] {
  const extras = [lanHostApiUrl()].filter((url): url is string => !!url);
  const emulatorFirst = [
    environment.emulatorApiUrl,
    environment.lanApiUrl,
    environment.nativeApiUrl,
    ...extras,
  ];
  const deviceFirst = [
    environment.lanApiUrl,
    environment.nativeApiUrl,
    ...extras,
    environment.emulatorApiUrl,
  ];
  const ordered = isEmulator() ? emulatorFirst : deviceFirst;
  return [...new Set(ordered.filter(Boolean).map(stripSlash))];
}

export function getApiUrl(): string {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return stripSlash(saved);
    }
  }
  if (Capacitor.isNativePlatform()) {
    return stripSlash(isEmulator() ? environment.emulatorApiUrl : environment.lanApiUrl);
  }
  const fromHost = lanHostApiUrl();
  if (fromHost) {
    return fromHost;
  }
  return stripSlash(environment.apiUrl);
}

export function setApiUrl(url: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, stripSlash(url));
  }
}

async function isReachable(base: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeAndCacheApiUrl(): Promise<string> {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isLocalWeb = !Capacitor.isNativePlatform() && (host === 'localhost' || host === '127.0.0.1');
  if (isLocalWeb) {
    return getApiUrl();
  }

  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved && (await isReachable(stripSlash(saved)))) {
    return stripSlash(saved);
  }

  for (const base of getNativeApiCandidates()) {
    if (await isReachable(base)) {
      setApiUrl(base);
      return base;
    }
  }

  const fallback = getApiUrl();
  setApiUrl(fallback);
  return fallback;
}

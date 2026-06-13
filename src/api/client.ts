/**
 * Thin typed client for the MeteorPointer API.
 *
 * The base URL comes from Settings (`backendUrl`). All calls are plain fetch;
 * the sync engine layers retry/offline handling on top.
 */
import { useSettings } from '@features/settings/useSettings';

export interface ConsentDoc {
  version: string;
  license: string;
  locale: string;
  text: string;
  sha256: string;
}

export interface ConsentPayload {
  version: string;
  license: string;
  document_sha256: string;
  locale: string;
  app_version: string;
  accepted_at: string;
}

export interface RegisterResult {
  device_id: string;
  recovery_phrase: string;
}

export interface ChallengeResult {
  nonce: string;
  expires_at: string;
}

export interface TokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ReportItem {
  client_key: string;
  payload: Record<string, unknown>;
}

export interface BatchResult {
  accepted: number;
  duplicates: number;
  results: { client_key: string; status: 'accepted' | 'duplicate' }[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function baseUrl(): string {
  const url = useSettings.getState().backendUrl.trim().replace(/\/+$/, '');
  if (!url) {
    throw new ApiError(0, 'No backend URL configured');
  }
  return url;
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = (data && (data.detail as string)) || res.statusText;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const api = {
  getConsent: (locale: string) =>
    request<ConsentDoc>(`/v1/legal/consent?locale=${encodeURIComponent(locale)}`),

  registerDevice: (body: { public_key: string; label: string; consent: ConsentPayload }) =>
    request<RegisterResult>('/v1/devices', { method: 'POST', body }),

  recoverDevice: (body: {
    recovery_phrase: string;
    public_key: string;
    label: string;
    consent: ConsentPayload;
  }) => request<{ device_id: string }>('/v1/devices/recover', { method: 'POST', body }),

  getChallenge: (deviceId: string) =>
    request<ChallengeResult>('/v1/auth/challenge', {
      method: 'POST',
      body: { device_id: deviceId },
    }),

  getToken: (body: { device_id: string; nonce: string; signature: string }) =>
    request<TokenResult>('/v1/auth/token', { method: 'POST', body }),

  uploadReports: (token: string, reports: ReportItem[]) =>
    request<BatchResult>('/v1/reports', { method: 'POST', token, body: { reports } }),

  deleteDeviceData: (token: string, deviceId: string) =>
    request<{ deleted: number }>(`/v1/devices/${deviceId}/data`, { method: 'DELETE', token }),

  deleteDevice: (token: string, deviceId: string) =>
    request<{ ok: boolean }>(`/v1/devices/${deviceId}`, { method: 'DELETE', token }),
};

import type { AdminPermission } from '../auth/permissions.js';
import { getTelegramBotUserAgent } from './user-agent.js';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export class AdminApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
    private readonly telegramUserId: string,
  ) {}

  private headers(extra?: HeadersInit): HeadersInit {
    return {
      Authorization: `Bearer ${this.secret}`,
      'X-Telegram-User-Id': this.telegramUserId,
      'User-Agent': getTelegramBotUserAgent(),
      ...extra,
    };
  }

  async get<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return this.request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<ApiResult<T>> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${path}`;
    try {
      const res = await fetch(url, {
        ...init,
        headers: this.headers(init.headers as HeadersInit),
      });
      const text = await res.text();
      let json: unknown = null;
      if (text.trim()) {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          return { ok: false, error: `Invalid JSON (${res.status})`, status: res.status };
        }
      }
      if (!res.ok) {
        const err =
          json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string'
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        return { ok: false, error: err, status: res.status };
      }
      return { ok: true, data: json as T };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      console.error('[AdminApiClient]', path, e);
      return { ok: false, error: msg, status: 0 };
    }
  }

  async botMe(): Promise<
    ApiResult<{
      ok: boolean;
      telegramUserId: string;
      linked: boolean;
      admin: {
        id: string;
        login: string;
        isSuperadmin: boolean;
        permissions: AdminPermission[];
      } | null;
    }>
  > {
    return this.get('/api/admin/bot/me');
  }
}

export function createAdminApiClient(telegramUserId: string): AdminApiClient | null {
  let baseUrl = process.env.WEB_ADMIN_URL?.trim() ?? '';
  const secret = process.env.TELEGRAM_BOT_API_SECRET?.trim();
  // tolerate accidental leading '=' in .env (e.g. WEB_ADMIN_URL==http://...)
  baseUrl = baseUrl.replace(/^=+/, '');
  if (!baseUrl || !secret) return null;
  return new AdminApiClient(baseUrl, secret, telegramUserId);
}

import type { AdminPermission } from '@/lib/admin-permissions';

export type AdminAccessRequirement =
  | { type: 'none' }
  | { type: 'authenticated' }
  | { type: 'permission'; permission: AdminPermission }
  | { type: 'anyPermission'; permissions: AdminPermission[] };

export function resolveAdminApiAccess(pathname: string, method: string): AdminAccessRequirement {
  if (pathname === '/api/admin/login') {
    return { type: 'none' };
  }
  if (pathname === '/api/admin/logout') {
    return { type: 'authenticated' };
  }
  if (pathname === '/api/admin/users/me' && method === 'PATCH') {
    return { type: 'authenticated' };
  }
  if (pathname === '/api/admin/bot/me' && method === 'GET') {
    return { type: 'none' };
  }

  if (pathname.startsWith('/api/admin/users')) {
    return { type: 'permission', permission: 'security' };
  }
  if (pathname === '/api/admin/access-policy') {
    return { type: 'permission', permission: 'security' };
  }
  if (pathname.startsWith('/api/admin/telegram-whitelist')) {
    return { type: 'permission', permission: 'security' };
  }

  if (pathname.startsWith('/api/admin/pro-licenses')) {
    return { type: 'permission', permission: 'config' };
  }
  if (pathname === '/api/admin/app-config') {
    return { type: 'permission', permission: 'config' };
  }
  if (pathname.startsWith('/api/admin/mobile-model-manifest')) {
    return { type: 'permission', permission: 'config' };
  }
  if (pathname.startsWith('/api/admin/mobile-banner')) {
    return { type: 'permission', permission: 'config' };
  }
  if (pathname.startsWith('/api/admin/landing-social-proof')) {
    return { type: 'permission', permission: 'config' };
  }
  if (pathname.startsWith('/api/admin/support/key-requests')) {
    return { type: 'permission', permission: 'config' };
  }

  if (pathname === '/api/admin/support/stats' || pathname.startsWith('/api/admin/support/export')) {
    return { type: 'permission', permission: 'operations' };
  }
  if (pathname.startsWith('/api/admin/support')) {
    return { type: 'permission', permission: 'support' };
  }
  if (pathname === '/api/admin/ai/support-reply-draft') {
    return { type: 'permission', permission: 'support' };
  }

  if (pathname.startsWith('/api/admin/releases')) {
    return { type: 'permission', permission: 'releases' };
  }
  if (pathname.startsWith('/api/admin/in-app-events')) {
    return { type: 'permission', permission: 'in_app_events' };
  }

  if (pathname.startsWith('/api/admin/broadcast') || pathname.startsWith('/api/admin/push')) {
    return { type: 'permission', permission: 'messaging' };
  }
  if (pathname === '/api/admin/ai/push-policy-markdown') {
    return { type: 'permission', permission: 'messaging' };
  }
  if (pathname === '/api/admin/devices') {
    return { type: 'anyPermission', permissions: ['overview', 'messaging'] };
  }

  if (pathname.startsWith('/api/admin/budget')) {
    return { type: 'permission', permission: 'budget' };
  }

  if (pathname.startsWith('/api/admin/audit') || pathname === '/api/admin/observability') {
    return { type: 'permission', permission: 'operations' };
  }

  if (pathname === '/api/admin/status' || pathname.startsWith('/api/admin/github')) {
    return { type: 'permission', permission: 'overview' };
  }

  return { type: 'permission', permission: 'security' };
}

import type { AdminPermission } from './auth/permissions.js';

export type AdminProfile = {
  adminId: string;
  login: string;
  isSuperadmin: boolean;
  permissions: AdminPermission[];
};

export type BotUser = {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

export type ApiError = { ok: false; error: string };

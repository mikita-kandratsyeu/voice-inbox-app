import {
  ANDROID_WAITLIST_URL,
  APP_STORE_URL,
  BASE_URL_OR_FALLBACK,
  GOOGLE_PLAY_URL,
  isPublicHttpUrl,
} from '@/config/constants';
import { NextResponse } from 'next/server';

export function pickStoreUrl(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  const isAndroid = ua.includes('android');
  const isIos =
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('ipod') ||
    (ua.includes('macintosh') && ua.includes('mobile'));

  if (isAndroid) {
    if (isPublicHttpUrl(GOOGLE_PLAY_URL)) {
      return GOOGLE_PLAY_URL.trim();
    }
    if (isPublicHttpUrl(ANDROID_WAITLIST_URL)) {
      return ANDROID_WAITLIST_URL.trim();
    }
    return BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  }
  if (isIos && isPublicHttpUrl(APP_STORE_URL)) {
    return APP_STORE_URL.trim();
  }
  if (isPublicHttpUrl(APP_STORE_URL)) {
    return APP_STORE_URL.trim();
  }
  if (isPublicHttpUrl(GOOGLE_PLAY_URL)) {
    return GOOGLE_PLAY_URL.trim();
  }
  if (isPublicHttpUrl(ANDROID_WAITLIST_URL)) {
    return ANDROID_WAITLIST_URL.trim();
  }
  return BASE_URL_OR_FALLBACK.replace(/\/$/, '');
}

/** Universal store link for voucher QR (iOS → App Store; Android → Play or waitlist). */
export function GET(request: Request): NextResponse {
  const ua = request.headers.get('user-agent') ?? '';
  const target = pickStoreUrl(ua);
  return NextResponse.redirect(target, { status: 302 });
}

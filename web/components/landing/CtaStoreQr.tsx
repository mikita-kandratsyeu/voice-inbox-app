import { getTranslations } from 'next-intl/server';
import QRCode from 'qrcode';

import { getGoStoreScanUrl } from '@/lib/go-store-scan-url';

const QR_SIZE_PX = 200;
const QR_DISPLAY_PX = 96;

export async function CtaStoreQr(): Promise<React.ReactElement> {
  const t = await getTranslations('cta');
  const scanUrl = getGoStoreScanUrl();
  const dataUrl = await QRCode.toDataURL(scanUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: QR_SIZE_PX,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return (
    <a
      href={scanUrl}
      className="hidden shrink-0 flex-col items-center gap-2 border-white/10 text-center md:flex md:border-l md:pl-7 lg:pl-8"
      aria-label={t('qrAria')}
    >
      <div className="relative rounded-2xl bg-linear-to-br from-white via-white to-slate-100 p-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/30">
        <div className="pointer-events-none absolute inset-2 rounded-xl" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode */}
        <img
          src={dataUrl}
          alt=""
          width={QR_DISPLAY_PX}
          height={QR_DISPLAY_PX}
          className="relative size-24 rounded-md"
          decoding="async"
        />
      </div>
      <span className="max-w-28 text-[0.7rem] leading-snug text-white/55 sm:text-xs">
        {t('qrCaption')}
      </span>
    </a>
  );
}

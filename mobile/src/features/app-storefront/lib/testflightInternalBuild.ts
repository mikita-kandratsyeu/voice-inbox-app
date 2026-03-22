import { TESTFLIGHT_INTERNAL_BUILD } from '@env';

function readFlag(): boolean {
  const raw = (TESTFLIGHT_INTERNAL_BUILD ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function isTestflightInternalBuild(): boolean {
  return readFlag();
}

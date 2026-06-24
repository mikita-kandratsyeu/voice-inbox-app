import { MENU_SECTIONS } from '../auth/permissions.js';

/** Known callback prefixes wired in router.ts — guards against orphan menu buttons. */
const ROUTER_CALLBACK_PREFIXES = [
  'm',
  'ac',
  'o',
  'cf',
  'pk',
  'su',
  'ms',
  'rl',
  'ev',
  'bu',
  'op',
  'sc',
];

describe('menu callbacks', () => {
  it('every menu section has a router prefix', () => {
    for (const section of MENU_SECTIONS) {
      expect(ROUTER_CALLBACK_PREFIXES).toContain(section.cb);
    }
  });

  it('includes in_app_events section', () => {
    expect(MENU_SECTIONS.some((s) => s.cb === 'ev')).toBe(true);
  });
});

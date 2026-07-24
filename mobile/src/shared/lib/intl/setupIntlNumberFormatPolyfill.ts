/**
 * Hermes Intl lacks full NumberFormat support (e.g. currencyDisplay: narrowSymbol).
 * Load FormatJS polyfill + locale data for App Store / Play IAP regions.
 */
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-numberformat/polyfill.js';
import '@formatjs/intl-numberformat/locale-data/ar.js';
import '@formatjs/intl-numberformat/locale-data/cs.js';
import '@formatjs/intl-numberformat/locale-data/da.js';
import '@formatjs/intl-numberformat/locale-data/de.js';
import '@formatjs/intl-numberformat/locale-data/el.js';
import '@formatjs/intl-numberformat/locale-data/en.js';
import '@formatjs/intl-numberformat/locale-data/es.js';
import '@formatjs/intl-numberformat/locale-data/fi.js';
import '@formatjs/intl-numberformat/locale-data/fr.js';
import '@formatjs/intl-numberformat/locale-data/he.js';
import '@formatjs/intl-numberformat/locale-data/hi.js';
import '@formatjs/intl-numberformat/locale-data/hu.js';
import '@formatjs/intl-numberformat/locale-data/id.js';
import '@formatjs/intl-numberformat/locale-data/it.js';
import '@formatjs/intl-numberformat/locale-data/ja.js';
import '@formatjs/intl-numberformat/locale-data/ko.js';
import '@formatjs/intl-numberformat/locale-data/ms.js';
import '@formatjs/intl-numberformat/locale-data/nb.js';
import '@formatjs/intl-numberformat/locale-data/nl.js';
import '@formatjs/intl-numberformat/locale-data/pl.js';
import '@formatjs/intl-numberformat/locale-data/pt.js';
import '@formatjs/intl-numberformat/locale-data/ro.js';
import '@formatjs/intl-numberformat/locale-data/ru.js';
import '@formatjs/intl-numberformat/locale-data/sv.js';
import '@formatjs/intl-numberformat/locale-data/th.js';
import '@formatjs/intl-numberformat/locale-data/tr.js';
import '@formatjs/intl-numberformat/locale-data/uk.js';
import '@formatjs/intl-numberformat/locale-data/vi.js';
import '@formatjs/intl-numberformat/locale-data/zh.js';

import { Inbox, Settings } from 'lucide-react-native';

import { i18n } from '@/shared/lib';

export const TAB_ICON_SIZE = 24;

export const TAB_LABELS = {
  get Inbox() {
    return i18n.t('tabs.inbox');
  },
  get Settings() {
    return i18n.t('tabs.settings');
  },
} as const;

export const TAB_ICONS = {
  Inbox,
  Settings,
} as const;

jest.mock('@/shared/lib/folderColor', () => ({
  resolveFolderListTintHex: (color: string, isPro: boolean) =>
    isPro ? `#tint-${color}` : undefined,
}));

import { resolveFolderListRowChrome } from '../folderListRowChrome';

describe('resolveFolderListRowChrome', () => {
  const labels = {
    inbox: 'Inbox',
    folderRemoved: 'Removed',
    classificationLabel: null as string | null,
  };

  it('uses inbox icon when note has no folder or classification', () => {
    const chrome = resolveFolderListRowChrome({
      folder: null,
      folderId: null,
      isProActive: false,
      scheme: 'dark',
      labels,
    });
    expect(chrome.showInboxIcon).toBe(true);
    expect(chrome.folderTintHex).toBeUndefined();
    expect(chrome.locationLabel).toBe('Inbox');
  });

  it('uses classification icon and label when in inbox with classification', () => {
    const chrome = resolveFolderListRowChrome({
      folder: null,
      folderId: null,
      classification: 'work',
      isProActive: false,
      scheme: 'dark',
      labels: { ...labels, classificationLabel: 'Work' },
    });
    expect(chrome.showInboxIcon).toBe(false);
    expect(chrome.leadingFolderIconId).toBe('briefcase');
    expect(chrome.locationLabel).toBe('Work');
    expect(chrome.folderTintHex).toBeUndefined();
  });

  it('returns folder tint for Pro with a folder', () => {
    const chrome = resolveFolderListRowChrome({
      folder: { name: 'Personal', color: '#22c55e', icon: 'home' },
      folderId: 'f1',
      isProActive: true,
      scheme: 'dark',
      labels,
    });
    expect(chrome.folderTintHex).toBeDefined();
    expect(chrome.locationLabel).toBe('Personal');
    expect(chrome.showInboxIcon).toBe(false);
  });

  it('hides folder tint for Free with a folder', () => {
    const chrome = resolveFolderListRowChrome({
      folder: { name: 'Work', color: '#3b82f6', icon: 'briefcase' },
      folderId: 'f1',
      isProActive: false,
      scheme: 'dark',
      labels,
    });
    expect(chrome.folderTintHex).toBeUndefined();
    expect(chrome.locationLabel).toBe('Work');
  });
});

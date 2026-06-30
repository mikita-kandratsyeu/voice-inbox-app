#!/usr/bin/env node
/**
 * Generates Maestro flow YAML stubs from the E2E catalog.
 * Re-run after adding new flows to the catalog array below.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '.maestro', 'flows');

const catalog = [
  // P0 smoke — hand-authored; skip generation
  // Onboarding P1
  ['onboarding/full-carousel.yaml', 'launch-fresh', ['onboarding.next'], 'inbox.screen'],
  ['onboarding/terms-gate.yaml', 'launch-fresh', ['onboarding.skip'], 'onboarding.terms.agree'],
  [
    'onboarding/skip-disabled-while-finishing.yaml',
    'launch-fresh',
    ['onboarding.skip'],
    'inbox.screen',
  ],
  ['onboarding/restore-backup-entry.yaml', 'launch-fresh', ['onboarding.next'], 'onboarding.next'],
  // Navigation P1
  [
    'navigation/back-from-detail.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note', 'detail.back'],
    'inbox.screen',
  ],
  [
    'navigation/modal-record-dismiss.yaml',
    'launch-e2e',
    ['tab.record', 'record.close'],
    'inbox.screen',
  ],
  [
    'navigation/modal-text-note-dismiss.yaml',
    'launch-e2e',
    ['tab.record', 'textNote.close'],
    'inbox.screen',
  ],
  ['navigation/floating-tab-bar-scroll.yaml', 'launch-e2e+seed', ['inbox.screen'], 'inbox.screen'],
  ['navigation/tablet-sidebar.yaml', 'launch-e2e', ['inbox.screen'], 'inbox.screen'],
  // Record P1
  ['record/open-record-modal.yaml', 'launch-e2e', ['tab.record'], 'record.timer'],
  ['record/mic-permission-deny.yaml', 'launch-e2e', ['tab.record'], 'record.timer'],
  ['record/mic-permission-grant.yaml', 'launch-e2e', ['tab.record'], 'record.timer'],
  ['record/pause-resume.yaml', 'launch-e2e', ['tab.record', 'record.pause'], 'record.timer'],
  ['record/add-mark.yaml', 'launch-e2e', ['tab.record'], 'record.timer'],
  ['record/stop-opens-save.yaml', 'launch-e2e', ['tab.record', 'record.stop'], 'save.confirm'],
  [
    'record/save-with-title.yaml',
    'launch-e2e',
    ['tab.record', 'record.stop', 'save.confirm'],
    'inbox.screen',
  ],
  [
    'record/save-meeting-mode.yaml',
    'launch-e2e',
    ['tab.record', 'record.stop', 'save.meetingToggle'],
    'save.confirm',
  ],
  ['record/discard-recording.yaml', 'launch-e2e', ['tab.record', 'record.stop'], 'save.discard'],
  ['record/cancel-save-resume.yaml', 'launch-e2e', ['tab.record', 'record.stop'], 'save.cancel'],
  ['record/blocked-by-transcription.yaml', 'launch-e2e', ['tab.record'], 'inbox.screen'],
  ['record/deeplink-start.yaml', 'launch-e2e', [], 'record.timer'],
  // Text note P1
  [
    'record/text-note-save.yaml',
    'launch-e2e',
    ['tab.record', 'textNote.titleInput', 'textNote.save'],
    'inbox.screen',
  ],
  [
    'record/text-note-template-chip.yaml',
    'launch-e2e',
    ['tab.record', 'textNote.template.dayPlan'],
    'textNote.body',
  ],
  [
    'record/text-note-empty-save-blocked.yaml',
    'launch-e2e',
    ['tab.record', 'textNote.save'],
    'textNote.screen',
  ],
  // Inbox P1-P2
  ['inbox/empty-state.yaml', 'launch-e2e', [], 'inbox.emptyState'],
  ['inbox/list-after-seed.yaml', 'launch-e2e+seed', [], 'inbox.recordCard.e2e-seed-note'],
  [
    'inbox/open-record.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  [
    'inbox/swipe-archive.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'inbox.emptyState',
  ],
  ['inbox/search-filter.yaml', 'launch-e2e+seed', ['inbox.search'], 'inbox.screen'],
  ['inbox/folder-filter.yaml', 'launch-e2e+seed', ['inbox.screen'], 'inbox.screen'],
  ['inbox/batch-select-enter.yaml', 'launch-e2e+seed', ['inbox.batchSelect'], 'inbox.screen'],
  ['inbox/batch-select-archive.yaml', 'launch-e2e+seed', ['inbox.batchSelect'], 'inbox.screen'],
  ['inbox/batch-export-sheet.yaml', 'launch-e2e+seed', ['inbox.batchSelect'], 'inbox.screen'],
  ['inbox/pull-to-refresh.yaml', 'launch-e2e+seed', ['inbox.screen'], 'inbox.screen'],
  ['inbox/header-all-tasks.yaml', 'launch-e2e', ['inbox.allTasks'], 'allTasks.screen'],
  ['inbox/header-more-menu.yaml', 'launch-e2e', ['inbox.menu'], 'inbox.screen'],
  ['inbox/swipe-hint-dismiss.yaml', 'launch-e2e', ['inbox.swipeHintDismiss'], 'inbox.screen'],
  // Detail P1-P2
  [
    'detail/tabs-switch.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note', 'detail.tab.summary', 'detail.tab.tasks'],
    'detail.screen',
  ],
  [
    'detail/rename-title.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  [
    'detail/folder-picker.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  [
    'detail/player-play-pause.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note', 'player.playPause'],
    'detail.screen',
  ],
  [
    'detail/add-task.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note', 'detail.tab.tasks', 'detail.addTask'],
    'detail.screen',
  ],
  [
    'detail/complete-task-outcome.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note', 'detail.tab.tasks'],
    'detail.screen',
  ],
  [
    'detail/edit-transcript-nav.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  [
    'detail/note-document-nav.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  [
    'detail/ask-ai-nav.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note', 'detail.askAi'],
    'detail.screen',
  ],
  [
    'detail/share-sheet-open.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note', 'detail.share'],
    'detail.screen',
  ],
  [
    'detail/link-note-picker.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  [
    'detail/tags-display.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  [
    'detail/processing-state.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'detail.screen',
  ],
  // All tasks P2
  ['all-tasks/empty.yaml', 'launch-e2e', ['inbox.allTasks'], 'allTasks.screen'],
  [
    'all-tasks/create-task.yaml',
    'launch-e2e',
    ['inbox.allTasks', 'allTasks.create'],
    'allTasks.screen',
  ],
  ['all-tasks/filter-by-note.yaml', 'launch-e2e+seed', ['inbox.allTasks'], 'allTasks.screen'],
  ['all-tasks/more-filters-sheet.yaml', 'launch-e2e', ['inbox.allTasks'], 'allTasks.screen'],
  ['all-tasks/open-source-note.yaml', 'launch-e2e+seed', ['inbox.allTasks'], 'allTasks.screen'],
  // Notes graph P2
  ['notes-graph/open-from-menu.yaml', 'launch-e2e', ['inbox.menu'], 'notesGraph.screen'],
  ['notes-graph/filter-bar.yaml', 'launch-e2e', ['inbox.menu'], 'notesGraph.screen'],
  ['notes-graph/tap-node.yaml', 'launch-e2e+seed', ['inbox.menu'], 'notesGraph.screen'],
  ['notes-graph/export-sheet.yaml', 'launch-e2e', ['inbox.menu'], 'notesGraph.screen'],
  // Settings P2
  [
    'settings/appearance-theme.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.appearance'],
    'settings.screen',
  ],
  [
    'settings/navigate-trash.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.trash'],
    'trash.screen',
  ],
  ['settings/trash-restore.yaml', 'launch-e2e', ['tab.settings', 'settings.trash'], 'trash.screen'],
  [
    'settings/trash-delete-forever.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.trash'],
    'trash.screen',
  ],
  [
    'settings/import-screen.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.import'],
    'settings.screen',
  ],
  [
    'settings/storage-details-nav.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.storageDetails'],
    'settings.screen',
  ],
  [
    'settings/whisper-picker-nav.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.whisperPicker'],
    'settings.screen',
  ],
  [
    'settings/ai-settings-nav.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.aiSettings'],
    'settings.screen',
  ],
  [
    'settings/app-lock-setup-nav.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.appLockSetup'],
    'settings.screen',
  ],
  ['settings/about-nav.yaml', 'launch-e2e', ['tab.settings', 'settings.about'], 'settings.screen'],
  [
    'settings/digest-nav.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.digest'],
    'settings.screen',
  ],
  [
    'settings/siri-shortcuts-nav.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.siriShortcuts'],
    'settings.screen',
  ],
  // App lock P2
  [
    'app-lock/enable-pin.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.appLockSetup'],
    'settings.screen',
  ],
  ['app-lock/unlock-pin.yaml', 'launch-e2e', [], 'inbox.screen'],
  ['app-lock/wrong-pin.yaml', 'launch-e2e', [], 'inbox.screen'],
  ['app-lock/e2e-skip.yaml', 'launch-e2e', [], 'inbox.screen'],
  // Paywall P2
  ['paywall/open-close.yaml', 'launch-e2e', ['tab.settings'], 'settings.screen'],
  ['paywall/gated-export.yaml', 'launch-e2e+seed', ['inbox.batchSelect'], 'paywall.sheet'],
  ['paywall/e2e-mock-pro.yaml', 'launch-e2e', ['tab.settings'], 'settings.screen'],
  // Deep links P1
  ['deeplinks/record-start.yaml', 'launch-e2e', [], 'record.timer'],
  ['deeplinks/text-note.yaml', 'launch-e2e', [], 'textNote.screen'],
  ['deeplinks/all-tasks.yaml', 'launch-e2e', [], 'allTasks.screen'],
  ['deeplinks/in-app-event.yaml', 'launch-e2e', [], 'inbox.screen'],
  ['deeplinks/e2e-reset.yaml', 'launch-fresh', [], 'e2e.ready'],
  // AI organize P3
  ['inbox/auto-organize-review-nav.yaml', 'launch-e2e', ['inbox.menu'], 'inbox.screen'],
  ['inbox/ai-organize-archive-review.yaml', 'launch-e2e', ['inbox.menu'], 'inbox.screen'],
  // Modals P3
  ['modals/push-notification-sheet.yaml', 'skip-onboarding', [], 'inbox.screen'],
  [
    'modals/cloud-ai-consent.yaml',
    'launch-e2e+seed',
    ['inbox.recordCard.e2e-seed-note'],
    'inbox.screen',
  ],
  ['modals/transcription-resume-prompt.yaml', 'launch-e2e', [], 'inbox.screen'],
  ['modals/rating-prompt-dismiss.yaml', 'launch-e2e', [], 'inbox.screen'],
  // Debug P3
  [
    'debug/open-debug-screen.yaml',
    'launch-e2e',
    ['tab.settings', 'settings.debug'],
    'settings.screen',
  ],
];

function subflowRef(name) {
  return `../../subflows/${name}.yaml`;
}

function buildYaml([relPath, setup, taps, assertId]) {
  const lines = ['appId: com.mkandratsyeu.voiceinboxai', '---', `# Catalog flow: ${relPath}`];

  if (setup === 'launch-fresh') {
    lines.push(`- runFlow: ${subflowRef('launch-fresh')}`);
  } else if (setup === 'launch-e2e') {
    lines.push(`- runFlow: ${subflowRef('launch-e2e')}`);
  } else if (setup === 'launch-e2e+seed') {
    lines.push(`- runFlow: ${subflowRef('launch-e2e')}`);
    lines.push(`- runFlow: ${subflowRef('seed-text-note')}`);
  } else if (setup === 'skip-onboarding') {
    lines.push(`- runFlow: ${subflowRef('skip-onboarding-ui')}`);
  }

  for (const id of taps) {
    if (id.includes('textNote.template.')) {
      lines.push('- openLink: voiceinbox://note/text');
    }
    if (id === 'tab.record') {
      lines.push('- tapOn:', '    id: tab.record');
      continue;
    }
    if (id === 'record.stop' || id === 'save.confirm') {
      // Voice recording flows need simulator mic; keep tap optional
      lines.push('- tapOn:', `    id: ${id}`, '    optional: true');
      continue;
    }
    lines.push('- tapOn:', `    id: ${id}`, '    optional: true');
  }

  if (relPath === 'record/deeplink-start.yaml' || relPath === 'deeplinks/record-start.yaml') {
    lines.push('- openLink: voiceinbox://record/start');
  }
  if (relPath === 'deeplinks/text-note.yaml') {
    lines.push('- openLink: voiceinbox://note/text');
  }
  if (relPath === 'deeplinks/all-tasks.yaml') {
    lines.push('- openLink: voiceinbox://tasks');
  }
  if (relPath === 'deeplinks/e2e-reset.yaml') {
    lines.push('- openLink: ${E2E_RESET_URL}');
  }

  lines.push('- extendedWaitUntil:', '    visible:', `      id: ${assertId}`, '    timeout: 20000');
  lines.push('');

  return lines.join('\n');
}

for (const entry of catalog) {
  const [relPath] = entry;
  const outPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buildYaml(entry));
}

console.log(`Generated ${catalog.length} Maestro flows under ${root}`);

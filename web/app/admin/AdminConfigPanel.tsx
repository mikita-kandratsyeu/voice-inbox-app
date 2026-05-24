'use client';

import { useState } from 'react';

import { AdminAiLimitsPanel } from './AdminAiLimitsPanel';
import { AdminModelManifestPanel } from './AdminModelManifestPanel';
import { AdminProLicensesPanel } from './AdminProLicensesPanel';
import { AdminPanelHeading, AdminSubNav } from './admin-ui';

const CONFIG_SECTIONS = [
  { id: 'ai', label: 'AI limits' },
  { id: 'manifest', label: 'Mobile manifest' },
  { id: 'pro', label: 'Pro keys' },
] as const;

type ConfigSection = (typeof CONFIG_SECTIONS)[number]['id'];

export function AdminConfigPanel() {
  const [section, setSection] = useState<ConfigSection>('ai');

  return (
    <div className="space-y-6">
      <AdminPanelHeading
        title="App configuration"
        description="Runtime limits, on-device model downloads, and internal Pro license tooling."
      />

      <AdminSubNav items={CONFIG_SECTIONS} value={section} onChange={setSection} />

      {section === 'ai' ? <AdminAiLimitsPanel /> : null}
      {section === 'manifest' ? <AdminModelManifestPanel /> : null}
      {section === 'pro' ? <AdminProLicensesPanel /> : null}
    </div>
  );
}

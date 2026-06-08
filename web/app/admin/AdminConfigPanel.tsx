'use client';

import { useState } from 'react';

import { AdminAiLimitsPanel } from './AdminAiLimitsPanel';
import { AdminLandingSocialProofPanel } from './AdminLandingSocialProofPanel';
import { AdminModelManifestPanel } from './AdminModelManifestPanel';
import { AdminProLicensesPanel } from './AdminProLicensesPanel';
import { AdminSubNav } from './admin-ui';

const CONFIG_SECTIONS = [
  { id: 'ai', label: 'AI limits' },
  { id: 'landing', label: 'Landing' },
  { id: 'manifest', label: 'Mobile manifest' },
  { id: 'pro', label: 'Pro keys' },
] as const;

type ConfigSection = (typeof CONFIG_SECTIONS)[number]['id'];

export function AdminConfigPanel() {
  const [section, setSection] = useState<ConfigSection>('ai');

  return (
    <div className="space-y-6">
      <AdminSubNav items={CONFIG_SECTIONS} value={section} onChange={setSection} />

      {section === 'ai' ? <AdminAiLimitsPanel /> : null}
      {section === 'landing' ? <AdminLandingSocialProofPanel /> : null}
      {section === 'manifest' ? <AdminModelManifestPanel /> : null}
      {section === 'pro' ? <AdminProLicensesPanel /> : null}
    </div>
  );
}

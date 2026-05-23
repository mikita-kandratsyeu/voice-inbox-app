import React, { createContext, useContext } from 'react';

import type { Colors } from '@/shared/config';

export const SettingsSurfaceColorContext = createContext<Colors | null>(null);

export function SettingsSurfaceColorProvider({
  color,
  children,
}: {
  color: Colors;
  children: React.ReactNode;
}) {
  return (
    <SettingsSurfaceColorContext.Provider value={color}>
      {children}
    </SettingsSurfaceColorContext.Provider>
  );
}

export function useSettingsSurfaceColorContext(): Colors | null {
  return useContext(SettingsSurfaceColorContext);
}

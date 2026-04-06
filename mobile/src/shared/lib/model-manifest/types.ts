export type MobileModelArtifactKind = 'whisper_weights' | 'whisper_coreml' | 'local_llm_weights';

export type MobileModelArtifactPlatform = 'ios' | 'android' | 'all';

export type MobileModelArtifact = {
  id: string;
  kind: MobileModelArtifactKind;
  url: string;
  active: boolean;
  version?: string;
  bytes?: number;
  sha256?: string | null;
  minAppVersion?: string | null;
  platform?: MobileModelArtifactPlatform;
};

export type MobileModelManifest = {
  manifestVersion: number;
  revision: string;
  artifacts: MobileModelArtifact[];
};

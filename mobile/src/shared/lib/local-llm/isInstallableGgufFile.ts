/** Main LLM weights only — excludes vision mmproj, MTP/draft aux files, and split shards. */
export function isInstallableGgufFilename(fileName: string): boolean {
  const baseName = fileName.split('/').pop() ?? fileName;
  const lower = baseName.toLowerCase();
  if (!lower.endsWith('.gguf')) return false;
  if (lower.startsWith('mmproj') || lower.includes('.mmproj-')) return false;
  // Multi-token prediction / speculative-decoding companion weights — not standalone LLMs.
  if (lower.startsWith('mtp-') || lower.includes('-mtp-')) return false;
  if (lower.startsWith('draft-') || lower.includes('-draft-')) return false;
  // Importance matrix for quantization — not runnable model weights.
  if (lower.includes('imatrix')) return false;
  if (/split-\d+-of-\d+/i.test(lower)) return false;
  if (/-\d+-of-\d+\.gguf$/i.test(lower)) return false;
  return true;
}

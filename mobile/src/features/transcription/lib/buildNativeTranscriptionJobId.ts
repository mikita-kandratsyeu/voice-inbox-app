/** Unique native job id per transcription attempt (record id alone collides on retry). */
export const buildNativeTranscriptionJobId = (recordId: string, jobGen: number): string =>
  `${recordId}:${jobGen}`;

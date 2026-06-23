type AskTurnFormatOptions = {
  interpretations?: string[];
  interpretationsHeading?: string;
};

function appendInterpretationsBlock(parts: string[], options?: AskTurnFormatOptions): void {
  const interpretations = options?.interpretations?.map((line) => line.trim()).filter(Boolean);
  if (!interpretations?.length) return;

  const heading = options?.interpretationsHeading?.trim() || 'Not from the note';
  parts.push(`${heading}\n${interpretations.map((line) => `• ${line}`).join('\n')}`);
}

export function formatAskTurnForClipboard(
  question: string,
  answer: string,
  options?: AskTurnFormatOptions,
): string {
  const q = question.trim();
  const parts: string[] = [];
  if (q) parts.push(q);
  parts.push(answer);
  appendInterpretationsBlock(parts, options);
  return parts.join('\n\n');
}

export function formatAskTurnForShare(
  question: string,
  answer: string,
  recordTitle: string,
  options?: AskTurnFormatOptions,
): string {
  return `${formatAskTurnForClipboard(question, answer, options)}\n\n— ${recordTitle}`;
}

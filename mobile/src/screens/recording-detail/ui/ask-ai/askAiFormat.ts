export function formatAskTurnForClipboard(question: string, answer: string): string {
  const q = question.trim();
  if (!q) return answer;
  return `${q}\n\n${answer}`;
}

export function formatAskTurnForShare(
  question: string,
  answer: string,
  recordTitle: string,
): string {
  return `${formatAskTurnForClipboard(question, answer)}\n\n— ${recordTitle}`;
}

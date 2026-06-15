const ANALYTICAL_ASK_PATTERNS = [
  /риск/i,
  /вывод/i,
  /неясн/i,
  /противореч/i,
  /имплика/i,
  /гипотез/i,
  /означа/i,
  /анализ/i,
  /думаешь/i,
  /считаешь/i,
  /мнени/i,
  /подтекст/i,
  /пробел/i,
  /приоритет/i,
  /важн/i,
  /главн/i,
  /\brisk\b/i,
  /\bimplication/i,
  /\bunclear/i,
  /\bcontradict/i,
  /\bhypoth/i,
  /\binterpret/i,
  /\banalyz/i,
  /\bconclusion/i,
  /\bwhat does .* mean/i,
];

export const ASK_INTERPRETATION_USER_HINT =
  'This question invites analysis beyond literal facts. Include at least 1 cautious inference in the "interpretations" array (never in "answer"). Keep only note-grounded facts in "answer".';

export function isAskQuestionAnalytical(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  return ANALYTICAL_ASK_PATTERNS.some((pattern) => pattern.test(q));
}

export function buildAskInterpretationUserHintBlock(question: string): string | null {
  if (!isAskQuestionAnalytical(question)) return null;
  return `\n\n${ASK_INTERPRETATION_USER_HINT}`;
}

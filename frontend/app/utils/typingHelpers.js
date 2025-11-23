export const TYPING_INTERVAL_MS = 12;
const TYPING_WORD_INTERVAL_MS = 30;
const LONG_TEXT_THRESHOLD = 500;

export function getTypingChunk(text, currentIndex) {
  if (text.length < LONG_TEXT_THRESHOLD) {
    return 1;
  }

  const remaining = text.slice(currentIndex);
  const nextSpace = remaining.indexOf(' ');

  if (nextSpace === -1) {
    return remaining.length;
  }

  if (nextSpace < 5) {
    return nextSpace + 1;
  }

  return Math.min(nextSpace + 1, 10);
}

export function getTypingInterval(text) {
  return text.length >= LONG_TEXT_THRESHOLD
    ? TYPING_WORD_INTERVAL_MS
    : TYPING_INTERVAL_MS;
}

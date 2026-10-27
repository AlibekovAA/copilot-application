const TYPING_INTERVAL_MS = 12;
const TYPING_WORD_INTERVAL_MS = 30;
const LONG_TEXT_THRESHOLD = 500;
const MAX_TYPING_UPDATES = 150;

function getMinimumChunkSize(text) {
  return Math.max(1, Math.ceil(text.length / MAX_TYPING_UPDATES));
}

export function getTypingChunk(text, currentIndex) {
  const minimumChunkSize = getMinimumChunkSize(text);

  if (text.length < LONG_TEXT_THRESHOLD) {
    return minimumChunkSize;
  }

  const remaining = text.slice(currentIndex);
  const nextSpace = remaining.indexOf(' ');

  if (nextSpace === -1) {
    return remaining.length;
  }

  if (nextSpace < 5) {
    return Math.max(nextSpace + 1, minimumChunkSize);
  }

  return Math.max(Math.min(nextSpace + 1, 10), minimumChunkSize);
}

export function getTypingInterval(text) {
  return text.length >= LONG_TEXT_THRESHOLD
    ? TYPING_WORD_INTERVAL_MS
    : TYPING_INTERVAL_MS * getMinimumChunkSize(text);
}

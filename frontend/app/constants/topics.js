export const TOPICS = [
  'юриспруденция',
  'маркетинг',
  'финансы',
  'управление',
  'продажи',
  'HR',
];

export const TOPIC_TO_DOMAIN = {
  юриспруденция: 'legal',
  маркетинг: 'marketing',
  финансы: 'finance',
  продажи: 'sales',
  управление: 'management',
  HR: 'hr',
};

export function getDomainFromTopic(topic) {
  return TOPIC_TO_DOMAIN[topic] || 'general';
}

export function removeHashtagsFromText(text) {
  let result = text;

  result = result.replace(/^(#[^\s]+(?:\s+#[^\s]+)*)\s*/g, '');

  const endHashtagMatch = result.match(/\s+(#[^\s]+(?:\s+#[^\s]+)*)$/);
  if (endHashtagMatch) {
    result = result.replace(/\s+(#[^\s]+(?:\s+#[^\s]+)*)$/g, '');
  }

  return result;
}

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

export function extractDomainFromQuestion(question) {
  const hashtagMatch = question.match(/^#([^\s]+)/);
  if (hashtagMatch) {
    const topic = hashtagMatch[1];
    return getDomainFromTopic(topic);
  }
  return 'general';
}

export function extractTopicsFromHashtags(text) {
  const endHashtagPattern = /\s+(#[^\s]+(?:\s+#[^\s]+)*)$/;
  const endMatch = text.match(endHashtagPattern);
  if (endMatch) {
    const hashtags = endMatch[1].split(/\s+/);
    const topicsFromHashtags = hashtags.map((h) => h.replace('#', ''));
    return topicsFromHashtags.filter((t) => TOPICS.includes(t));
  }

  const startHashtagPattern = /^(#[^\s]+(?:\s+#[^\s]+)*)\s*/;
  const startMatch = text.match(startHashtagPattern);
  if (startMatch) {
    const hashtags = startMatch[1].split(/\s+/);
    const topicsFromHashtags = hashtags.map((h) => h.replace('#', ''));
    return topicsFromHashtags.filter((t) => TOPICS.includes(t));
  }

  return [];
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

export const generateId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export function createUserMessage(content, files = []) {
  const timestamp = new Date().toISOString();

  let messageContent = content;
  if (files.length > 0) {
    const fileNames = files.map((f) => f.name).join(', ');
    messageContent = content
      ? `${content}\n\n[Прикреплено файлов: ${files.length} - ${fileNames}]`
      : `[Прикреплено файлов: ${files.length} - ${fileNames}]`;
  }

  return {
    id: generateId(),
    role: 'user',
    content: messageContent,
    timestamp,
    files:
      files.length > 0
        ? files.map((f) => ({ name: f.name, size: f.size }))
        : undefined,
  };
}

export function createAssistantMessage(content) {
  return {
    id: generateId(),
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
  };
}

export function createSession(conversationId = null) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    conversationId: conversationId,
    title: 'Новый диалог',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function getSessionTitle(question, files = []) {
  if (question) {
    return question;
  }
  if (files.length > 0) {
    return `Файлы (${files.length})`;
  }
  return 'Новый диалог';
}

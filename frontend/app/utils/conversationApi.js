import { API_URL, getAuthHeaders, handleApiError } from './apiHelpers';

export async function loadMessagesForConversation(conversationId) {
  const response = await fetch(
    `${API_URL}/conversations/${conversationId}/messages`,
    {
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const errorMessage = await handleApiError(
      response,
      'Не удалось загрузить сообщения',
    );
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.messages || [];
}

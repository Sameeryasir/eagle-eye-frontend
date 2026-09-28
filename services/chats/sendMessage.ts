import { apiPost, ApiRoutes } from '../api/client';

export const sendMessage = async (conversationId, content, file = null, messageId = null) => {
  let requestBody;

  if (file) {
    requestBody = new FormData();
    requestBody.append('conversationId', conversationId.toString());

    if (content && content.trim()) {
      requestBody.append('content', content.trim());
    }

    if (messageId) {
      requestBody.append('message_id', messageId);
    }

    requestBody.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    });
  } else {
    requestBody = {
      conversationId: conversationId,
      content: content.trim(),
    };

    if (messageId) {
      requestBody.message_id = messageId;
    }
  }

  return apiPost(ApiRoutes.chat.messages, requestBody);
};

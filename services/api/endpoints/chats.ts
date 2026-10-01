import { apiGet, apiPost } from '../client';
import { ApiRoutes } from '../routes';
import { requireId, toNumberId, unwrapData, unwrapList } from '../normalize';
import type {
  ChatMessage,
  Conversation,
  CreateSignaturePayload,
  Id,
  SubmitSignatureFile,
  User,
} from '../models';

export const chatsApi = {
  conversations: async (): Promise<Conversation[]> => {
    const response = await apiGet<unknown>(ApiRoutes.chat.conversations);
    return unwrapList<Conversation>(response, [
      'conversations',
      'data',
      'items',
    ]);
  },

  createConversation: async (payload: {
    type?: string;
    participantIds: Id[];
  }): Promise<Conversation> => {
    const response = await apiPost(ApiRoutes.chat.conversations, {
      type: payload.type || 'private',
      participantIds: payload.participantIds,
    });
    return unwrapData<Conversation>(response);
  },

  projectConversation: async (projectId: Id): Promise<Conversation> => {
    const response = await apiPost(
      ApiRoutes.chat.projectConversation(requireId(projectId, 'Project ID')),
      {}
    );
    return unwrapData<Conversation>(response);
  },

  messages: (
    conversationId: Id,
    page = 1,
    limit = 20,
    options?: { signal?: AbortSignal }
  ): Promise<ChatMessage[]> =>
    apiGet<unknown>(
      ApiRoutes.chat.conversationMessages(
        requireId(conversationId, 'Conversation ID'),
        page,
        limit
      ),
      options
    ).then((response) =>
      unwrapList<ChatMessage>(response, ['messages', 'data', 'items'])
    ),

  messagesAfter: (
    conversationId: Id,
    afterMessageId: Id,
    page = 1,
    limit = 20
  ): Promise<ChatMessage[]> =>
    apiPost<unknown>(`${ApiRoutes.chat.messagesNew}?page=${page}&limit=${limit}`, {
      conversationId: toNumberId(conversationId),
      afterMessageId: toNumberId(afterMessageId),
    }).then((response) =>
      unwrapList<ChatMessage>(response, ['messages', 'data', 'items'])
    ),

  sendMessage: async (
    conversationId: Id,
    content: string,
    file: { uri: string; name?: string; mimeType?: string } | null = null,
    messageId: string | null = null
  ): Promise<ChatMessage> => {
    let requestBody: FormData | Record<string, unknown>;

    if (file) {
      const formData = new FormData();
      formData.append('conversationId', conversationId.toString());
      if (content?.trim()) formData.append('content', content.trim());
      if (messageId) formData.append('message_id', messageId);
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
      requestBody = formData;
    } else {
      requestBody = {
        conversationId,
        content: content.trim(),
      };
      if (messageId) requestBody.message_id = messageId;
    }

    const response = await apiPost(ApiRoutes.chat.messages, requestBody);
    return unwrapData<ChatMessage>(response);
  },

  typing: (conversationId: Id, isTypingStatus: boolean): Promise<unknown> =>
    apiPost(ApiRoutes.chat.typing, {
      conversationId,
      isTyping: isTypingStatus,
    }),

  files: async (conversationId: Id): Promise<unknown> => {
    const response = await apiGet(
      ApiRoutes.chat.conversationFiles(
        requireId(conversationId, 'Conversation ID')
      )
    );
    return unwrapList(response, ['data', 'items', 'messages']);
  },

  createSignature: async (
    conversationId: Id,
    signatureData: { title?: string; notes?: string; dueDate?: string } = {}
  ): Promise<unknown> => {
    const payload: CreateSignaturePayload = {
      conversationId: toNumberId(conversationId),
    };
    if (signatureData?.title?.trim()) payload.title = signatureData.title.trim();
    if (signatureData?.notes?.trim()) payload.notes = signatureData.notes.trim();
    if (signatureData?.dueDate?.trim()) payload.dueDate = signatureData.dueDate;
    const response = await apiPost(
      ApiRoutes.signature.messageWithSignature,
      payload
    );
    return unwrapData(response);
  },

  submitSignature: (
    contractId: Id,
    signatureData: SubmitSignatureFile
  ): Promise<unknown> => {
    const formData = new FormData();
    formData.append('file', {
      uri: signatureData.uri,
      type: signatureData.type || 'image/png',
      name: signatureData.fileName || signatureData.name || 'signature.png',
    } as any);
    return apiPost(
      ApiRoutes.signature.uploadFile(requireId(contractId, 'Contract ID')),
      formData
    );
  },

  signatures: (conversationId: Id): Promise<unknown> =>
    apiGet(
      ApiRoutes.signature.byConversation(
        requireId(conversationId, 'Conversation ID')
      )
    ),

  signedSignatures: (): Promise<unknown> =>
    apiGet(ApiRoutes.signature.signedUser),

  usersForConversation: async (): Promise<User[]> => {
    const response = await apiGet<unknown>(
      ApiRoutes.users.employeesForConversation
    );
    return unwrapList<User>(response, ['users', 'employees', 'data', 'items']);
  },
};

export const getUserConversations = () => chatsApi.conversations();
export const createConversation = chatsApi.createConversation;
export const createProjectConversation = chatsApi.projectConversation;
export const getMessagesByConversationId = chatsApi.messages;
export const getMessageAfterLastMessage = chatsApi.messagesAfter;
export const sendMessage = chatsApi.sendMessage;
export const isTyping = chatsApi.typing;
export const getFilesForConversation = chatsApi.files;
export const createSignature = chatsApi.createSignature;
export const getSignaturesOfConversation = chatsApi.signatures;
export const getSignedSignatures = () => chatsApi.signedSignatures();
export const getUserForConversations = () => chatsApi.usersForConversation();

export default async function submitSignature(
  contractId: Id,
  signatureData: SubmitSignatureFile
): Promise<unknown> {
  return chatsApi.submitSignature(contractId, signatureData);
}

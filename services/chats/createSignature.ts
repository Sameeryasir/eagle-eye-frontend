import { apiPost, ApiRoutes } from '../api/client';

export async function createSignature(
  conversationId: any,
  signatureData: any = {}
) {
  const payload: Record<string, any> = {
    conversationId: parseInt(conversationId, 10),
  };

  if (signatureData?.title && signatureData.title.trim()) {
    payload.title = signatureData.title.trim();
  }

  if (signatureData?.notes && signatureData.notes.trim()) {
    payload.notes = signatureData.notes.trim();
  }

  if (signatureData?.dueDate && signatureData.dueDate.trim()) {
    payload.dueDate = signatureData.dueDate;
  }

  return apiPost(ApiRoutes.signature.messageWithSignature, payload);
}

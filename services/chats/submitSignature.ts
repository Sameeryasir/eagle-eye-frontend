import { apiPost, ApiRoutes } from '../api/client';

const submitSignature = async (contractId: any, signatureData: any) => {
  const formData = new FormData();
  formData.append('file', {
    uri: signatureData.uri,
    type: signatureData.type || 'image/png',
    name: signatureData.fileName || 'signature.png',
  } as any);

  return apiPost(ApiRoutes.signature.uploadFile(contractId), formData);
};

export default submitSignature;

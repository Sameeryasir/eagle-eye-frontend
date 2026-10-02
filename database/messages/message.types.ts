export interface MessageData {
  id: string | number;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  sender?: {
    id?: string | number;
    first_name?: string;
    last_name?: string;
  } | null;
  createdAt?: string;
  status?: string;
  signature?: {
    id?: number;
    title?: string;
    notes?: string;
    dueDate?: string;
    status?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    signedBy?: {
      id?: string | number;
      name?: string;
      email?: string;
    } | null;
  } | null;
}

export interface SignatureFieldUpdate {
  status?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  signedById?: string | number | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
}

import Toast from 'react-native-toast-message';
import { getErrorMessage } from '../services/api/errors';

type ToastKind = 'success' | 'error' | 'info';

export function showToast(
  type: ToastKind,
  title: string,
  message?: string
): void {
  Toast.show({
    type,
    text1: title,
    text2: message,
  });
}

export function showSuccessToast(title: string, message?: string): void {
  showToast('success', title, message);
}

export function showErrorToast(error: unknown, fallback = 'Something went wrong'): void {
  showToast('error', 'Error', getErrorMessage(error, fallback));
}

export function showErrorMessage(title: string, message?: string): void {
  showToast('error', title, message);
}

export function showInfoToast(title: string, message?: string): void {
  showToast('info', title, message);
}

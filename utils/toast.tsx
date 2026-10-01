// What changed: toast auto-hides in ~2.5s, tap/X dismisses, safety timer prevents stuck toasts.
// Why: library auto-hide can stall after swipe/pan; users need brief + dismissible feedback.
// Related: App.tsx <Toast />, CreateTask / CreateProject success paths.
// NOTE: must be .tsx because this file contains JSX.
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Toast, {
  BaseToast,
  ErrorToast,
  type ToastConfig,
} from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '../services/api/errors';

type ToastKind = 'success' | 'error' | 'info';

const TOAST_TOP_OFFSET = 56;
const TOAST_VISIBLE_MS = 2500;

// Bumps on every show so an older safety timer cannot hide a newer toast.
let toastGeneration = 0;

function dismissToast(): void {
  Toast.hide();
}

function DismissButton() {
  return (
    <TouchableOpacity
      onPress={dismissToast}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.dismissBtn}
      accessibilityRole="button"
      accessibilityLabel="Dismiss notification"
    >
      <Ionicons name="close" size={18} color="#6B7280" />
    </TouchableOpacity>
  );
}

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.successBorder]}
      contentContainerStyle={styles.content}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      onPress={dismissToast}
      renderTrailingIcon={() => <DismissButton />}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={[styles.toast, styles.errorBorder]}
      contentContainerStyle={styles.content}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      onPress={dismissToast}
      renderTrailingIcon={() => <DismissButton />}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={[styles.toast, styles.infoBorder]}
      contentContainerStyle={styles.content}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      onPress={dismissToast}
      renderTrailingIcon={() => <DismissButton />}
    />
  ),
};

export function showToast(
  type: ToastKind,
  title: string,
  message?: string
): void {
  const generation = ++toastGeneration;

  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: TOAST_VISIBLE_MS,
    autoHide: true,
    topOffset: TOAST_TOP_OFFSET,
    // Swipe can leave the library's pan flag stuck and block auto-hide.
    swipeable: false,
    onPress: dismissToast,
  });

  // Safety net: force hide if the library timer never fires.
  setTimeout(() => {
    if (generation === toastGeneration) {
      Toast.hide();
    }
  }, TOAST_VISIBLE_MS + 400);
}

export function showToastAfterModal(
  type: ToastKind,
  title: string,
  message?: string
): void {
  setTimeout(() => {
    showToast(type, title, message);
  }, 320);
}

export function showSuccessToast(title: string, message?: string): void {
  showToast('success', title, message);
}

export function showSuccessToastAfterModal(
  title: string,
  message?: string
): void {
  showToastAfterModal('success', title, message);
}

export function showErrorToast(
  error: unknown,
  fallback = 'Something went wrong'
): void {
  if (typeof error === 'string' && error.trim()) {
    showToast('error', error.trim());
    return;
  }
  showToast('error', 'Error', getErrorMessage(error, fallback));
}

export function showErrorMessage(title: string, message?: string): void {
  showToast('error', title, message);
}

export function showErrorMessageAfterModal(
  title: string,
  message?: string
): void {
  showToastAfterModal('error', title, message);
}

export function showInfoToast(title: string, message?: string): void {
  showToast('info', title, message);
}

const styles = StyleSheet.create({
  toast: {
    width: '92%',
    minHeight: 56,
    borderLeftWidth: 5,
    borderRadius: 12,
  },
  successBorder: {
    borderLeftColor: '#16A34A',
  },
  errorBorder: {
    borderLeftColor: '#DC2626',
  },
  infoBorder: {
    borderLeftColor: '#2563EB',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text1: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  text2: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: 2,
  },
  dismissBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

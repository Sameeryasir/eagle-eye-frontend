import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  InteractionManager,
  Platform,
} from 'react-native';
import Toast, {
  BaseToast,
  ErrorToast,
  type ToastConfig,
  type ToastShowParams,
} from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '../services/api/errors';

type ToastKind = 'success' | 'error' | 'info';

const TOAST_VISIBLE_MS = 2800;
const TOAST_TOP_OFFSET = Platform.OS === 'ios' ? 54 : 48;
const DEDUPE_MS = 900;
const AFTER_MODAL_MS = 350;

let toastGeneration = 0;
let lastToastKey = '';
let lastToastAt = 0;
let guardInstalled = false;
let nativeShow: ((params: ToastShowParams) => void) | null = null;

function dismissToast(): void {
  try {
    Toast.hide();
  } catch {
  }
}

function DismissButton() {
  return (
    <TouchableOpacity
      onPress={dismissToast}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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

function buildSafeParams(params: ToastShowParams = {}): ToastShowParams {
  const visibilityTime = params.visibilityTime ?? TOAST_VISIBLE_MS;
  return {
    ...params,
    // Always force top — never let callers park it on the tab bar
    position: 'top',
    topOffset: params.topOffset ?? TOAST_TOP_OFFSET,
    bottomOffset: undefined,
    visibilityTime,
    autoHide: true,
    swipeable: false,
    onPress: params.onPress || dismissToast,
  };
}

export function installToastGuard(): void {
  if (guardInstalled) return;
  guardInstalled = true;

  nativeShow = Toast.show.bind(Toast);

  Toast.show = ((params: ToastShowParams = {}) => {
    const safe = buildSafeParams(params);
    const key = `${safe.type || ''}|${safe.text1 || ''}|${safe.text2 || ''}`;
    const now = Date.now();

    if (key === lastToastKey && now - lastToastAt < DEDUPE_MS) {
      return;
    }

    lastToastKey = key;
    lastToastAt = now;
    const generation = ++toastGeneration;

    nativeShow?.(safe);

    setTimeout(() => {
      if (generation === toastGeneration) {
        dismissToast();
      }
    }, (safe.visibilityTime || TOAST_VISIBLE_MS) + 450);
  }) as typeof Toast.show;
}

export function showToast(
  type: ToastKind,
  title: string,
  message?: string
): void {
  if (!guardInstalled) {
    installToastGuard();
  }
  Toast.show({
    type,
    text1: title,
    text2: message,
  });
}

export function showToastAfterModal(
  type: ToastKind,
  title: string,
  message?: string
): void {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      showToast(type, title, message);
    }, AFTER_MODAL_MS);
  });
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
    minHeight: 58,
    borderLeftWidth: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    opacity: 1,
    // Solid card on Android emulator — without elevation it looks see-through over the tab bar
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    zIndex: 9999,
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
    backgroundColor: '#FFFFFF',
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

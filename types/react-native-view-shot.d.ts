declare module 'react-native-view-shot' {
  import type { ComponentType, Ref } from 'react';
  import type { ViewProps } from 'react-native';

  export type CaptureOptions = Record<string, any>;

  export function captureRef(
    viewRef: any,
    options?: CaptureOptions
  ): Promise<string>;

  export function captureScreen(options?: CaptureOptions): Promise<string>;

  const ViewShot: ComponentType<
    ViewProps & {
      children?: any;
      options?: CaptureOptions;
      captureMode?: string;
      onCapture?: (uri: string) => void;
      ref?: Ref<any>;
    }
  >;

  export default ViewShot;
}

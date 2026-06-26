import React from 'react';
import * as ReactNative from 'react-native';
import { StyleSheet, type TextProps } from 'react-native';

const PATCH_KEY = '__asliTextCapitalizePatched';

const OriginalText = ReactNative.Text;

const PatchedText = React.forwardRef<React.ComponentRef<typeof OriginalText>, TextProps>(
  function PatchedText(props, ref) {
    const style = StyleSheet.flatten([{ textTransform: 'capitalize' }, props.style]);
    return React.createElement(OriginalText, { ...props, ref, style });
  },
);

PatchedText.displayName = 'Text';

type ReactNativeModule = typeof ReactNative & { [PATCH_KEY]?: boolean };

export function applyGlobalTextCapitalize(): void {
  const moduleRef = ReactNative as ReactNativeModule;
  if (moduleRef[PATCH_KEY]) return;
  moduleRef[PATCH_KEY] = true;
  moduleRef.Text = PatchedText;
}

applyGlobalTextCapitalize();

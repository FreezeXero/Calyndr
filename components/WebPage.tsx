import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import {
  isWeb,
  WEB_CONTENT_PAD,
  WEB_DETAIL_MAX_WIDTH,
} from '@/constants/layout';

type WebPageProps = {
  children: React.ReactNode;
  variant?: 'app' | 'detail';
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export default function WebPage({
  children,
  variant = 'app',
  style,
  contentStyle,
}: WebPageProps) {
  if (!isWeb) {
    return <View style={[styles.fill, style]}>{children}</View>;
  }

  const pad = variant === 'app' ? WEB_CONTENT_PAD : 32;
  const widthCap = variant === 'detail' ? { maxWidth: WEB_DETAIL_MAX_WIDTH } : null;

  return (
    <View style={[styles.fill, styles.webOuter, style]}>
      <View style={[styles.webInner, widthCap, { paddingHorizontal: pad }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%' },
  webOuter: {
    alignItems: 'stretch',
    width: '100%',
  },
  webInner: {
    width: '100%',
    flex: 1,
    alignSelf: 'center',
  },
});

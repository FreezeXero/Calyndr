import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';

/** Horizontal inset inside the main panel (sidebar excluded) */
export const WEB_CONTENT_PAD = 40;

/** Event detail and forms */
export const WEB_DETAIL_MAX_WIDTH = 920;

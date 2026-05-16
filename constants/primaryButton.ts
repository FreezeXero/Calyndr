import { ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';

/** Shared 3D lift for light primary (white) buttons */
export const primaryButtonShadow: ViewStyle = {
  shadowColor: '#ffffff',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 4,
  borderBottomWidth: 2,
  borderBottomColor: 'rgba(0,0,0,0.2)',
};

export const primaryButton: ViewStyle = {
  backgroundColor: Colors.text,
  ...primaryButtonShadow,
};

export const primaryButtonLarge: ViewStyle = {
  ...primaryButton,
  shadowRadius: 20,
  elevation: 8,
};

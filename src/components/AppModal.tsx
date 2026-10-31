import React from 'react';
import { KeyboardAvoidingView, Modal, ModalProps, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Shared device-safe modal boundary; children retain their existing sheet layout. */
export function AppModal({ children, ...props }: ModalProps) {
  return (
    <Modal statusBarTranslucent navigationBarTranslucent {...props}>
      <SafeAreaView style={styles.boundary} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  boundary: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  fill: { flex: 1 },
});

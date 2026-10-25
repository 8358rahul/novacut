import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
          navigationBarColor: '#000000',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="editor/[id]" />
        <Stack.Screen name="photo-editor" />
        <Stack.Screen name="templates" />
        <Stack.Screen name="search" />
        <Stack.Screen name="export/[id]" />
        <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  );
}

import React from 'react';
import { router } from 'expo-router';
import { SettingsScreen } from '../features/settings/SettingsScreen';

export default function SettingsRoute() {
  return (
    <SettingsScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
    />
  );
}


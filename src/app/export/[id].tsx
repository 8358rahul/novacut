import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ExportScreen } from '../../features/export/ExportScreen';

export default function ExportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ExportScreen
      projectId={id || 'default_project'}
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

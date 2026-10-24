import React from 'react';
import { router } from 'expo-router';
import { HomeScreen } from '../features/home/HomeScreen';

export default function IndexPage() {
  return (
    <HomeScreen
      onOpenProject={(projectId) => {
        router.push({
          pathname: '/editor/[id]',
          params: { id: projectId },
        });
      }}
      onOpenPhotoEditor={(imageUri) => {
        router.push({
          pathname: '/photo-editor',
          params: imageUri ? { imageUri } : undefined,
        });
      }}
      onOpenTemplates={() => {
        router.push('/templates');
      }}
      onOpenSearch={() => {
        router.push('/search');
      }}
      onOpenSettings={() => {
        router.push('/settings');
      }}
    />
  );
}


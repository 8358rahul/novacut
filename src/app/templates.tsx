import React from 'react';
import { router } from 'expo-router';
import { TemplatesScreen } from '../features/templates/TemplatesScreen';

export default function TemplatesRoute() {
  return (
    <TemplatesScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      onOpenProject={(projectId) => {
        router.push({
          pathname: '/editor/[id]',
          params: { id: projectId },
        });
      }}
      onOpenSearch={() => {
        router.push('/search');
      }}
    />
  );
}


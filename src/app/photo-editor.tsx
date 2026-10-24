import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { PhotoEditorScreen } from '../features/photo/PhotoEditorScreen';

export default function PhotoEditorRoute() {
  const { imageUri } = useLocalSearchParams<{ imageUri?: string }>();

  return (
    <PhotoEditorScreen
      initialImageUri={imageUri}
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


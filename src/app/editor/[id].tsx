import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { EditorScreen } from '../../features/editor/EditorScreen';

export default function EditorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <EditorScreen
      projectId={id || 'default_project'}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      onExport={(projId) => {
        router.push({
          pathname: '/export/[id]',
          params: { id: projId },
        });
      }}
    />
  );
}


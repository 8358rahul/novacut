import React from 'react';
import { router } from 'expo-router';
import { SearchScreen } from '../features/search/SearchScreen';

export default function SearchRoute() {
  return (
    <SearchScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      onSelectTemplate={() => {
        router.push('/templates');
      }}
      onOpenTemplates={() => {
        router.push('/templates');
      }}
    />
  );
}


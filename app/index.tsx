import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}
      >
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(drawer)' : '/login'} />;
}


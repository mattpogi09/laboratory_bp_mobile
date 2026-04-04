import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useResponsiveLayout } from '@/utils';

export default function Index() {
  const { isAuthenticated, initializing } = useAuth();
  const responsive = useResponsiveLayout();

  if (initializing) {
    return (
      <View
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
          },
          responsive.isTablet && {
            width: '100%',
            maxWidth: 1100,
            alignSelf: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(drawer)' : '/login'} />;
}


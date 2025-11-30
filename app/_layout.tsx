import { Stack } from 'expo-router';

import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTintColor: '#111827',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen
          name="patients/[id]"
          options={{
            title: 'Patient Details',
            headerBackTitle: 'Back',
            presentation: 'card',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
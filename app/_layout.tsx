import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    // This Stack component acts like the Inertia routing wrapper
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#fff' } }}>
      
      {/* This maps to app/index.tsx */}
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      
      {/* This maps to app/login.tsx */}
      <Stack.Screen name="login" options={{ title: 'Login' }} />

    </Stack>
  );
}
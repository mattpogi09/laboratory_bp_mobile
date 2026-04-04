import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useResponsiveLayout } from '@/utils';

export default function ModalScreen() {
  const responsive = useResponsiveLayout();

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingHorizontal: responsive.horizontalPadding,
        },
        responsive.isTablet && styles.containerTablet,
      ]}
    >
      <ThemedText type="title">This is a modal</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  containerTablet: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

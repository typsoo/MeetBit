import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { PatientColors } from '@/constants/patient-theme';
import { PatientProfileProvider } from '@/context/patient-profile-context';
import { PatientRiskProvider } from '@/context/patient-risk-context';

SplashScreen.preventAutoHideAsync();

/**
 * The patient app is a fixed light theme (see constants/patient-theme.ts) —
 * every screen in the source design renders `dark=false`, so navigation
 * chrome (headers, back buttons) is pinned to a light theme too rather than
 * following the device's color scheme. The OS status bar is pinned the same
 * way below (`style="dark"`): app.json's userInterfaceStyle is "automatic",
 * so without an explicit override the status bar icons would follow system
 * dark mode and turn white — invisible against this app's light background.
 */
const PatientNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: PatientColors.screenBackground,
    card: PatientColors.card,
    text: PatientColors.ink,
    border: PatientColors.divider,
    primary: PatientColors.purple,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={PatientNavigationTheme}>
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
      <PatientRiskProvider>
        <PatientProfileProvider>
          <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: PatientColors.ink }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="why-risk" options={{ title: 'Why is my risk elevated?' }} />
            <Stack.Screen name="care-plan" options={{ title: 'My care plan' }} />
            <Stack.Screen name="profile" options={{ title: 'Profile' }} />
            <Stack.Screen name="learn/[slug]" options={{ title: 'Learn' }} />
          </Stack>
        </PatientProfileProvider>
      </PatientRiskProvider>
    </ThemeProvider>
  );
}

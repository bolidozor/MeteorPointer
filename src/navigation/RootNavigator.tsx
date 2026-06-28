import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '@features/home/HomeScreen';
import { SessionScreen } from '@features/sessions/SessionScreen';
import { AimingScreen } from '@features/sessions/AimingScreen';
import { TrainingScreen } from '@features/training/TrainingScreen';
import { ReportsScreen } from '@features/reports/ReportsScreen';
import { AccountScreen } from '@features/account/AccountScreen';
import { WebLoginScreen } from '@features/account/WebLoginScreen';
import { SettingsScreen } from '@features/settings/SettingsScreen';
import { SensorDebugScreen } from '@features/sensors/SensorDebugScreen';
import { HowToObserveScreen } from '@features/guide/HowToObserveScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep links from a scanned QR code: meteorpointer://weblogin?code=XXXX-XXXX
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['meteorpointer://'],
  config: { screens: { WebLogin: 'weblogin' } },
};

export function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Session" component={SessionScreen} />
        <Stack.Screen name="Aiming" component={AimingScreen} />
        <Stack.Screen name="Training" component={TrainingScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="WebLogin" component={WebLoginScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SensorDebug" component={SensorDebugScreen} />
        <Stack.Screen name="HowToObserve" component={HowToObserveScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

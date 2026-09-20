import { Pressable, Text } from 'react-native'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import * as Linking from 'expo-linking'
import { AddSiteScreen } from '../screens/AddSiteScreen'
import { BlockedScreen } from '../screens/BlockedScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { SiteDetailScreen } from '../screens/SiteDetailScreen'
import { UnlockScreen } from '../screens/UnlockScreen'
import { colors } from '../theme'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: colors.line,
    primary: colors.accent,
  },
}

const linking = {
  prefixes: [
    Linking.createURL('/'),
    'flowblock://',
    'https://unlock.flowblock.local',
  ],
  config: {
    screens: {
      Unlock: {
        path: 'unlock',
        parse: {
          token: (token: string) => token,
        },
      },
      Blocked: 'blocked',
      Home: '',
    },
  },
}

export function RootNavigator() {
  return (
    <NavigationContainer linking={linking} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'Flow Block',
            headerRight: () => (
              <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12}>
                <Text style={{ color: colors.accent, fontWeight: '600' }}>Settings</Text>
              </Pressable>
            ),
          })}
        />
        <Stack.Screen name="AddSite" component={AddSiteScreen} options={{ title: 'Add site' }} />
        <Stack.Screen
          name="SiteDetail"
          component={SiteDetailScreen}
          options={{ title: 'Site' }}
        />
        <Stack.Screen
          name="Blocked"
          component={BlockedScreen}
          options={{ title: 'Blocked', headerShown: false }}
        />
        <Stack.Screen
          name="Unlock"
          component={UnlockScreen}
          options={{ title: 'Unlock request' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

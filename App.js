import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppProvider, useApp } from './src/context/AppContext'
import Home from './src/screens/Home'
import PassportForm from './src/screens/PassportForm'
import PassportCard from './src/screens/PassportCard'
import PublicView from './src/screens/PublicView'
import ScanMedicine from './src/screens/ScanMedicine'
import AlarmManager from './src/screens/AlarmManager'
import { colors } from './src/theme'

const Stack = createNativeStackNavigator()

const scanOptions = {
  headerShown: false,
  presentation: 'fullScreenModal',
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: '#000', flex: 1 },
  safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  statusBarTranslucent: true,
  statusBarStyle: 'light',
  autoHideHomeIndicator: false,
}

function Root() {
  const { ready } = useApp()
  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.blue700} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="PassportForm" component={PassportForm} />
        <Stack.Screen name="PassportCard" component={PassportCard} />
        <Stack.Screen name="PublicView" component={PublicView} />
        <Stack.Screen name="Scan" component={ScanMedicine} options={scanOptions} />
        <Stack.Screen name="Alarms" component={AlarmManager} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" translucent />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate50 },
})

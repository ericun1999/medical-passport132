import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { FontAwesome } from '@expo/vector-icons'
import { AppProvider, useApp } from './src/context/AppContext'
import TabBar from './src/components/TabBar'
import Home from './src/screens/Home'
import PassportForm from './src/screens/PassportForm'
import PassportCard from './src/screens/PassportCard'
import PublicView from './src/screens/PublicView'
import ScanMedicine from './src/screens/ScanMedicine'
import AlarmManager from './src/screens/AlarmManager'
import { colors } from './src/theme'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function tabIcon(name) {
  return ({ color, size }) => <FontAwesome name={name} size={size} color={color} />
}

function PassportRoutes() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="PassportCard" component={PassportCard} />
      <Stack.Screen name="PassportForm" component={PassportForm} />
      <Stack.Screen name="PublicView" component={PublicView} />
    </Stack.Navigator>
  )
}

function Root() {
  const { ready, t, alarms } = useApp()

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.blue700} />
      </View>
    )
  }

  const activeAlarms = alarms.filter((item) => item.enabled).length

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          sceneStyle: { backgroundColor: colors.slate50 },
        }}
      >
        <Tab.Screen
          name="Home"
          component={Home}
          options={{ tabBarLabel: t.tabHome, tabBarIcon: tabIcon('home') }}
        />
        <Tab.Screen
          name="Passport"
          component={PassportRoutes}
          options={{ tabBarLabel: t.tabPassport, tabBarIcon: tabIcon('id-card') }}
        />
        <Tab.Screen
          name="Scan"
          component={ScanMedicine}
          options={{
            tabBarLabel: t.tabScan,
            tabBarIcon: tabIcon('camera'),
            sceneStyle: { backgroundColor: colors.black },
          }}
        />
        <Tab.Screen
          name="Alarms"
          component={AlarmManager}
          options={{
            tabBarLabel: t.tabAlarm,
            tabBarIcon: tabIcon('bell'),
            tabBarBadge: activeAlarms || undefined,
          }}
        />
      </Tab.Navigator>
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

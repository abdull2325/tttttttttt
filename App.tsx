import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, useTheme, Icon } from 'react-native-paper'; // Added Icon here
import { useColorScheme } from 'react-native';

// Import your components
import Login from './components/Login';
import Registration from './components/Register';
import Homepage from './components/Homepage';
import StartSession from './components/StartSession';
import ConnectBall from './components/ConnectBall';
import Profile from './components/Profile';
import Feedback from './components/Feedback';
import PreviousSessions from './components/PreviousSessions';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom theme definitions
const customLightTheme = {};

// Bottom tab navigation component
function HomeTabs() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Homepage"
        component={Homepage}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon source="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="CurrentSession"
        component={StartSession}
        options={{
          tabBarLabel: 'Session',
          tabBarIcon: ({ color, size }) => (
            <Icon source="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ConnectBallTab"
        component={ConnectBall}
        options={{
          tabBarLabel: 'Connect',
          tabBarIcon: ({ color, size }) => (
            <Icon source="bluetooth" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="PreviousSessionsTab"
        component={PreviousSessions}
        options={{
          tabBarLabel: 'Records',
          tabBarIcon: ({ color, size }) => (
            <Icon source="chart-line" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="ProfileTab"
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon source="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const App = () => {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="Login" 
            component={Login}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={Registration}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="MainApp" 
            component={HomeTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Feedback" component={Feedback} />
          <Stack.Screen name="Homepage" component={Homepage} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};
export default App;
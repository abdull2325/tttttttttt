import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions,TouchableOpacity } from 'react-native';
import { Text, useTheme, Card , Icon} from 'react-native-paper';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LineChart } from 'react-native-chart-kit';
import ConnectBall from './ConnectBall';
import StartSession from './StartSession'; // Import the missing component
import Feedback from './Feedback';
import PreviousSessions from './PreviousSessions';
import Profile from './Profile';
import { CommonStyles } from '../styles/CommonStyles';
const Tab = createBottomTabNavigator();

const Homepage = () => {
  const theme = useTheme();

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [20, 45, 28, 80, 99, 43],
    }]
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
    <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
            Performance Overview
          </Text>
          <LineChart
            data={data}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, ${opacity})`,
              labelColor: (opacity = 1) => theme.colors.primary,
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: theme.colors.secondary
              }
            }}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>85 km/h</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>Speed</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>125 rpm</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>Spin</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleLarge" style={{ color: theme.colors.primary }}>Left</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>Curve</Text>
          </Card.Content>
        </Card>
      </View>
      <TouchableOpacity style={[CommonStyles.button, styles.button]}>
        <Text style={styles.buttonText}>Start a new Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

function NavigationConfig() {
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
        name="HomeScreen"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  card: {
    marginBottom: 15,
    elevation: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  button: {
    backgroundColor: '#26A69A', // secondary color from theme
    borderRadius: 12, // roundness from theme
  },
  buttonText: {
    color: '#E0F2F1', // text color from theme
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statCard: {
    width: '31%',
    marginBottom: 15,
    elevation: 2,
  },
});

export default NavigationConfig;

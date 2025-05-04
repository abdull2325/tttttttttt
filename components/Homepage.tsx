import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors, Fonts, CommonStyles } from '../styles/CommonStyles';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import StartSession from './StartSession';
import ConnectBall from './ConnectBall';
import PreviousSessions from './PreviousSessions';
import Profile from './Profile';

const Tab = createBottomTabNavigator();

const HomepageScreen = ({ navigation }: { navigation: any }) => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ data: [20, 45, 28, 80, 99, 43] }]
  };

  return (
    <ScrollView style={CommonStyles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.card}>
        <Text style={styles.title}>Performance Overview</Text>
        <LineChart
          data={data}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: Colors.card,
            backgroundGradientFrom: Colors.card,
            backgroundGradientTo: Colors.card,
            decimalPlaces: 0,
            color: () => Colors.accent,
            labelColor: () => Colors.textSecondary,
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: Colors.accent
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>85 km/h</Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>125 rpm</Text>
          <Text style={styles.statLabel}>Spin</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Left</Text>
          <Text style={styles.statLabel}>Curve</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.sessionButton}
        onPress={() => navigation.navigate('Session')}
      >
        <Text style={styles.sessionButtonText}>Start a new Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const Homepage = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarStyle: {
        backgroundColor: Colors.card,
        height: 80,
        paddingBottom: 10,
        paddingTop: 10,
      },
      tabBarActiveTintColor: Colors.accent,
      tabBarInactiveTintColor: Colors.textSecondary,
      tabBarLabelStyle: {
        fontSize: 14,
        marginBottom: 5,
      },
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        let iconName = '';
        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Session':
            iconName = 'play-circle';
            break;
          case 'Connect':
            iconName = 'bluetooth';
            break;
          case 'Records':
            iconName = 'chart-line';
            break;
          case 'Profile':
            iconName = 'account';
            break;
          default:
            iconName = 'circle';
        }
        return <Icon name={iconName} size={32} color={color} />;
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomepageScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="home" size={32} color={color} />
        ),
      }}
    />
    <Tab.Screen name="Session" component={StartSession} />
    <Tab.Screen name="Connect" component={ConnectBall} />
    <Tab.Screen name="Records" component={PreviousSessions} />
    <Tab.Screen name="Profile" component={Profile} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 24,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '31%',
    alignItems: 'center',
    paddingVertical: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    color: Colors.accent,
    fontFamily: Fonts.bold,
    fontSize: 22,
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  sessionButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionButtonText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: 1,
  },
});

export default Homepage;

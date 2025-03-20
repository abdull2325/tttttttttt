import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Session {
  id: number;
  speed: number;
  spin: number;
  trajectory: string;
  date: string;
}

const PreviousSessions = ({ navigation }: { navigation: any }) => {
  // Mock sessions data (can be fetched from an API or local storage)
  const sessions: Session[] = [
    { id: 1, speed: 85, spin: 120, trajectory: 'Right Curve', date: '2025-01-01' },
    { id: 2, speed: 78, spin: 95, trajectory: 'Straight', date: '2025-01-02' },
    { id: 3, speed: 90, spin: 150, trajectory: 'Left Curve', date: '2025-01-03' },
    { id: 4, speed: 92, spin: 110, trajectory: 'Right Curve', date: '2025-01-04' },
    { id: 5, speed: 80, spin: 100, trajectory: 'Straight', date: '2025-01-05' },
  ];

  // Handle session click (navigate to detailed session page)
  const handleSessionClick = (sessionId: number) => {
    // Navigate to a detailed session page with the sessionId
    navigation.navigate('SessionDetail', { sessionId });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Previous Sessions</Text>

      {/* Session List */}
      {sessions.map((session) => (
        <View key={session.id} style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>Session #{session.id}</Text>
          <Text style={styles.sessionDetails}>
            Speed: {session.speed} km/h | Spin: {session.spin} rpm | Trajectory: {session.trajectory}
          </Text>
          <Text style={styles.sessionDate}>Date: {session.date}</Text>

          {/* View Details Button */}
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleSessionClick(session.id)}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Button to Go Back */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.navigate('Homepage')}
        >
          <Text style={styles.cancelButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#001C17', // background color from theme
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#E0F2F1', // text color from theme
    marginBottom: 30,
  },
  sessionCard: {
    backgroundColor: '#0A2F2A', // surface color from theme
    borderRadius: 12, // roundness from theme
    padding: 20,
    marginBottom: 20,
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E0F2F1', // text color from theme
  },
  sessionDetails: {
    fontSize: 16,
    color: '#E0F2F1', // text color from theme
    marginBottom: 15,
  },
  sessionDate: {
    fontSize: 14,
    color: '#4DB6AC', // placeholder color from theme (lighter text)
    marginBottom: 15,
  },
  viewButton: {
    backgroundColor: '#26A69A', // secondary color from theme
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12, // roundness from theme
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#E0F2F1', // text color from theme
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: '#00897B', // tertiary color from theme
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12, // roundness from theme
    width: '80%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#E0F2F1', // text color from theme
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PreviousSessions;

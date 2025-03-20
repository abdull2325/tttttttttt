import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const Feedback = ({ navigation, route }: { navigation: any, route: any }) => {
  const { speed = 0, spin = 0, trajectory = 'Unknown' } = route.params || {};  // Safe access to route params

  const [feedback, setFeedback] = useState('');

  const generatePersonalizedFeedback = () => {
    let feedbackMessage = '';

    if (speed > 80) {
      feedbackMessage += '- Speed:  Great speed! Keep up the fast pace.\n';
    } else {
      feedbackMessage += '- Speed:  Consider increasing your speed for better performance.\n';
    }

    if (spin > 100) {
      feedbackMessage += '- Spin:  Excellent spin rate! Your control is superb.\n';
    } else {
      feedbackMessage += '- Spin:  Try improving your spin for more accuracy.\n';
    }

    if (trajectory === 'Left Curve') {
      feedbackMessage += '- Trajectory:  Ensure your trajectory is smooth for more precision.\n';
    } else {
      feedbackMessage += '- Trajectory:  Adjust your trajectory for smoother motion.\n';
    }

    return feedbackMessage;
  };

  const handleFeedbackChange = (text: string) => {
    setFeedback(text);
  };

  const handleSubmit = () => {
    console.log('User Feedback submitted:', feedback);
    navigation.navigate('Homepage');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Performance</Text>

      {/* Display Performance Metrics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{speed} km/h</Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{spin} rpm</Text>
          <Text style={styles.statLabel}>Spin</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{trajectory}</Text>
          <Text style={styles.statLabel}>Trajectory</Text>
        </View>
      </View>

      {/* Personalized AI Feedback Title */}
      <Text style={styles.personalizedFeedbackTitle}>Personalized AI Feedback</Text>

      {/* Personalized Feedback */}
      <Text style={styles.feedbackText}>{generatePersonalizedFeedback()}</Text>

      {/* User Feedback Form */}
      <View style={styles.formContainer}>
        <Text style={styles.label}>Ask Ai-Model for more precise instructions</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="Enter your query.."
          placeholderTextColor="#A9A9A9"
          value={feedback}
          onChangeText={handleFeedbackChange}
        />
      </View>

      {/* Button Container for Alignment */}
      <View style={styles.buttonContainer}>
        {/* Submit Button */}
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>Ask Ai</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Homepage')}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#80CBC4', // Light background
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000', // Dark text color for contrast
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: '#0A2F2A', // White card background
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '32%',
    shadowColor: '#000', // Shadow for card effect
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFF', // Pastel red for key numbers
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666', // Soft gray for secondary text
  },
  personalizedFeedbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 18,
    color: '#555', // Softer dark gray for readability
    marginBottom: 30,
    lineHeight: 26,
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#F0F0F0', // Light gray for input field
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#666', // Soft pastel purple for the button
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 15,
    width: '80%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF', // White text for contrast
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#D3D3D3', // Light gray for cancel button
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#555', // Darker text on cancel button
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Feedback;

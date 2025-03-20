import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CommonStyles } from '../styles/CommonStyles';
import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// Define TypeScript interfaces for our data
interface BallData {
  spinSpeed: number;
  acceleration: number;
  timestamp: number;
}

interface SessionData {
  userId: string;
  startTime: Date;
  endTime?: Date;
  readings: BallData[];
}

const SessionDataHandler = ({ deviceId }: { deviceId: string }) => {
  const [sessionData, setSessionData] = useState<BallData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Start a new session in Firebase
    const startNewSession = async () => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const newSession: SessionData = {
        userId,
        startTime: new Date(),
        readings: []
      };

      const sessionRef = await firestore()
        .collection('sessions')
        .add(newSession);

      setSessionId(sessionRef.id);
      setIsRecording(true);
    };

    // Handle incoming BLE data
    const handleUpdateValueForCharacteristic = (data: any) => {
      // Assuming the TrackOrb sends data in a specific format
      // You'll need to adjust this based on your actual data format
      const ballData: BallData = {
        spinSpeed: parseFloat(data.value[0]), // Adjust parsing based on your data format
        acceleration: parseFloat(data.value[1]),
        timestamp: Date.now()
      };

      setSessionData(prev => [...prev, ballData]);

      // Save to Firebase in batches to avoid too many writes
      if (sessionId && ballData) {
        firestore()
          .collection('sessions')
          .doc(sessionId)
          .update({
            readings: firestore.FieldValue.arrayUnion(ballData)
          })
          .catch(error => console.error('Error saving data:', error));
      }
    };

    // Subscribe to characteristic updates
    const subscribeToCharacteristic = async () => {
      try {
        // You'll need to replace these with your actual service and characteristic UUIDs
        const serviceUUID = 'YOUR_SERVICE_UUID';
        const characteristicUUID = 'YOUR_CHARACTERISTIC_UUID';

        await BleManager.startNotification(deviceId, serviceUUID, characteristicUUID);
        console.log('Subscribed to notifications');
      } catch (error) {
        console.error('Error subscribing to notifications:', error);
      }
    };

    // Set up event listeners
    const characteristicUpdateListener = bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic
    );

    // Initialize
    startNewSession();
    subscribeToCharacteristic();

    // Cleanup
    return () => {
      characteristicUpdateListener.remove();
      if (sessionId) {
        firestore()
          .collection('sessions')
          .doc(sessionId)
          .update({
            endTime: new Date()
          })
          .catch(error => console.error('Error ending session:', error));
      }
    };
  }, [deviceId]);

  return (
    <View style={[CommonStyles.container, styles.container]}>
      <Text style={styles.title}>Live Session Data</Text>
      
      {sessionData.length > 0 && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataText}>
            Latest Readings:
          </Text>
          <Text style={styles.dataText}>
            Spin Speed: {sessionData[sessionData.length - 1].spinSpeed} RPM
          </Text>
          <Text style={styles.dataText}>
            Acceleration: {sessionData[sessionData.length - 1].acceleration} m/s²
          </Text>
        </View>
      )}

      <Text style={styles.recordingStatus}>
        {isRecording ? 'Recording Session...' : 'Starting Session...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    color: '#E0F2F1',
    marginBottom: 20,
  },
  dataContainer: {
    backgroundColor: 'rgba(38, 166, 154, 0.3)',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  dataText: {
    color: '#E0F2F1',
    fontSize: 18,
    marginVertical: 5,
  },
  recordingStatus: {
    color: '#E0F2F1',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  }
});

export default SessionDataHandler;
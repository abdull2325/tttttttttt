import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform, ToastAndroid, Alert } from 'react-native';
import { BleManager, Subscription } from 'react-native-ble-plx';
import RNFS from 'react-native-fs'; // Import the filesystem module

const manager = new BleManager();

const serviceUUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'; // Replace with your service UUID
const characteristicUUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'; // Replace with your characteristic UUID

const ConnectBall = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState('Not Connected');
  const [connected, setConnected] = useState(false);
  const [isReceivingData, setIsReceivingData] = useState(false); // State to track if data is being received
  const [imuData, setImuData] = useState({
    timestamp: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    accelX: 0,
    accelY: 0,
    accelZ: 0,
    gyroX: 0,
    gyroY: 0,
    gyroZ: 0,
  });
  const [recordedData, setRecordedData] = useState<Array<any>>([]); // Store all recorded data
  const [fileName, setFileName] = useState(''); // Store the current file name
  const [exportFormat, setExportFormat] = useState('csv'); // Default export format

  const subscription = useRef<Subscription | null>(null); // Use a ref to store the subscription

  // Request Bluetooth permissions based on Android version
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 31) { // Android 12+
          const bluetoothScanPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
              title: 'Bluetooth Scan Permission',
              message: 'App needs Bluetooth Scan permission',
              buttonPositive: 'OK',
            }
          );
          
          const bluetoothConnectPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
              title: 'Bluetooth Connect Permission',
              message: 'App needs Bluetooth Connect permission',
              buttonPositive: 'OK',
            }
          );
          
          if (
            bluetoothScanPermission === PermissionsAndroid.RESULTS.GRANTED &&
            bluetoothConnectPermission === PermissionsAndroid.RESULTS.GRANTED
          ) {
            console.log('Bluetooth permissions granted');
            return true;
          } else {
            console.log('Bluetooth permissions denied');
            return false;
          }
        } else {
          // For older Android versions
          const fineLocationPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'App needs location permission for Bluetooth scanning',
              buttonPositive: 'OK',
            }
          );
          
          if (fineLocationPermission === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Location permission granted');
            return true;
          } else {
            console.log('Location permission denied');
            return false;
          }
        }
      } catch (error) {
        console.error('Error requesting Bluetooth permissions:', error);
        return false;
      }
    }
    return true; // For iOS or other platforms
  };

  // Try all possible storage permissions to ensure at least one works
  const requestStoragePermissions = async () => {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need explicit permission for app document directory
    }
    
    console.log('Requesting storage permissions for Android version:', Platform.Version);
    
    // Flag to track if any permission was granted
    let anyPermissionGranted = false;
    
    try {
      // Try ALL possible storage permissions one by one
      
      // 1. Try WRITE_EXTERNAL_STORAGE permission (most compatible)
      if (PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE) {
        const writeExternalResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Write Permission',
            message: 'App needs permission to write to your storage',
            buttonPositive: 'Grant Permission',
          }
        );
        
        if (writeExternalResult === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('WRITE_EXTERNAL_STORAGE permission granted');
          anyPermissionGranted = true;
        } else {
          console.log('WRITE_EXTERNAL_STORAGE permission denied');
        }
      }
      
      // 2. Try READ_EXTERNAL_STORAGE permission
      if (PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE) {
        const readExternalResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Read Permission',
            message: 'App needs permission to read from your storage',
            buttonPositive: 'Grant Permission',
          }
        );
        
        if (readExternalResult === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('READ_EXTERNAL_STORAGE permission granted');
          anyPermissionGranted = true;
        } else {
          console.log('READ_EXTERNAL_STORAGE permission denied');
        }
      }
      
      // 3. Try Android 11+ permissions if applicable
      if (Platform.Version >= 30) {
        const readExternalResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'File Management Permission',
            message: 'App needs permission to manage files on your device',
            buttonPositive: 'Grant Permission',
          }
        );
        
        if (readExternalResult === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('READ_EXTERNAL_STORAGE permission granted');
          anyPermissionGranted = true;
        } else {
          console.log('READ_EXTERNAL_STORAGE permission denied');
        }
      }
      
      // 4. Try Android 13+ permissions if applicable
      if (Platform.Version >= 33) {
        if (PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES) {
          const readMediaResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Media Access Permission',
              message: 'App needs permission to access your media files',
              buttonPositive: 'Grant Permission',
            }
          );
          
          if (readMediaResult === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('READ_MEDIA_IMAGES permission granted');
            anyPermissionGranted = true;
          } else {
            console.log('READ_MEDIA_IMAGES permission denied');
          }
        }
      }
      
      return anyPermissionGranted;
      
    } catch (error) {
      console.error('Error requesting storage permissions:', error);
      return false;
    }
  };

  // Function to scan for and connect to devices
  const scanAndConnect = () => {
    console.log('Starting device scan...');
    setIsScanning(true);
    setStatus('Scanning for ESP32...');

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        setIsScanning(false);
        setStatus('Scan failed. Please try again.');
        return;
      }

      if (device) {
        console.log('Discovered device:', device.name, device.id, device.serviceUUIDs);
      }

      // Check if the device is the ESP32
      if (device && device.name === 'ESP32_BNO08x_Mock') {
        console.log('Found ESP32!');
        setIsScanning(false);
        setStatus('Found ESP32! Connecting...');
        manager.stopDeviceScan();

        // Connect to the device
        device
          .connect()
          .then((device) => {
            console.log('Connected to ESP32!');
            setStatus('Connected to ESP32!');
            setConnected(true);
            return device.discoverAllServicesAndCharacteristics();
          })
          .then((device) => {
            console.log('Discovered services and characteristics');
            return device.requestMTU(300); // Request larger MTU size
          })
          .then((device) => {
            console.log('MTU size:', device.mtu);
            return device;
          })
          .catch((error) => {
            console.error('Connection or notification error:', error);
            setStatus('Failed to connect or enable notifications');
          });
      }
    });
  };

  useEffect(() => {
    // Request Bluetooth permissions and start scanning only if permissions are granted
    const setup = async () => {
      const hasBtPermissions = await requestBluetoothPermissions();
      
      if (hasBtPermissions) {
        scanAndConnect();
      } else {
        setStatus('Bluetooth permission denied. Cannot scan for devices.');
      }
      
      // Request storage permissions on startup but don't block the app
      requestStoragePermissions();
    };

    setup();

    // Cleanup
    return () => {
      manager.stopDeviceScan();
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
    };
  }, []);

  // Function to manually start scanning
  const startScan = async () => {
    if (isScanning || connected) return;
    
    const hasBtPermissions = await requestBluetoothPermissions();
    if (hasBtPermissions) {
      scanAndConnect();
    } else {
      setStatus('Bluetooth permission denied. Cannot scan for devices.');
    }
  };

  // Function to generate a file name based on current date and time
  const generateFileName = () => {
    const now = new Date();
    const timestamp = 
      now.getFullYear() + 
      '-' + String(now.getMonth() + 1).padStart(2, '0') + 
      '-' + String(now.getDate()).padStart(2, '0') + 
      '_' + String(now.getHours()).padStart(2, '0') + 
      '-' + String(now.getMinutes()).padStart(2, '0') + 
      '-' + String(now.getSeconds()).padStart(2, '0');
    
    return `imu_data_${timestamp}`;
  };

  // Function to save the data to a file with a fallback approach
  const saveDataToFile = async () => {
    if (recordedData.length === 0) {
      console.log('No data to save');
      return null;
    }

    // Check storage permissions before saving
    const hasStoragePermission = await requestStoragePermissions();
    if (!hasStoragePermission) {
      setStatus('Storage permission denied. Cannot save data.');
      // Try to use internal app storage as fallback
      console.log('Attempting to save in app-specific storage instead');
    }

    try {
      let content = '';
      let extension = '';
      
      if (exportFormat === 'csv') {
        // Create CSV header
        const headers = 'timestamp,yaw,pitch,roll,accelX,accelY,accelZ,gyroX,gyroY,gyroZ\n';
        
        // Create CSV content
        content = headers + recordedData.map(data => 
          `${data.timestamp},${data.yaw},${data.pitch},${data.roll},${data.accelX},${data.accelY},${data.accelZ},${data.gyroX},${data.gyroY},${data.gyroZ}`
        ).join('\n');
        
        extension = '.csv';
      } else if (exportFormat === 'json') {
        // Create JSON content
        content = JSON.stringify(recordedData, null, 2);
        extension = '.json';
      }

      // Try several paths in order of preference until one works
      const possiblePaths = [];
      
      if (Platform.OS === 'android') {
        // Android paths in order of preference
        if (hasStoragePermission) {
          // External storage options (require permissions)
          possiblePaths.push(`${RNFS.DownloadDirectoryPath}/${fileName}${extension}`);
          possiblePaths.push(`${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}${extension}`);
          possiblePaths.push(`${RNFS.ExternalStorageDirectoryPath}/Documents/${fileName}${extension}`);
          possiblePaths.push(`${RNFS.ExternalStorageDirectoryPath}/${fileName}${extension}`);
        }
        
        // App-specific paths (no permissions needed)
        possiblePaths.push(`${RNFS.DocumentDirectoryPath}/${fileName}${extension}`); 
        possiblePaths.push(`${RNFS.CachesDirectoryPath}/${fileName}${extension}`);
      } else {
        // iOS paths
        possiblePaths.push(`${RNFS.DocumentDirectoryPath}/${fileName}${extension}`);
      }
      
      let savedPath = null;
      let errors = [];
      
      // Try each path until one works
      for (const path of possiblePaths) {
        try {
          console.log(`Attempting to save to: ${path}`);
          
          // Check if directory exists and create it if necessary
          const dirPath = path.substring(0, path.lastIndexOf('/'));
          const dirExists = await RNFS.exists(dirPath);
          
          if (!dirExists) {
            console.log(`Directory doesn't exist, creating: ${dirPath}`);
            await RNFS.mkdir(dirPath);
          }
          
          // Write the file
          await RNFS.writeFile(path, content, 'utf8');
          console.log(`Successfully saved to: ${path}`);
          savedPath = path;
          break;
        } catch (error) {
          console.log(`Failed to save to ${path}: ${(error as Error).message}`);
          errors.push({ path, error: (error as Error).message });
        }
      }
      
      if (savedPath) {
        // Success case
        const friendlyPath = savedPath.split('/').pop(); // Just show filename for user
        
        // Notify user
        if (Platform.OS === 'android') {
          ToastAndroid.show(`Data saved to ${friendlyPath}`, ToastAndroid.LONG);
        } else {
          Alert.alert('Success', `Data saved to ${friendlyPath}`);
        }
        
        return savedPath;
      } else {
        // All paths failed
        console.error('All save attempts failed:', JSON.stringify(errors));
        
        const errorMsg = 'Could not save file to any location';
        if (Platform.OS === 'android') {
          ToastAndroid.show(errorMsg, ToastAndroid.LONG);
        } else {
          Alert.alert('Error', errorMsg);
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error saving data:', error);
      
      const errorMsg = `Save error: ${(error instanceof Error ? error.message : 'Unknown error')}`;
      if (Platform.OS === 'android') {
        ToastAndroid.show(errorMsg, ToastAndroid.LONG);
      } else {
        Alert.alert('Error', errorMsg);
      }
      
      return null;
    }
  };

  // Function to toggle data reception
  const toggleDataReception = async () => {
    if (!connected) {
      setStatus('Not connected to ESP32');
      return;
    }

    if (isReceivingData) {
      // Stop receiving data
      if (subscription.current) {
        subscription.current.remove(); // Remove the subscription
        subscription.current = null;
        console.log('Subscription removed');
      }
      setIsReceivingData(false);
      setStatus('Data reception stopped');
      
      // Save the recorded data to a file
      const savedPath = await saveDataToFile();
      if (savedPath) {
        setStatus(`Data saved to file`);
      }
      
      // Clear recorded data after saving
      setRecordedData([]);
      
    } else {
      // Start receiving data
      const devices = await manager.connectedDevices([serviceUUID]);
      if (devices.length === 0) {
        setStatus('Device not connected');
        return;
      }

      const device = devices[0];
      console.log('Device:', device);
      
      // Generate a new file name for this recording session
      const newFileName = generateFileName();
      setFileName(newFileName);
      
      // Clear any previous data
      setRecordedData([]);

      subscription.current = device.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error('Notification error:', error);
            setStatus('Notification error');
            return;
          }
          if (characteristic) {
            const value = characteristic.value;
            if (value !== null) {
              console.log('Raw data:', value); // Log raw Base64 data
              const decodedValue = atob(value); // Decode Base64
              console.log('Decoded data:', decodedValue);

              // Split the CSV string into individual values
              const values = decodedValue.split(',');

              // Ensure there are exactly 10 values
              if (values.length === 10) {
                // Parse the values into numbers
                const [
                  timestamp,
                  yaw,
                  pitch,
                  roll,
                  accelX,
                  accelY,
                  accelZ,
                  gyroX,
                  gyroY,
                  gyroZ,
                ] = values.map(Number);

                // Create a data object
                const dataPoint = {
                  timestamp,
                  yaw,
                  pitch,
                  roll,
                  accelX,
                  accelY,
                  accelZ,
                  gyroX,
                  gyroY,
                  gyroZ,
                };

                // Update the IMU data state for display
                setImuData(dataPoint);
                
                // Add to recorded data array
                setRecordedData(prevData => [...prevData, dataPoint]);
              } else {
                console.error('Invalid data format: Expected 10 values, got', values.length);
              }
            }
            setStatus('Data received!');
          } else {
            console.error('Characteristic is null');
            setStatus('Characteristic is null');
          }
        },
      );

      setIsReceivingData(true);
      setStatus(`Recording data to ${newFileName}.${exportFormat}`);
      console.log('Subscription created');
    }
  };

  // Function to manually request storage permissions with comprehensive feedback
  const requestStoragePermissionsManually = async () => {
    setStatus('Requesting storage permissions...');
    
    const result = await requestStoragePermissions();
    
    if (result) {
      setStatus('Storage permission granted!');
      ToastAndroid.show('Storage permission granted', ToastAndroid.SHORT);
      
      // Check if we can actually write to storage
      try {
        const testFile = `${RNFS.DocumentDirectoryPath}/test.txt`;
        await RNFS.writeFile(testFile, 'test', 'utf8');
        await RNFS.unlink(testFile);
        setStatus('Storage permission verified - can write files');
        ToastAndroid.show('Storage access verified', ToastAndroid.SHORT);
      } catch (error) {
        setStatus(`Permission granted but write failed: ${(error as Error).message}`);
        ToastAndroid.show('Permission granted but write test failed', ToastAndroid.LONG);
      }
    } else {
      setStatus('Storage permission denied');
      
      // Show directory information to help diagnose issues
      try {
        // Check which directories we can access
        const appDir = await RNFS.exists(RNFS.DocumentDirectoryPath);
        const dlDir = await RNFS.exists(RNFS.DownloadDirectoryPath);
        const externalDir = await RNFS.exists(RNFS.ExternalStorageDirectoryPath);
        
        setStatus(`Permission denied. Available dirs: App=${appDir}, Downloads=${dlDir}, External=${externalDir}`);
      } catch (error) {
        setStatus(`Permission denied: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Toggle export format between CSV and JSON
  const toggleExportFormat = () => {
    setExportFormat(current => current === 'csv' ? 'json' : 'csv');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect ESP32</Text>
      <Text style={styles.description}>
        Ensure your ESP32 is powered on and within range to connect.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={startScan}
        disabled={connected || isScanning}>
        <Text style={styles.buttonText}>
          {connected ? 'Connected to ESP32' : isScanning ? 'Scanning...' : 'Search for ESP32'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: isReceivingData ? '#FF5252' : '#26A69A' }]}
        onPress={toggleDataReception}
        disabled={!connected}>
        <Text style={styles.buttonText}>
          {isReceivingData ? 'Stop Recording Data' : 'Start Recording Data'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#5D4037' }]}
        onPress={toggleExportFormat}
        disabled={isReceivingData}>
        <Text style={styles.buttonText}>
          {`Format: ${exportFormat.toUpperCase()}`}
        </Text>
      </TouchableOpacity>

      {/* New button for requesting storage permissions manually */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#673AB7' }]}
        onPress={requestStoragePermissionsManually}>
        <Text style={styles.buttonText}>
          Request Storage Permission
        </Text>
      </TouchableOpacity>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Status: {status}</Text>
        <Text style={styles.statusText}>Timestamp: {imuData.timestamp.toFixed(6)}</Text>
        <Text style={styles.statusText}>Yaw: {imuData.yaw.toFixed(2)}</Text>
        <Text style={styles.statusText}>Pitch: {imuData.pitch.toFixed(2)}</Text>
        <Text style={styles.statusText}>Roll: {imuData.roll.toFixed(2)}</Text>
        <Text style={styles.statusText}>AccelX: {imuData.accelX.toFixed(2)}</Text>
        <Text style={styles.statusText}>AccelY: {imuData.accelY.toFixed(2)}</Text>
        <Text style={styles.statusText}>AccelZ: {imuData.accelZ.toFixed(2)}</Text>
        <Text style={styles.statusText}>GyroX: {imuData.gyroX.toFixed(2)}</Text>
        <Text style={styles.statusText}>GyroY: {imuData.gyroY.toFixed(2)}</Text>
        <Text style={styles.statusText}>GyroZ: {imuData.gyroZ.toFixed(2)}</Text>
        
        {recordedData.length > 0 && (
          <Text style={styles.statusText}>Data points: {recordedData.length}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#80CBC4',
  },
  title: {
    fontSize: 24,
    color: '#E0F2F1',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#E0F2F1',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#26A69A',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#E0F2F1',
    fontSize: 18,
  },
  statusContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  statusText: {
    color: '#E0F2F1',
    fontSize: 18,
  },
});

export default ConnectBall;
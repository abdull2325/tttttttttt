import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import RNFS from 'react-native-fs';
import { useFocusEffect } from '@react-navigation/native';

interface IMUData {
  timestamp: number;
  yaw: number;
  pitch: number;
  roll: number;
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
}

interface CalculatedData extends IMUData {
  totalAcceleration: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  speed: number;
  totalDistance: number;
  spinRate: number;
  spinDirection: string;
}

interface FileInfo {
  name: string;
  path: string;
  isProcessed: boolean;
}

// Constants for calculations
const ALPHA = 0.1; // Smoothing factor for low-pass filter (same as Python)
const VELOCITY_SMOOTHING = 0.9; // Exponential smoothing factor for velocity calculation

const DataProcessor = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileStats, setFileStats] = useState<{[key: string]: any}>({});
  
  // Load available files when component mounts or comes into focus
  useFocusEffect(
    React.useCallback(() => {
      findIMUDataFiles();
      return () => {};
    }, [])
  );

  // Find all IMU data CSV files in the app's documents directory
  const findIMUDataFiles = async () => {
    try {
      const dirPath = RNFS.DocumentDirectoryPath;
      const filesInDir = await RNFS.readDir(dirPath);
      
      // Filter for IMU data CSV files
      const imuFiles = filesInDir
        .filter(file => file.name.startsWith('imu_data_') && file.name.endsWith('.csv'))
        .map(file => {
          const processedFilePath = `${dirPath}/processed_${file.name}`;
          const calculatedFilePath = `${dirPath}/calculated_${file.name}`;
          
          return {
            name: file.name,
            path: file.path,
            isProcessed: RNFS.exists(calculatedFilePath), // Mark as processed if calculated file exists
          };
        });
      
      setFiles(imuFiles);
      console.log(`Found ${imuFiles.length} IMU data files`);
    } catch (error) {
      console.error('Error finding IMU data files:', error);
      Alert.alert('Error', 'Failed to find IMU data files');
    }
  };

  // Process a single file
  const processFile = async (file: FileInfo) => {
    if (processing) return;
    
    setProcessing(true);
    setSelectedFile(file);
    
    try {
      console.log(`Processing file: ${file.name}`);
      
      // Step 1: Read raw data
      const rawData = await readCSVFile(file.path);
      if (rawData.length === 0) {
        throw new Error('No valid data found in file');
      }
      
      // Step 2: Calculate offset (calibration)
      const offset = calculateOffset(rawData);
      console.log('Calculated offset:', offset);
      
      // Step 3: Adjust data and apply low-pass filter
      const adjustedData = adjustData(rawData, offset);
      
      // Step 4: Calculate metrics
      const calculatedData = calculateMetrics(adjustedData);
      
      // Step 5: Save processed data
      const dirPath = RNFS.DocumentDirectoryPath;
      const processedFilePath = `${dirPath}/processed_${file.name}`;
      const calculatedFilePath = `${dirPath}/calculated_${file.name}`;
      
      await saveAdjustedData(adjustedData, processedFilePath);
      await saveCalculatedData(calculatedData, calculatedFilePath);
      
      // Step 6: Calculate statistics
      const stats = calculateStatistics(calculatedData);
      setFileStats({
        fileName: file.name,
        dataPoints: calculatedData.length,
        maxSpeed: stats.maxSpeed.toFixed(2),
        avgSpeed: stats.avgSpeed.toFixed(2),
        totalDistance: stats.totalDistance.toFixed(2),
        avgSpinRate: stats.avgSpinRate.toFixed(2),
        maxSpinRate: stats.maxSpinRate.toFixed(2),
        dominantSpinDirection: stats.dominantSpinDirection,
      });
      
      // Update file list
      findIMUDataFiles();
      
      Alert.alert('Success', `Processed data saved to calculated_${file.name}`);
    } catch (error) {
      console.error('Error processing file:', error);
      Alert.alert('Error', `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  // Read CSV file and parse data
  const readCSVFile = async (filePath: string): Promise<IMUData[]> => {
    try {
      const content = await RNFS.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      if (lines.length <= 1) {
        throw new Error('File is empty or contains only headers');
      }
      
      const data: IMUData[] = [];
      
      // Skip the header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length < 10) continue;
        
        try {
          data.push({
            timestamp: parseFloat(parts[0]),
            yaw: parseFloat(parts[1]),
            pitch: parseFloat(parts[2]),
            roll: parseFloat(parts[3]),
            accelX: parseFloat(parts[4]),
            accelY: parseFloat(parts[5]),
            accelZ: parseFloat(parts[6]),
            gyroX: parseFloat(parts[7]),
            gyroY: parseFloat(parts[8]),
            gyroZ: parseFloat(parts[9]),
          });
        } catch (e) {
          console.warn('Skipping invalid data line:', line);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error reading CSV file:', error);
      throw new Error('Failed to read CSV file');
    }
  };

  // Calculate offset based on first 1000 values (same as Python function)
  const calculateOffset = (data: IMUData[]) => {
    const offset = {
      yaw: 0, pitch: 0, roll: 0,
      accelX: 0, accelY: 0, accelZ: 0,
      gyroX: 0, gyroY: 0, gyroZ: 0,
    };
    
    const calibrationCount = Math.min(1000, data.length);
    
    if (calibrationCount === 0) {
      return offset;
    }
    
    // Sum up the first calibrationCount values
    for (let i = 0; i < calibrationCount; i++) {
      offset.yaw += data[i].yaw;
      offset.pitch += data[i].pitch;
      offset.roll += data[i].roll;
      offset.accelX += data[i].accelX;
      offset.accelY += data[i].accelY;
      offset.accelZ += data[i].accelZ;
      offset.gyroX += data[i].gyroX;
      offset.gyroY += data[i].gyroY;
      offset.gyroZ += data[i].gyroZ;
    }
    
    // Calculate averages
    for (const key in offset) {
      offset[key as keyof typeof offset] /= calibrationCount;
    }
    
    return offset;
  };

  // Apply low-pass filter (same as Python function)
  const applyLowPassFilter = (data: IMUData[]): IMUData[] => {
    if (data.length === 0) return [];
    
    const smoothed: IMUData[] = [];
    let previous: IMUData | null = null;
    
    for (const current of data) {
      if (previous === null) {
        smoothed.push({...current});
        previous = current;
      } else {
        const smoothedPoint: IMUData = {
          timestamp: current.timestamp,
          yaw: ALPHA * current.yaw + (1 - ALPHA) * previous.yaw,
          pitch: ALPHA * current.pitch + (1 - ALPHA) * previous.pitch,
          roll: ALPHA * current.roll + (1 - ALPHA) * previous.roll,
          accelX: ALPHA * current.accelX + (1 - ALPHA) * previous.accelX,
          accelY: ALPHA * current.accelY + (1 - ALPHA) * previous.accelY,
          accelZ: ALPHA * current.accelZ + (1 - ALPHA) * previous.accelZ,
          gyroX: ALPHA * current.gyroX + (1 - ALPHA) * previous.gyroX,
          gyroY: ALPHA * current.gyroY + (1 - ALPHA) * previous.gyroY,
          gyroZ: ALPHA * current.gyroZ + (1 - ALPHA) * previous.gyroZ,
        };
        
        smoothed.push(smoothedPoint);
        previous = smoothedPoint;
      }
    }
    
    return smoothed;
  };

  // Adjust data by subtracting offset and applying filter
  const adjustData = (data: IMUData[], offset: any): IMUData[] => {
    // Subtract offset
    const adjusted = data.map(point => ({
      timestamp: point.timestamp,
      yaw: point.yaw - offset.yaw,
      pitch: point.pitch - offset.pitch,
      roll: point.roll - offset.roll,
      accelX: point.accelX - offset.accelX,
      accelY: point.accelY - offset.accelY,
      accelZ: point.accelZ - offset.accelZ,
      gyroX: point.gyroX - offset.gyroX,
      gyroY: point.gyroY - offset.gyroY,
      gyroZ: point.gyroZ - offset.gyroZ,
    }));
    
    // Apply low-pass filter
    return applyLowPassFilter(adjusted);
  };

  // Calculate total acceleration
  const calculateTotalAcceleration = (ax: number, ay: number, az: number): number => {
    return Math.sqrt(ax * ax + ay * ay + az * az);
  };

  // Calculate velocity (equivalent to Python function)
  const calculateVelocity = (data: IMUData[]): number[][] => {
    const velocityX: number[] = [0];
    const velocityY: number[] = [0];
    const velocityZ: number[] = [0];
    
    for (let i = 1; i < data.length; i++) {
      const dt = data[i].timestamp - data[i-1].timestamp;
      if (dt <= 0) continue;
      
      const ax = data[i].accelX;
      const ay = data[i].accelY;
      const az = data[i].accelZ;
      
      // Trapezoidal integration with exponential smoothing
      const vx = VELOCITY_SMOOTHING * (velocityX[i-1] + ((ax + data[i-1].accelX) / 2) * dt);
      const vy = VELOCITY_SMOOTHING * (velocityY[i-1] + ((ay + data[i-1].accelY) / 2) * dt);
      const vz = VELOCITY_SMOOTHING * (velocityZ[i-1] + ((az + data[i-1].accelZ) / 2) * dt);
      
      velocityX.push(vx);
      velocityY.push(vy);
      velocityZ.push(vz);
    }
    
    return [velocityX, velocityY, velocityZ];
  };

  // Calculate distance (equivalent to Python function)
  const calculateDistance = (data: IMUData[], velocityX: number[], velocityY: number[], velocityZ: number[]): number[] => {
    const distances: number[] = [0];
    
    for (let i = 1; i < data.length; i++) {
      const dt = data[i].timestamp - data[i-1].timestamp;
      if (dt <= 0) continue;
      
      const sx = (velocityX[i] + velocityX[i-1]) / 2 * dt;
      const sy = (velocityY[i] + velocityY[i-1]) / 2 * dt;
      const sz = (velocityZ[i] + velocityZ[i-1]) / 2 * dt;
      
      distances.push(distances[i-1] + Math.sqrt(sx*sx + sy*sy + sz*sz));
    }
    
    return distances;
  };

  // Calculate spin rate in RPM
  const calculateSpin = (gyroX: number, gyroY: number, gyroZ: number): number => {
    const radPerSec = Math.sqrt(gyroX*gyroX + gyroY*gyroY + gyroZ*gyroZ);
    const rpm = (radPerSec * 60) / (2 * Math.PI);  // Convert rad/s to RPM
    return Math.round(rpm * 100) / 100;  // Round to 2 decimal places
  };

  // Determine spin direction
  const calculateSpinDirection = (data: IMUData): string => {
    const { yaw, pitch, roll, gyroX, gyroY, gyroZ } = data;
    
    if (yaw === 0 && pitch === 0 && roll === 0) {
      return 'no-spin';
    }
    
    if (Math.abs(gyroX) > Math.abs(gyroY) && Math.abs(gyroX) > Math.abs(gyroZ)) {
      return 'Off-spin';
    } else if (Math.abs(gyroY) > Math.abs(gyroX) && Math.abs(gyroY) > Math.abs(gyroZ)) {
      return 'Leg-spin';
    } else {
      return 'Top-spin';
    }
  };

  // Calculate all metrics
  const calculateMetrics = (data: IMUData[]): CalculatedData[] => {
    if (data.length === 0) return [];
    
    // Calculate total acceleration
    const dataWithAccel = data.map(point => ({
      ...point,
      totalAcceleration: calculateTotalAcceleration(point.accelX, point.accelY, point.accelZ),
    }));
    
    // Calculate velocity
    const [velocityX, velocityY, velocityZ] = calculateVelocity(data);
    
    // Calculate distance
    const distances = calculateDistance(data, velocityX, velocityY, velocityZ);
    
    // Calculate spin rate and direction
    const calculatedData: CalculatedData[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const speed = Math.sqrt(
        velocityX[i] * velocityX[i] + 
        velocityY[i] * velocityY[i] + 
        velocityZ[i] * velocityZ[i]
      );
      
      const spinRate = calculateSpin(data[i].gyroX, data[i].gyroY, data[i].gyroZ);
      const spinDirection = calculateSpinDirection(data[i]);
      
      calculatedData.push({
        ...data[i],
        totalAcceleration: dataWithAccel[i].totalAcceleration,
        velocityX: velocityX[i],
        velocityY: velocityY[i],
        velocityZ: velocityZ[i],
        speed: speed,
        totalDistance: distances[i],
        spinRate: spinRate,
        spinDirection: spinDirection,
      });
    }
    
    return calculatedData;
  };

  // Save adjusted data to file
  const saveAdjustedData = async (data: IMUData[], filePath: string): Promise<void> => {
    try {
      let content = 'timestamp,yaw,pitch,roll,accelX,accelY,accelZ,gyroX,gyroY,gyroZ\n';
      
      data.forEach(point => {
        content += `${point.timestamp.toFixed(6)},${point.yaw.toFixed(4)},${point.pitch.toFixed(4)},${point.roll.toFixed(4)},${point.accelX.toFixed(2)},${point.accelY.toFixed(2)},${point.accelZ.toFixed(2)},${point.gyroX.toFixed(2)},${point.gyroY.toFixed(2)},${point.gyroZ.toFixed(2)}\n`;
      });
      
      await RNFS.writeFile(filePath, content, 'utf8');
      console.log(`Adjusted data saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving adjusted data:', error);
      throw new Error('Failed to save adjusted data');
    }
  };

  // Save calculated data to file
  const saveCalculatedData = async (data: CalculatedData[], filePath: string): Promise<void> => {
    try {
      let content = 'timestamp,yaw,pitch,roll,accelX,accelY,accelZ,gyroX,gyroY,gyroZ,totalAcceleration,velocityX,velocityY,velocityZ,speed,totalDistance,spinRate,spinDirection\n';
      
      data.forEach(point => {
        content += `${point.timestamp.toFixed(6)},${point.yaw.toFixed(4)},${point.pitch.toFixed(4)},${point.roll.toFixed(4)},${point.accelX.toFixed(2)},${point.accelY.toFixed(2)},${point.accelZ.toFixed(2)},${point.gyroX.toFixed(2)},${point.gyroY.toFixed(2)},${point.gyroZ.toFixed(2)},${point.totalAcceleration.toFixed(2)},${point.velocityX.toFixed(4)},${point.velocityY.toFixed(4)},${point.velocityZ.toFixed(4)},${point.speed.toFixed(4)},${point.totalDistance.toFixed(4)},${point.spinRate.toFixed(2)},${point.spinDirection}\n`;
      });
      
      await RNFS.writeFile(filePath, content, 'utf8');
      console.log(`Calculated data saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving calculated data:', error);
      throw new Error('Failed to save calculated data');
    }
  };

  // Calculate statistics for display
  const calculateStatistics = (data: CalculatedData[]) => {
    if (data.length === 0) {
      return {
        maxSpeed: 0,
        avgSpeed: 0,
        totalDistance: 0,
        avgSpinRate: 0,
        maxSpinRate: 0,
        dominantSpinDirection: 'N/A',
      };
    }
    
    // Speed stats
    const speeds = data.map(point => point.speed);
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    
    // Distance - take the final value
    const totalDistance = data[data.length - 1].totalDistance;
    
    // Spin stats
    const spinRates = data.map(point => point.spinRate);
    const maxSpinRate = Math.max(...spinRates);
    const avgSpinRate = spinRates.reduce((sum, rate) => sum + rate, 0) / spinRates.length;
    
    // Dominant spin direction
    const spinDirections = data.map(point => point.spinDirection);
    const spinDirectionCounts: {[key: string]: number} = {};
    
    spinDirections.forEach(direction => {
      if (!spinDirectionCounts[direction]) {
        spinDirectionCounts[direction] = 0;
      }
      spinDirectionCounts[direction]++;
    });
    
    let dominantSpinDirection = 'N/A';
    let maxCount = 0;
    
    for (const direction in spinDirectionCounts) {
      if (spinDirectionCounts[direction] > maxCount) {
        maxCount = spinDirectionCounts[direction];
        dominantSpinDirection = direction;
      }
    }
    
    return {
      maxSpeed,
      avgSpeed,
      totalDistance,
      avgSpinRate,
      maxSpinRate,
      dominantSpinDirection,
    };
  };

  // Delete a file
  const deleteFile = async (file: FileInfo) => {
    try {
      Alert.alert(
        'Delete File',
        `Are you sure you want to delete ${file.name}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: async () => {
              await RNFS.unlink(file.path);
              
              // Also delete processed and calculated files if they exist
              const dirPath = RNFS.DocumentDirectoryPath;
              const processedPath = `${dirPath}/processed_${file.name}`;
              const calculatedPath = `${dirPath}/calculated_${file.name}`;
              
              try {
                if (await RNFS.exists(processedPath)) {
                  await RNFS.unlink(processedPath);
                }
                if (await RNFS.exists(calculatedPath)) {
                  await RNFS.unlink(calculatedPath);
                }
              } catch (error) {
                console.warn('Error deleting associated files:', error);
              }
              
              // Refresh file list
              findIMUDataFiles();
              
              // Clear stats if selected file was deleted
              if (selectedFile && selectedFile.name === file.name) {
                setSelectedFile(null);
                setFileStats({});
              }
            },
            style: 'destructive',
          },
        ],
      );
    } catch (error) {
      console.error('Error deleting file:', error);
      Alert.alert('Error', 'Failed to delete file');
    }
  };

  const renderFileItem = ({ item }: { item: FileInfo }) => (
    <View style={styles.fileItem}>
      <Text style={styles.fileName}>{item.name}</Text>
      <View style={styles.fileButtons}>
        <TouchableOpacity
          style={[styles.fileButton, { backgroundColor: '#26A69A' }]}
          onPress={() => processFile(item)}
          disabled={processing}
        >
          <Text style={styles.fileButtonText}>
            {item.isProcessed ? 'Reprocess' : 'Process'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fileButton, { backgroundColor: '#F44336' }]}
          onPress={() => deleteFile(item)}
          disabled={processing}
        >
          <Text style={styles.fileButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IMU Data Processor</Text>
      
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={findIMUDataFiles}
        disabled={processing}
      >
        <Text style={styles.buttonText}>Refresh Files</Text>
      </TouchableOpacity>
      
      {processing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#26A69A" />
          <Text style={styles.loadingText}>Processing data...</Text>
        </View>
      )}
      
      <View style={styles.filesContainer}>
        <Text style={styles.sectionTitle}>Available Files</Text>
        {files.length > 0 ? (
          <FlatList
            data={files}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.name}
            style={styles.fileList}
          />
        ) : (
          <Text style={styles.noFilesText}>No IMU data files found</Text>
        )}
      </View>
      
      {Object.keys(fileStats).length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>File Statistics</Text>
          <Text style={styles.statsText}>File: {fileStats.fileName}</Text>
          <Text style={styles.statsText}>Data Points: {fileStats.dataPoints}</Text>
          <Text style={styles.statsText}>Max Speed: {fileStats.maxSpeed} m/s</Text>
          <Text style={styles.statsText}>Avg Speed: {fileStats.avgSpeed} m/s</Text>
          <Text style={styles.statsText}>Total Distance: {fileStats.totalDistance} m</Text>
          <Text style={styles.statsText}>Avg Spin Rate: {fileStats.avgSpinRate} RPM</Text>
          <Text style={styles.statsText}>Max Spin Rate: {fileStats.maxSpinRate} RPM</Text>
          <Text style={styles.statsText}>Dominant Spin: {fileStats.dominantSpinDirection}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#80CBC4',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E0F2F1',
    marginBottom: 16,
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#26A69A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#E0F2F1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  loadingText: {
    color: '#E0F2F1',
    fontSize: 16,
    marginTop: 8,
  },
  filesContainer: {
    flex: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0F2F1',
    marginBottom: 8,
  },
  fileList: {
    backgroundColor: '#B2DFDB',
    borderRadius: 8,
  },
  fileItem: {
    flexDirection: 'column',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#80CBC4',
  },
  fileName: {
    fontSize: 16,
    color: '#004D40',
    marginBottom: 8,
  },
  fileButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  fileButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  fileButtonText: {
    color: '#E0F2F1',
    fontSize: 14,
  },
  noFilesText: {
    fontSize: 16,
    color: '#E0F2F1',
    textAlign: 'center',
    padding: 16,
  },
  statsContainer: {
    backgroundColor: '#B2DFDB',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#004D40',
    marginBottom: 4,
  },
});

export default DataProcessor;
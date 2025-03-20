import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { Line, OrbitControls } from '@react-three/drei';
import RNFS from 'react-native-fs';

const DataVisualizer3D = () => {
  const [trajectory, setTrajectory] = useState<number[][]>([]);
  const [viewMode, setViewMode] = useState('trajectory'); // 'trajectory' or 'rotation'

  useEffect(() => {
    loadProcessedFile();
  }, []);

  const loadProcessedFile = async () => {
    try {
      const dirPath = RNFS.DocumentDirectoryPath;
      const filesInDir = await RNFS.readDir(dirPath);
      const latestFile = filesInDir.filter(file => file.name.startsWith('calculated_imu_data_')).pop();
      
      if (!latestFile) return;

      const content = await RNFS.readFile(latestFile.path, 'utf8');
      const lines = content.split('\n').slice(1);
      const data = lines.filter(l => l).map(line => {
        const values = line.split(',');
        return [
          parseFloat(values[11]), // velX
          parseFloat(values[12]), // velY
          parseFloat(values[13])  // velZ
        ];
      });

      setTrajectory(data);
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>3D Motion Visualization</Text>
      <Canvas style={styles.canvas}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Line
          points={trajectory.map(([x, y, z]) => [x, y, z] as [number, number, number])}
          color="blue"
          lineWidth={3}
        />
        <OrbitControls />
      </Canvas>
      <TouchableOpacity style={styles.button} onPress={() => setViewMode(viewMode === 'trajectory' ? 'rotation' : 'trajectory')}>
        <Text style={styles.buttonText}>Toggle View ({viewMode})</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  canvas: { width: '100%', height: 400 },
  button: { backgroundColor: '#26A69A', padding: 10, borderRadius: 5, marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16 },
});

export default DataVisualizer3D;

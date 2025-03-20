import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SectionList,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import RNFS from 'react-native-fs';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path, Circle, Rect, G, Text as SvgText } from 'react-native-svg';

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
  type?: string;
}

interface StatItem {
  label: string;
  value: string;
  unit: string;
}

// Define types for section list data items
interface FileListItem extends FileInfo {
  type: 'file';
}

interface NoFilesItem {
  type: 'noFiles';
}

interface MetricsItem {
  type: 'metrics';
  stats: StatItem[];
}

interface Graph2DItem {
  type: 'graph2d';
}

interface Graph3DItem {
  type: 'graph3d';
}

type SectionListItemType = FileListItem | NoFilesItem | MetricsItem | Graph2DItem | Graph3DItem;

// Define section type
interface Section {
  title: string;
  data: SectionListItemType[];
}

// Helper function to project 3D points to 2D space (simple)
const project3DTo2D = (x: number, y: number, z: number, scale = 100): [number, number] => {
  // Simple orthographic projection - can be enhanced with perspective
  return [x * scale, y * scale];
};

const DataProcessor = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFileData, setSelectedFileData] = useState<CalculatedData[] | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [fileStats, setFileStats] = useState<StatItem[]>([]);
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('2d');

  // Custom chart configs for different metrics - like in Python version
  const chartConfigs = {
    speed: {
      backgroundGradientFrom: '#4158D0',
      backgroundGradientTo: '#C850C0',
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 3,
      useShadowColorFromDataset: false,
    },
    distance: {
      backgroundGradientFrom: '#0BAB64',
      backgroundGradientTo: '#3BB78F',
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 3,
      useShadowColorFromDataset: false,
    },
    spin: {
      backgroundGradientFrom: '#FF416C',
      backgroundGradientTo: '#FF4B2B',
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 3,
      useShadowColorFromDataset: false,
    },
    ypr: {
      backgroundGradientFrom: '#396afc',
      backgroundGradientTo: '#2948ff',
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 3,
      useShadowColorFromDataset: false,
    },
    accel: {
      backgroundGradientFrom: '#e53935',
      backgroundGradientTo: '#e35d5b',
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 3,
      useShadowColorFromDataset: false,
    },
    gyro: {
      backgroundGradientFrom: '#11998e',
      backgroundGradientTo: '#38ef7d',
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 3,
      useShadowColorFromDataset: false,
    },
    velocity: {
      backgroundGradientFrom: '#8e2de2',
      backgroundGradientTo: '#4a00e0',
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      strokeWidth: 3,
      useShadowColorFromDataset: false,
    },
  };

  // Load available files when component mounts
  useEffect(() => {
    findIMUDataFiles();
  }, []);

  // Find all IMU data CSV files in the app's documents directory
  const findIMUDataFiles = useCallback(async () => {
    try {
      setLoading(true);
      const dirPath = RNFS.DocumentDirectoryPath;
      const filesInDir = await RNFS.readDir(dirPath);

      // Filter for IMU data CSV files
      const imuFiles = await Promise.all(
        filesInDir
          .filter(file => file.name.startsWith('imu_data_') && file.name.endsWith('.csv'))
          .map(async file => {
            const calculatedFilePath = `${dirPath}/calculated_${file.name}`;
            const isProcessed = await RNFS.exists(calculatedFilePath);
            return {
              name: file.name,
              path: file.path,
              isProcessed,
            };
          })
      );

      setFiles(imuFiles);
      console.log(`Found ${imuFiles.length} IMU data files`);
    } catch (error) {
      console.error('Error finding IMU data files:', error);
      Alert.alert('Error', 'Failed to find IMU data files');
    } finally {
      setLoading(false);
    }
  }, []);

  // Parse calculated data from file
  const parseCalculatedResults = useCallback(async (filePath: string) => {
    try {
      const content = await RNFS.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const data: CalculatedData[] = [];

      // Skip header row and process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length < 18) continue;

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
          totalAcceleration: parseFloat(parts[10]),
          velocityX: parseFloat(parts[11]),
          velocityY: parseFloat(parts[12]),
          velocityZ: parseFloat(parts[13]),
          speed: parseFloat(parts[14]),
          totalDistance: parseFloat(parts[15]),
          spinRate: parseFloat(parts[16]),
          spinDirection: parts[17],
        });
      }

      return data;
    } catch (error) {
      console.error('Error parsing calculated results:', error);
      throw new Error('Failed to parse calculated results');
    }
  }, []);

  // Calculate statistics from data - enhanced like Python version
  const calculateStats = useCallback((data: CalculatedData[]) => {
    if (!data.length) return [];
    
    const maxSpeed = Math.max(...data.map(point => point.speed));
    const avgSpeed = data.reduce((sum, point) => sum + point.speed, 0) / data.length;
    const maxSpin = Math.max(...data.map(point => point.spinRate));
    const avgSpin = data.reduce((sum, point) => sum + point.spinRate, 0) / data.length;
    const totalDistance = data[data.length - 1].totalDistance;
    const directionOfSpin = data[data.length - 1].spinDirection;
    
    // Add max acceleration magnitude
    const maxAccelMagnitude = Math.max(...data.map(point => 
      Math.sqrt(point.accelX**2 + point.accelY**2 + point.accelZ**2)
    ));
    
    // Add max gyro magnitude
    const maxGyroMagnitude = Math.max(...data.map(point => 
      Math.sqrt(point.gyroX**2 + point.gyroY**2 + point.gyroZ**2)
    ));
    
    return [
      { label: 'Max Speed', value: maxSpeed.toFixed(2), unit: 'm/s' },
      { label: 'Avg Speed', value: avgSpeed.toFixed(2), unit: 'm/s' },
      { label: 'Max Spin Rate', value: maxSpin.toFixed(2), unit: 'deg/s' },
      { label: 'Avg Spin Rate', value: avgSpin.toFixed(2), unit: 'deg/s' },
      { label: 'Total Distance', value: totalDistance.toFixed(2), unit: 'm' },
      { label: 'Max Acceleration', value: maxAccelMagnitude.toFixed(2), unit: 'm/s²' },
      { label: 'Max Gyro Rate', value: maxGyroMagnitude.toFixed(2), unit: 'deg/s' },
      { label: 'Spin Direction', value: directionOfSpin, unit: '' }
    ];
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: FileInfo) => {
    if (!file.isProcessed) {
      Alert.alert('Error', 'This file has not been processed yet');
      return;
    }

    try {
      setLoading(true);
      setSelectedFileName(file.name);
      
      const calculatedFilePath = `${RNFS.DocumentDirectoryPath}/calculated_${file.name}`;
      const data = await parseCalculatedResults(calculatedFilePath);
      
      if (!data.length) {
        Alert.alert('Error', 'No valid data found in this file');
        return;
      }
      
      setSelectedFileData(data);
      setFileStats(calculateStats(data));
    } catch (error) {
      console.error('Error selecting file:', error);
      Alert.alert('Error', 'Failed to load file data');
    } finally {
      setLoading(false);
    }
  }, [parseCalculatedResults, calculateStats]);

  // Prepare chart data for 2D and 3D visualizations
  const chartData = useMemo(() => {
    if (!selectedFileData || selectedFileData.length === 0) return null;
    
    // Sample data points for smoother charts (max 100 points)
    const sampleRate = Math.max(1, Math.floor(selectedFileData.length / 100));
    const sampledData = selectedFileData.filter((_, index) => index % sampleRate === 0);
    
    // Prepare labels for x-axis (use timestamps)
    const startTime = sampledData[0].timestamp;
    const labels = sampledData.map(point => 
      ((point.timestamp - startTime) / 1000).toFixed(1)
    );
    
    // Prepare datasets for 2D charts
    const datasets2D = {
      labels: labels.length > 6 ? labels.filter((_, i) => i % Math.floor(labels.length / 6) === 0) : labels,
      speed: sampledData.map(point => point.speed),
      distance: sampledData.map(point => point.totalDistance),
      spin: sampledData.map(point => point.spinRate),
      // Now add the additional data from Python implementation
      yaw: sampledData.map(point => point.yaw),
      pitch: sampledData.map(point => point.pitch),
      roll: sampledData.map(point => point.roll),
    };
    
    // Prepare datasets for 3D visualization (will be used for simplified 3D-like views)
    const datasets3D = {
      ypr: sampledData.map(point => ({ x: point.yaw, y: point.pitch, z: point.roll })),
      accel: sampledData.map(point => ({ x: point.accelX, y: point.accelY, z: point.accelZ })),
      gyro: sampledData.map(point => ({ x: point.gyroX, y: point.gyroY, z: point.gyroZ })),
      velocity: sampledData.map(point => ({ x: point.velocityX, y: point.velocityY, z: point.velocityZ })),
    };
    
    return { 
      datasets2D,
      datasets3D,
      timeData: sampledData.map(p => p.timestamp)
    };
  }, [selectedFileData]);

  // Render individual 2D chart
  const renderChart = useCallback((
    data: number[], 
    labels: string[], 
    title: string, 
    yAxisLabel: string, 
    yAxisSuffix: string, 
    config: any
  ) => {
    if (!data.length) return null;
    
    const screenWidth = Dimensions.get('window').width;
    
    const chartConfig = {
      backgroundColor: config.backgroundGradientFrom,
      backgroundGradientFrom: config.backgroundGradientFrom,
      backgroundGradientTo: config.backgroundGradientTo,
      decimalPlaces: 1,
      color: config.color,
      labelColor: config.labelColor,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '3',
        strokeWidth: '2',
        stroke: '#ffa726'
      },
      propsForBackgroundLines: {
        strokeDasharray: '',
        stroke: 'rgba(255, 255, 255, 0.4)',
      },
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <LineChart
          data={{
            labels,
            datasets: [
              {
                data,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                strokeWidth: config.strokeWidth,
              },
            ],
          }}
          width={screenWidth - 32}
          height={220}
          yAxisLabel={yAxisLabel}
          yAxisSuffix={yAxisSuffix}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          fromZero
        />
      </View>
    );
  }, []);

  // Render simplified 3D visualization using SVG
  // Note: This is a simplified representation of 3D data using 2D SVG
  // For true 3D visualization, you would need a library like react-native-gl or expo-three
  const render3DVisualization = useCallback((
    dataPoints: Array<{x: number, y: number, z: number}>,
    title: string,
    xLabel: string,
    yLabel: string,
    zLabel: string,
    color: string
  ) => {
    if (!dataPoints.length) return null;
    
    const screenWidth = Dimensions.get('window').width;
    const width = screenWidth - 32;
    const height = 250;
    const padding = 30;
    
    // Normalize data to fit in our SVG view
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);
    const zValues = dataPoints.map(p => p.z);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);
    
    // Create normalized scale function
    const normalizeX = (val: number) => (val - xMin) / (xMax - xMin || 1) * (width - 2 * padding) + padding;
    const normalizeY = (val: number) => (1 - (val - yMin) / (yMax - yMin || 1)) * (height - 2 * padding) + padding;
    // Z will be used for point size in this simplified view
    const normalizeZ = (val: number) => ((val - zMin) / (zMax - zMin || 1) * 5) + 2;
    
    // Create path for connecting points
    let pathD = '';
    const points = dataPoints.map((p, i) => {
      const x = normalizeX(p.x);
      const y = normalizeY(p.y);
      if (i === 0) pathD = `M ${x} ${y}`;
      else pathD += ` L ${x} ${y}`;
      return { x, y, r: normalizeZ(p.z) };
    });
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={{ flexDirection: 'row' }}>
          <Text style={styles.axisLabel}>X: {xLabel}</Text>
          <Text style={styles.axisLabel}>Y: {yLabel}</Text>
          <Text style={styles.axisLabel}>Z: {zLabel} (point size)</Text>
        </View>
        <Svg width={width} height={height} style={{ backgroundColor: '#f8f9fa', borderRadius: 8 }}>
          {/* Draw X and Y axes */}
          <Path d={`M ${padding} ${height - padding} L ${width - padding} ${height - padding}`} stroke="#999" strokeWidth="1" />
          <Path d={`M ${padding} ${padding} L ${padding} ${height - padding}`} stroke="#999" strokeWidth="1" />
          
          {/* Draw the path connecting all points */}
          <Path d={pathD} stroke={color} strokeWidth="2" fill="none" />
          
          {/* Draw each data point */}
          {points.map((point, i) => (
            <Circle 
              key={i} 
              cx={point.x} 
              cy={point.y} 
              r={point.r} 
              fill={color} 
              fillOpacity={0.7} 
            />
          ))}
          
          {/* Add axis labels */}
          <SvgText x={width/2} y={height-5} fontSize="12" textAnchor="middle">{xLabel}</SvgText>
          <SvgText x={10} y={height/2} fontSize="12" textAnchor="middle" rotation="-90">{yLabel}</SvgText>
        </Svg>
      </View>
    );
  }, []);

  // Render 2D graphs
  const render2DGraphs = useMemo(() => {
    if (!chartData) return null;
    const { datasets2D } = chartData;

    return (
      <View style={styles.graphsContainer}>
        {renderChart(
          datasets2D.speed,
          datasets2D.labels,
          'Speed Over Time',
          '',
          ' m/s',
          chartConfigs.speed
        )}
        
        {renderChart(
          datasets2D.distance,
          datasets2D.labels,
          'Distance Over Time',
          '',
          ' m',
          chartConfigs.distance
        )}
        
        {renderChart(
          datasets2D.spin,
          datasets2D.labels,
          'Spin Rate Over Time',
          '',
          ' deg/s',
          chartConfigs.spin
        )}
        
        {/* Additional YPR chart - similar to Python implementation */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Orientation (YPR) Over Time</Text>
          <LineChart
            data={{
              labels: datasets2D.labels,
              datasets: [
                {
                  data: datasets2D.yaw,
                  color: () => 'rgba(255, 99, 132, 1)',
                  strokeWidth: 2,
                },
                {
                  data: datasets2D.pitch,
                  color: () => 'rgba(54, 162, 235, 1)',
                  strokeWidth: 2,
                },
                {
                  data: datasets2D.roll,
                  color: () => 'rgba(75, 192, 192, 1)',
                  strokeWidth: 2,
                },
              ],
              legend: ['Yaw', 'Pitch', 'Roll']
            }}
            width={Dimensions.get('window').width - 32}
            height={220}
            chartConfig={{
              ...chartConfigs.ypr,
              useShadowColorFromDataset: true,
              decimalPlaces: 1,
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: 'rgba(255, 255, 255, 0.4)',
              },
            }}
            bezier
            style={styles.chart}
            fromZero={false}
            withDots={false}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withShadow={false}
            // Removed unsupported withLegend prop
          />
        </View>
      </View>
    );
  }, [chartData, renderChart]);

  // Render 3D visualizations
  const render3DGraphs = useMemo(() => {
    if (!chartData) return null;
    const { datasets3D } = chartData;

    return (
      <View style={styles.graphsContainer}>
        {render3DVisualization(
          datasets3D.ypr,
          'Orientation (Yaw-Pitch-Roll)',
          'Yaw',
          'Pitch',
          'Roll',
          '#396afc'
        )}
        
        {render3DVisualization(
          datasets3D.accel,
          'Acceleration (m/s²)',
          'Accel X',
          'Accel Y',
          'Accel Z',
          '#e53935'
        )}
        
        {render3DVisualization(
          datasets3D.gyro,
          'Gyroscope (°/s)',
          'Gyro X',
          'Gyro Y',
          'Gyro Z',
          '#11998e'
        )}
        
        {render3DVisualization(
          datasets3D.velocity,
          'Velocity (m/s)',
          'Vel X',
          'Vel Y',
          'Vel Z',
          '#8e2de2'
        )}
      </View>
    );
  }, [chartData, render3DVisualization]);

  // Define sections for SectionList
  const sections = useMemo((): Section[] => [
    {
      title: 'Available Files',
      data: files.length 
        ? files.map(file => ({ ...file, type: 'file' } as FileListItem)) 
        : [{ type: 'noFiles' } as NoFilesItem],
    },
    ...(selectedFileData ? [
      {
        title: `Metrics for ${selectedFileName}`,
        data: fileStats.length ? [{ stats: fileStats, type: 'metrics' } as MetricsItem] : [],
      },
      {
        title: 'Performance Graphs',
        data: activeTab === '2d' 
          ? [{ type: 'graph2d' } as Graph2DItem]
          : [{ type: 'graph3d' } as Graph3DItem],
      }
    ] : [])
  ], [files, selectedFileData, fileStats, selectedFileName, activeTab]);

  // Render item for SectionList
  const renderItem = useCallback(({ item }: { item: SectionListItemType }) => {
    if (item.type === 'file') {
      const fileItem = item as FileListItem;
      return (
        <TouchableOpacity 
          style={[
            styles.fileItem,
            fileItem.isProcessed ? styles.fileProcessed : styles.fileUnprocessed
          ]} 
          onPress={() => handleFileSelect(fileItem)}
          disabled={!fileItem.isProcessed}
        >
          <Text style={styles.fileName}>{fileItem.name}</Text>
          {!fileItem.isProcessed && (
            <Text style={styles.fileNotProcessed}>Not processed</Text>
          )}
        </TouchableOpacity>
      );
    } else if (item.type === 'metrics') {
      const metricsItem = item as MetricsItem;
      return (
        <View style={styles.statsContainer}>
          {metricsItem.stats.map((stat: StatItem, index: number) => (
            <View key={index} style={styles.statRow}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>
                {stat.value} {stat.unit}
              </Text>
            </View>
          ))}
        </View>
      );
    } else if (item.type === 'graph2d') {
      return render2DGraphs;
    } else if (item.type === 'graph3d') {
      return render3DGraphs;
    } else if (item.type === 'noFiles') {
      return (
        <View style={styles.noContentContainer}>
          <Text style={styles.noContentText}>No IMU data files found</Text>
        </View>
      );
    }
    return null;
  }, [handleFileSelect, render2DGraphs, render3DGraphs]);

  // Render section header with tab controller for graph sections
  const renderSectionHeader = useCallback(({ section }: { section: Section }) => {
    // Special case for graph section to include tab controls
    if (section.title === 'Performance Graphs' && selectedFileData) {
      return (
        <View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === '2d' && styles.activeTab]} 
              onPress={() => setActiveTab('2d')}
            >
              <Text style={[styles.tabText, activeTab === '2d' && styles.activeTabText]}>2D Graphs</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === '3d' && styles.activeTab]} 
              onPress={() => setActiveTab('3d')}
            >
              <Text style={[styles.tabText, activeTab === '3d' && styles.activeTabText]}>3D Visualizations</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return <Text style={styles.sectionTitle}>{section.title}</Text>;
  }, [selectedFileData, activeTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.container}>
        <Text style={styles.title}>TrackOrb Metrics and Visualization</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4158D0" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : (
          <SectionList<SectionListItemType, Section>
            sections={sections}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item, index) => {
              if (item.type === 'file') {
                return (item as FileListItem).name + index.toString();
              }
              return item.type + index.toString();
            }}
            contentContainerStyle={styles.sectionListContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  tab: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  activeTab: {
    backgroundColor: '#4158D0',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4a5568',
  },
  activeTabText: {
    color: '#ffffff',
  },
  sectionListContent: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2d3748',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#2d3748',
    paddingLeft: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4158D0',
    paddingVertical: 6,
  },
  axisLabel: {
    fontSize: 14,
    color: '#4a5568',
    marginHorizontal: 8,
  },
  fileItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fileProcessed: {
    borderLeftWidth: 4,
    borderLeftColor: '#0BAB64',
  },
  fileUnprocessed: {
    borderLeftWidth: 4,
    borderLeftColor: '#cccccc',
    opacity: 0.7,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2d3748',
  },
  fileNotProcessed: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '600',
  },
  graphsContainer: {
    marginTop: 8,
  },
  chartContainer: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2d3748',
  },
  chart: {
    borderRadius: 16,
    paddingRight: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4a5568',
  },
  noContentContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noContentText: {
    fontSize: 16,
    color: '#a0aec0',
    textAlign: 'center',
  },
});

export default DataProcessor;
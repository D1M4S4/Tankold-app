import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  TextInput,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Animated,
  Platform,
  PermissionsAndroid,
  Alert,
  Image
} from 'react-native';
import LottieView from 'lottie-react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { normalize, normalizeVertical, SCREEN } from './src/utils/normalize';

type ConnectedDevice = {
  id: string;
  name: string;
  ip: string;
  port?: string; 
  user?: string;
  password?: string;
  clientId?: string;
};

const App = () => {
  const [showAnimation, setShowAnimation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
  const CHARACTERISTIC_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
  const RECEIVE_SERVICE_UUID = '0000FF01-0000-1000-8000-00805F9B34FB';
  const RECEIVE_CHARACTERISTIC_UUID = '0000FF02-0000-1000-8000-00805F9B34FB';

  const manager = useRef(new BleManager()).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const listPosition = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      manager.destroy();
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [manager]);

  useEffect(() => {
    const animate = (toValue: number) => {
      Animated.parallel([
        Animated.timing(loadingAnim, {
          toValue,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(listPosition, {
          toValue,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    };
    
    isLoading ? animate(1) : animate(0);
  }, [isLoading]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const permissions = 
        Platform.Version >= 31 ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ] : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(results).every(r => r === 'granted');
    }
    return true;
  }, []);

  const checkBluetoothState = useCallback(async () => {
    try {
      const state = await manager.state();
      return state === 'PoweredOn';
    } catch (error) {
      console.error(error);
      return false;
    }
  }, [manager]);

  const scanDevices = useCallback(async () => {
    try {
      if (!(await requestPermissions()) || !(await checkBluetoothState())) {
        Alert.alert('Error', 'Permisos o Bluetooth no habilitados');
        return;
      }
      
      manager.stopDeviceScan();
      
      manager.startDeviceScan(null, null, (error, device) => {
        if (error || !device) return;
        
        if (device.name && device.name.startsWith('TK')) {
          setDevices(prev => {
            const isConnected = connectedDevices.some(d => d.id === device.id);
            const existsInList = prev.some(d => d.id === device.id);
            
            return isConnected || existsInList 
              ? prev 
              : [...prev, device];
          });
        }
      });

      scanTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          manager.stopDeviceScan();
          setIsLoading(false);
        }
      }, 7000);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }, [manager, requestPermissions, checkBluetoothState, connectedDevices]);

  const handlePress = useCallback(() => {
    setIsPressed(prev => !prev);
  }, []);

  const handleSearchPress = useCallback(() => {
    if (isLoading) {
      manager.stopDeviceScan();
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      setIsLoading(false);
      return;
    }
    
    setDevices(prev => prev.filter(device => 
      !connectedDevices.some(connected => connected.id === device.id)
    ));
    
    setIsLoading(true);
    scanDevices();
  }, [isLoading, scanDevices, manager, connectedDevices]);

  const handleAddDevice = useCallback(async (device: Device) => {
    try {
      setConnectingDeviceId(device.id);
      
      if (!(await requestPermissions())) {
        Alert.alert('Error', 'Se requieren permisos de Bluetooth');
        return;
      }
      
      if (!(await checkBluetoothState())) {
        Alert.alert('Error', 'El Bluetooth no está activado');
        return;
      }

      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(connected);
      setModalVisible(true);
      setDevices(prev => prev.filter(d => d.id !== device.id));

      connected.monitorCharacteristicForService(
        RECEIVE_SERVICE_UUID,
        RECEIVE_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Error en monitorización:', error);
            setIsConnected(false);
            setIsConnecting(false);
            return;
          }
          
          if (characteristic?.value) {
            const rawValue = Buffer.from(characteristic.value, 'base64').toString('utf-8');
            
            if (rawValue.startsWith('IP:')) {
              const ip = rawValue.split(':')[1];
              setConnectedDevices(prev => {
                if (prev.some(d => d.id === device.id)) return prev;
                
                return [...prev, {
                  id: device.id,
                  name: device.name || 'Dispositivo',
                  ip,
                  port: '',
                  user: '',
                  password: '',
                  clientId: ''
                }];
              });
              setModalVisible(false);
              setIsConnected(true);
              setIsConnecting(false);
            }
            else if (rawValue.startsWith('PORT:')) {
              const port = rawValue.split(':')[1];
              setConnectedDevices(prev =>
                prev.map(d => d.id === device.id ? {...d, port} : d)
              );
            }
            else if (rawValue.startsWith('USER:')) {
              const user = rawValue.split(':')[1];
              setConnectedDevices(prev => 
                prev.map(d => d.id === device.id ? {...d, user} : d)
              );
            }
            else if (rawValue.startsWith('PASSWORD:')) {
              const password = rawValue.split(':')[1];
              setConnectedDevices(prev => 
                prev.map(d => d.id === device.id ? {...d, password} : d)
              );
            }
            else if (rawValue.startsWith('CLIENT_ID:')) {
              const clientId = rawValue.split(':')[1];
              setConnectedDevices(prev => 
                prev.map(d => d.id === device.id ? {...d, clientId} : d)
              );
            }
            else if (rawValue.startsWith('Error:')) {
              const errorMessage = rawValue.split(':')[1];
              Alert.alert('Error', errorMessage);
              setIsConnected(false);
              setIsConnecting(false);
            }
          }
        }
      );
    } catch (error) {
      console.error('Error de conexión BLE:', error);
      Alert.alert('Error', 'No se pudo conectar al dispositivo');
    } finally {
      setConnectingDeviceId(null);
    }
  }, [requestPermissions, checkBluetoothState]);

  const sendWifiCredentials = useCallback(async () => {
    if (!connectedDevice) {
      Alert.alert('Error', 'No hay dispositivo conectado');
      return;
    }
    
    if (!ssid || !password) {
      Alert.alert('Error', 'Complete todos los campos');
      return;
    }

    setIsConnecting(true);
    
    try {
      const ssidBuffer = Buffer.from(ssid, 'utf-8');
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        ssidBuffer.toString('base64')
      );

      const passwordBuffer = Buffer.from(password, 'utf-8');
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        passwordBuffer.toString('base64')
      );
    } catch (error) {
      console.error('Error al enviar datos:', error);
      Alert.alert('Error', 'Falló el envío de datos');
      setIsConnecting(false);
    }
  }, [connectedDevice, ssid, password]);

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showAnimation) {
    return (
      <View style={styles.animationContainer}>
        <LottieView
          source={require('./assets/Logo.json')}
          autoPlay
          loop={false}
          style={styles.animation}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={handleSearchPress}
        activeOpacity={0.7}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {connectedDevices.length > 0 && (
        <View style={styles.connectedDevicesContainer}>
          <Text style={styles.connectedDevicesTitle}>Dispositivos Conectados:</Text>
          {connectedDevices.map((device) => (
            <View key={device.id} style={styles.deviceButton}>
              <Image
                source={require('./assets/tk5.png')}
                style={styles.deviceImage}
              />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceText}>{device.name}</Text>
              </View>
              <TouchableOpacity
                style={[styles.snowButton, isPressed ? styles.snowButtonPressed : styles.snowButtonReleased]}
                onPress={handlePress}
                disabled={isButtonDisabled}
              >
                <Image
                  source={require('./assets/copo2.png')}
                  style={styles.snowButtonImage}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {devices.length === 0 && !isLoading && (
        <View style={styles.centeredTextContainer}>
          <Text style={styles.centeredText}>
            Presione el botón + para buscar dispositivos
          </Text>
        </View>
      )}

      <View style={styles.mainContent}>
        <Animated.View 
          style={[
            styles.loadingContainer,
            {
              transform: [{
                translateY: loadingAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-normalizeVertical(150), normalizeVertical(40)]
                })
              }]
            }
          ]}
        >
          {isLoading && (
            <>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Buscando dispositivos...</Text>
            </>
          )}
        </Animated.View>

        <Animated.View 
          style={[
            styles.devicesContainer,
            {
              transform: [{
                translateY: listPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [normalizeVertical(100), normalizeVertical(130)]
                })
              }]
            }
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {devices.map((device) => (
              <View key={device.id} style={styles.deviceButton}>
                <View style={styles.deviceInfo}>
                  <Text 
                    style={styles.deviceText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {device.name || 'Dispositivo sin nombre'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addDeviceButton}
                  onPress={() => handleAddDevice(device)}
                  activeOpacity={0.7}
                  disabled={!!connectingDeviceId}
                >
                  {connectingDeviceId === device.id ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.addDeviceButtonText}>Conectar</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Ingrese los datos de su red WiFi:</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la red WiFi"
              placeholderTextColor="#999"
              value={ssid}
              onChangeText={setSsid}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña de la red WiFi"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={sendWifiCredentials}
              disabled={isConnecting}
              activeOpacity={0.7}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  animation: {
    width: SCREEN.WIDTH * 1.15,
    height: SCREEN.HEIGHT * 0.9,
    aspectRatio: 1,
  },
  addButton: {
    position: 'absolute',
    top: normalizeVertical(30),
    right: normalize(30),
    width: normalize(60),
    height: normalize(62),
    borderRadius: normalize(55),
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    zIndex: 3,
  },
  addButtonText: {
    fontSize: normalize(50),
    color: '#fff',
    marginTop: -4,
    includeFontPadding: false,
  },
  connectedDevicesContainer: {
    marginTop: normalizeVertical(80),
    padding: normalize(15),
    backgroundColor: '#f5f5f5',
    borderRadius: normalize(10),
    marginHorizontal: normalize(20),
  },
  connectedDevicesTitle: {
    fontSize: normalize(16),
    fontWeight: 'bold',
    marginBottom: normalizeVertical(10),
    color: '#333',
  },
  deviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(15),
    marginVertical: normalizeVertical(8),
    backgroundColor: '#fff',
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
  },
  deviceImage: {
    width: normalize(40),
    height: normalize(40),
    marginRight: normalize(10),
    resizeMode: 'contain',
  },
  deviceText: {
    fontSize: normalize(16),
    color: '#333',
    fontWeight: '600',
  },
  snowButton: {
    padding: normalize(8),
    borderRadius: normalize(20),
    justifyContent: 'center',
    alignItems: 'center',
    width: normalize(50),
    height: normalize(50),
  },
  snowButtonPressed: {
    backgroundColor: '#007AFF',
  },
  snowButtonReleased: {
    backgroundColor: '#e0e0e0',
  },
  snowButtonImage: {
    width: normalize(24),
    height: normalize(24),
    resizeMode: 'contain',
  },
  // Resto de estilos existentes se mantienen igual...
  centeredTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: normalizeVertical(80),
    paddingBottom: normalizeVertical(20),
  },
  centeredText: {
    fontSize: normalize(14),
    color: '#000',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    marginTop: normalizeVertical(80),
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: normalizeVertical(15),
    zIndex: 2,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'white',
  },
  loadingText: {
    marginTop: normalizeVertical(10),
    fontSize: normalize(16),
    color: '#007AFF',
  },
  devicesContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: normalize(20),
    paddingBottom: normalizeVertical(40),
  },
  deviceInfo: {
    flex: 1,
  },
  addDeviceButton: {
    backgroundColor: '#007AFF',
    padding: normalize(8),
    borderRadius: normalize(5),
    minWidth: normalize(80),
  },
  addDeviceButtonText: {
    fontSize: normalize(14),
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    paddingVertical: normalizeVertical(25),
    paddingHorizontal: normalize(20),
    backgroundColor: '#fff',
    borderRadius: normalize(10),
    alignItems: 'center',
  },
  modalText: {
    fontSize: normalize(18),
    marginBottom: normalizeVertical(15),
    textAlign: 'center',
    lineHeight: normalizeVertical(24),
  },
  input: {
    width: '100%',
    height: normalizeVertical(45),
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: normalize(5),
    paddingHorizontal: normalize(12),
    paddingVertical: normalizeVertical(8),
    marginBottom: normalizeVertical(12),
    color: '#000',
    fontSize: normalize(14),
  },
  modalButton: {
    padding: normalize(10),
    backgroundColor: '#007AFF',
    borderRadius: normalize(5),
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: normalize(16),
    color: '#fff',
  },
});

export default App;

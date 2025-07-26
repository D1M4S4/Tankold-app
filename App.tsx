import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  NativeModules,
  NativeEventEmitter,
  ActivityIndicator
} from 'react-native';

interface MqttManagerInterface {
  connect: (url: string, clientId: string, username: string, password: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  isConnected: () => Promise<boolean>;
  subscribe: (topic: string, qos: number) => Promise<void>;
  publish: (topic: string, message: string, qos: number) => Promise<void>;
}

const App = () => {
  const brokerUrl = 'ssl://qbd56d0e.ala.us-east-1.emqxsl.com:8883';
  const [clientId] = useState(`client_${Math.random().toString(16).substr(2, 8)}`);
  const username = 'Mariano_Sanchez';
  const password = '0001';
  const controlTopic = 'Control';
  const tempTopic = 'Temp';
  const statusTopic = 'Estado';

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSnowActive, setIsSnowActive] = useState(false);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [deviceActive, setDeviceActive] = useState(false);

  const MqttManager = NativeModules.MqttManager as MqttManagerInterface;
  const mqttEmitter = new NativeEventEmitter(NativeModules.MqttManager);
  const isMounted = useRef(true);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    connectToBroker();

    const connectionSubscription = mqttEmitter.addListener(
      'connectionStatus', 
      (event: { connected: boolean; error?: string }) => {
        if (!isMounted.current) return;

        if (event.connected) {
          handleSuccessfulConnection();
        } else {
          handleDisconnection(event.error || 'se perdio la conexion');
        }
      }
    );

    const messageSubscription = mqttEmitter.addListener(
      'messageReceived', 
      (message: { topic: string; message: string }) => {
        try {
          const topic = message.topic;
          const msg = message.message;

          if (topic === tempTopic) {
            const tempValue = parseFloat(msg);
            if (!isNaN(tempValue)) {
              setTemperature(tempValue);
              resetCountdown();
            }
          }

          if (topic === statusTopic) {
            setIsSnowActive(msg === '1');
            resetCountdown();
          }
        } catch (e) {
          console.error("Error procesando mensaje:", e);
        }
      }
    );

    startCountdown();

    return () => {
      isMounted.current = false;
      connectionSubscription.remove();
      messageSubscription.remove();
      MqttManager.disconnect();
      stopCountdown();
    };
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setDeviceActive(false);
      setTemperature(null);
      setIsSnowActive(false);
      stopCountdown();
    }
  }, [countdown]);

  const startCountdown = () => {
    stopCountdown();
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          stopCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const resetCountdown = () => {
    setCountdown(20);
    setDeviceActive(true);
    if (!countdownRef.current) {
      startCountdown();
    }
  };

  const connectToBroker = async () => {
    if (!isMounted.current || isConnecting || isConnected) return;

    try {
      setIsConnecting(true);
      setError(null);
      setDeviceActive(false);
      
      const success = await MqttManager.connect(brokerUrl, clientId, username, password);
      
      if (!success) {
        throw new Error('Falló la conexión sin error específico');
      }
    } catch (err) {
      handleConnectionError(err as Error);
    }
  };

  const handleSuccessfulConnection = () => {
    if (!isMounted.current) return;
    
    setIsConnecting(false);
    setIsConnected(true);
    setError(null);
    
    MqttManager.subscribe(tempTopic, 1)
      .catch(err => console.error(`Error suscribiendo a ${tempTopic}:`, err));
      
    MqttManager.subscribe(controlTopic, 1)
      .catch(err => console.error(`Error suscribiendo a ${controlTopic}:`, err));
      
    MqttManager.subscribe(statusTopic, 1)
      .catch(err => console.error(`Error suscribiendo a ${statusTopic}:`, err));
  };

  const handleDisconnection = (errorMessage: string) => {
    if (!isMounted.current) return;
    
    setIsConnected(false);
    setIsConnecting(false);
    setDeviceActive(false);
    setError(errorMessage);
    stopCountdown();
  };

  const handleConnectionError = (error: Error) => {
    if (!isMounted.current) return;
    
    setIsConnecting(false);
    setDeviceActive(false);
    setError(error.message);
    stopCountdown();
    
    setTimeout(() => {
      if (isMounted.current && !isConnected) {
        connectToBroker();
      }
    }, 5000);
  };

  const handleSnowPress = async () => {
    if (!isConnected || !deviceActive) return;

    const newState = !isSnowActive;
    setIsSnowActive(newState);
    
    try {
      await MqttManager.publish(controlTopic, newState ? '1' : '0', 0);
    } catch (err) {
      Alert.alert('Error', `No se pudo enviar comando: ${(err as Error).message}`);
      setIsSnowActive(!newState);
    }
  };

  const getTemperatureColor = () => {
    if (temperature === null) return '#95a5a6';
    return temperature > 0 ? '#e74c3c' : '#3498db';
  };

  // Funciones para los nuevos botones
  const handleDeletePress = () => {
    Alert.alert('Eliminar', '¿Desea eliminar este dispositivo?');
  };

  const handleWifiPress = () => {
    Alert.alert('WiFi', 'Configuración de conexión WiFi');
  };

  const handleClockPress = () => {
    Alert.alert('Programación', 'Configurar horarios de funcionamiento');
  };

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isConnecting && (
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.connectingText}>Conectando al sistema...</Text>
        </View>
      )}

      <View style={styles.deviceContainer}>
        <View style={styles.deviceButton}>
          <Image
            source={require('./assets/tk5.png')}
            style={styles.deviceImage}
          />
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceText}>TK-2025-MA00-0001</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.snowButton,
              (deviceActive && isSnowActive) 
                ? styles.snowButtonActive 
                : styles.snowButtonInactive,
              (!isConnected || !deviceActive) && styles.buttonDisabled
            ]}
            onPress={handleSnowPress}
            disabled={!isConnected || !deviceActive}
          >
            <Image
              source={require('./assets/copo2.png')}
              style={styles.snowButtonImage}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Text style={styles.menuButtonText}>...</Text>
        </TouchableOpacity>

        {isMenuOpen && (
          <View style={styles.dropdownMenu}>
            <View style={styles.statusBarContainer}>
              {/* Temperatura */}
              <Text style={[
                styles.temperatureValue, 
                { color: getTemperatureColor() }
              ]}>
                {temperature !== null ? `${temperature}°C` : '--°C'}
              </Text>
              
              {/* Indicador de estado */}
              <View style={[
                styles.statusIndicator,
                { 
                  backgroundColor: deviceActive ? '#2ecc71' : '#e74c3c' 
                }
              ]} />
              
              {/* Botón Eliminar */}
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={handleDeletePress}
              >
                <Image
                  source={require('./assets/trash.png')}
                  style={styles.iconImage}
                />
              </TouchableOpacity>
              
              {/* Botón WiFi */}
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={handleWifiPress}
              >
                <Image
                  source={require('./assets/wifi.png')}
                  style={styles.iconImage}
                />
              </TouchableOpacity>
              
              {/* Botón Reloj */}
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={handleClockPress}
              >
                <Image
                  source={require('./assets/clock.png')}
                  style={styles.iconImage}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    padding: 20,
  },
  deviceContainer: {
    position: 'relative',
  },
  deviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  deviceImage: {
    width: 80,
    height: 80,
    marginRight: 15,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  snowButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  snowButtonActive: {
    backgroundColor: '#3498db',
  },
  snowButtonInactive: {
    backgroundColor: '#bdc3c7',
  },
  snowButtonImage: {
    width: 35,
    height: 35,
    tintColor: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  menuButton: {
    position: 'absolute',
    right: 15,
    bottom: -15,
    backgroundColor: '#ecf0f1',
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  menuButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  dropdownMenu: {
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    padding: 15,
    marginTop: -10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderTopWidth: 1,
    borderColor: '#d5d9dc',
  },
  statusBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
  },
  temperatureValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 70,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  iconImage: {
    width: 27,
    height: 27,
  },
  errorContainer: {
    backgroundColor: '#fee8e6',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
  },
  connectingContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 15,  
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 10,
  },
  connectingText: {
    marginTop: 10,
    color: '#3498db',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;

0-npx @react-native-community/cli init App  
-npm install
-npx react-native run-android
-------variables de sistema:---------------
Nombre de la variable: ANDROID_HOME
Valor de la variable: C:\Users\casta\AppData\Local\Android\Sdk
		PATH: 
%JAVA_HOME%\bin
C:\Users\casta\AppData\Local\Android\Sdk\Platform-Tools
%ANDROID_HOME%\Platform-Tools
--------------FRONTEND-------------------------
-npm install lottie-react-native lottie-ios
---------------GENERAR APK (DEBUG menos completa que la realese)------------------
-npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output    android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
-cd android
-./gradlew clean 
-./gradlew assembleDebug
ruta donde se genera el apk: android/app/build/outputs/apk/release/app-release.apk
-----------EJECUTAR APK CON adb--------------------
-adb -s GE5LEIV4HYC67DT8 install android/app/build/outputs/apk/debug/app-debug.apk
-adb -s GE5LEIV4HYC67DT8 shell am start -n com.app/.MainActivity
-----------Fast Refresh---------------
-npx react-native start	
-adb devices
-npx react-native run-android
-----------------crear APK en modo release--------------------
-cd android
-./gradlew clean
-./gradlew assembleRelease
------------------conectar adb sin cable----------------
-adb tcpip 5555
-adb connect 192.168.1.10:5555
-npx react-native run-android
------------------ENVIAR DATOS BLE-------------------------------
-npm install buffer

cosas por mejorar antes de hacer bien el MQTT: 
1. 

-npm install react-native-paho-mqtt

------------------responsive desing-------------------------

1. src/utils/normalize.ts:

typescript
Copy
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const widthBaseScale = SCREEN_WIDTH / 375;
const heightBaseScale = SCREEN_HEIGHT / 812;

export function normalize(size: number) {
  const newSize = size * widthBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function normalizeVertical(size: number) {
  const newSize = size * heightBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export const SCREEN = {
  WIDTH: SCREEN_WIDTH,
  HEIGHT: SCREEN_HEIGHT
};
----------------Cuando el APK no se ejcute----------------
ERRORES: Log 1 of 3

Console Error

React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s object You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
Source
Log 2 of 3

Console Error

Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.

This error is located at:...

See More

Log 3 of 3
Render Error

Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.

Component Stack


1. Revisar el codigo: // Agrega al final del archivo:
export default App;

2. Actualizar las dependecias 
npm install react-native-ble-plx@latest lottie-react-native@latest
npx pod-install

3. npm cache clean --force
cd android 
./gradlew clean 
cd ..
npx react-native start --reset-cache

---------------------MQTT------------------------
-npm install react-native-mqtt
Para Android, agrega en AndroidManifest.xml:
<uses-permission android:name="android.permission.INTERNET" />

-------------error al ejecutar ./gradlew clean-------------
PS C:\Users\casta\OneDrive\Escritorio\APP\app-v0.5.7.1.1\tankold\android> ./gradlew clean

[Incubating] Problems report is available at: file:///C:/Users/casta/OneDrive/Escritorio/APP/app-v0.5.7.1.1/Tankold/android/build/reports/problems/problems-report.html

FAILURE: Build failed with an exception.

* Where:
Build file 'C:\Users\casta\OneDrive\Escritorio\APP\app-v0.5.7.1.1\Tankold\node_modules\react-native-tcp\android\build.gradle' line: 47

* What went wrong:
A problem occurred evaluating project ':react-native-tcp'.
> Could not find method compile() for arguments [com.facebook.react:react-native:+] on object of type org.gradle.api.internal.artifacts.dsl.dependencies.DefaultDependencyHandler.

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.12/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD FAILED in 3s
10 actionable tasks: 10 up-to-date

===================usar una libreria mejor mantenida=========================
-npm install --save-dev @types/react-native-paho-mqtt
src/@types/react-netive-paho-mqtt.d.ts
declare module 'react-native-paho-mqtt' {
  // Opciones del Cliente
  interface ClientOptions {
    uri: string;
    clientId: string;
    userName?: string;
    password?: string;
    storage?: {
      setItem: (key: string, value: string) => void;
      getItem: (key: string) => string;
      removeItem: (key: string) => void;
    };
  }

  // Clase Client
  export class Client {
    constructor(options: ClientOptions);
    connect(): Promise<void>;
    disconnect(): void;
    subscribe(topic: string): Promise<void>;
    unsubscribe(topic: string): Promise<void>;
    publish(message: Message): Promise<void>; // Cambiado para aceptar Message
    on(event: 'messageArrived', callback: (message: Message) => void): void;
    on(event: 'connectionLost', callback: (response: { errorCode: number; errorMessage?: string }) => void): void;
    isConnected(): boolean;
  }

  // Clase Message con constructor
  export class Message {
    constructor(payload: string | ArrayBuffer);
    payloadString: string;
    destinationName: string;
    duplicate: boolean;
    retained: boolean;
    qos: number;
  }
}

------------USAR LA RASSPBERRYPI COMO BROKER MQTT CON MOSQUITO--------------
para usar el protocolo WebSocket para la app y el protocolo TCP para el esp32 el MYQTTHUB NO FUNIONA

===============================LINUX DEBIAN======================
#1. Instalar mosquitto

-sudo apt update
-sudo apt purge mosquitto mosquitto-clients -y  # Eliminar completamente
-sudo apt install mosquitto mosquitto-clients
-sudo systemctl enable mosquitto
-sudo nano /etc/mosquitto/mosquitto.conf

listener 1883
protocol mqtt

allow_anonymous false
password_file /etc/mosquitto/passwd

-sudo touch /etc/mosquitto/passwd

#2. Crear un usuario y contraseña

-sudo mosquitto_passwd -b /etc/mosquitto/passwd Mariano Sanchez 0001
-sudo systemctl restart mosquitto
    Suscribirse a un tópico:
-mosquitto_sub -h localhost -t "test" -u "Mariano Sanchez" -P "0001"
    Publicar un mensaje (en otra terminal):
-mosquitto_pub -h localhost -t "test" -m "Hola Raspberry Pi" -u "Mariano Sanchez" -P "0001"
-----------------------------error: connection error: connection refused: no authorised.
-sudo mosquitto_passwd -b /etc/mosquitto/passwd "Mariano Sanchez" 0001
-sudo cat /etc/mosquitto/passwd
-sudo chown mosquitto:mosquitto /etc/mosquitto/passwd
-sudo chmod 600 /etc/mosquitto/passwd
-ls -l /etc/mosquitto/passwd
-sudo systemctl restart mosquitto
    Suscribirse a un tópico:
-mosquitto_sub -h localhost -t "test" -u "Mariano Sanchez" -P "0001"
    Publicar un mensaje (en otra terminal):
-mosquitto_pub -h localhost -t "test" -m "Hola Raspberry Pi" -u "Mariano Sanchez" -P "0001"

#3. Poner la IP publica del servidor en CPANEL
https://www.tankold.mx:2083/cpsess9225353451/frontend/jupiter/zone_editor/index.html#/manage?domain=mqtt.tankold.mx
adminkal
administrador123
Name: mqtt.tankold.mx. TTL: 14400 Tipo: A Registrar: 189.203.236.211
#4. IP local estatica
-sudo nano /etc/dhcpcd.conf

interface wlan0
static ip_address=192.168.1.100/24  # Tu IP deseada
static routers=192.168.1.1          # IP del router
static domain_name_servers=8.8.8.8  # DNS

-sudo systemctl status dhcpcd 
error: Unit dhcpcd.sevice could not be found.
=================installar dhcpcd=================
-sudo apt-get update
-sudo apt-get install dhcpcd -y
escribir: "Y" y darle enter
-sudo systemctl enable dhcpcd
-sudo systemctl start dhcpcd
-sudo systemctl status dhcpcd
-sudo nano /etc/dhcpcd.conf
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8
nohook wpa_supplicant
-sudo systemctl restart dhcpcd
-ip a show wlan0
-sudo rm /etc/NetworkManager/system-connections/*  
-sudo reboot
-sudo apt-get purge network-manager -y
-sudo reboot
#5. Configurar puertos
#6. Configurar DDNS
------------------------------Mosquitto en windows (Red local)----------------------------------------
#1. instalar Mosquitto:

https://mosquitto.org/download/

#2. Configurar Mosquitto:

C:\Program Files\mosquitto\mosquitto.conf
borrar TODO
poner: 
listener 1883 0.0.0.0
listener 9001 0.0.0.0
protocol websockets
allow_anonymous true

#3. Añadir Mosquitto al PATH

Panel de Control > Sistema y seguridad > Sistema > Configuración avanzada del sistema.
Haz clic en Variables de entorno.
En Variables del sistema, selecciona Path y haz clic en Editar.
Agrega la ruta de Mosquitto (C:\Program Files\mosquitto).
Guarda los cambios.

#4. Iniciar Mosquitto: 
abrir cmd como admin, en: C:\Program Files\mosquitto> 
mosquitto -v -c mosquitto.conf

si aparece este Error: Solo se permite un uso de cada direcci¾n de socket (protocolo/direcci¾n de red/puerto)
Detener el proceso en el administrador de tareas
Cambiar puertos 
listener 1884 0.0.0.0
listener 9002 0.0.0.0

#5. Hacer un topic: mosquitto_sub -h localhost -t "test" -v     o       mosquitto_sub -h 192.168.100.197 -p 1883 -t "Control" -v

#6. Enviar un Mensaje: mosquitto_pub -h localhost -t "test" -m "Hola Mundo"     o     mosquitto_pub -h 192.168.1.12 -p 1883 -t "Control" -m "test_OK"

#7. Encontrar la Direccion ip 
Abrir cmd y ejecutar ipconfig
Dirección IPv4. . . . . . . . . . . . . . : 192.168.1.12

8# intalar MQTT Explorer
https://mqtt-explorer.com

#9. Configurar MQTT Explorer
click en + new connections
Name: Servidor Local
Protocol: ws://
Host: 192.168.1.12
Port: 9002
Basepath: /mqtt

Diferencia entre los Puertos 1884 y 9002
Puerto	Protocolo	Uso Típico	Ejemplo
1884	MQTT (TCP puro)	Dispositivos IoT (ESP32, Arduino, etc.)	mosquitto_pub -h IP -p 1884 -t test -m "Hola"
9002	MQTT over WebSocket	Apps móviles (React Native, navegadores)	ws://IP:9002/mqtt

# Abrir puertos para TCP (1884 y 9002)
netsh advfirewall firewall add rule name="MQTT" dir=in action=allow protocol=TCP localport=1884,9002

# Verificar reglas
netsh advfirewall firewall show rule name="MQTT"



------------------------------------MQTT PRUEBA CON NUEVO CODIGO Y LIBRERIA-----------------------------------
Lunes 28 de abril a las 6:30pm

Usando el broker: HiveMQ Cloud 

#1. Copiar el archivo con robocopy app-v0.5.7.1 a el app-v0.5.8
REVISAR QUE ESTEN LOS ARCHIVOS IOS, NODE MODULES, ETC 

#2. npm install react-native-mqtt

#3. App.tsx:

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Button, TextInput } from 'react-native';
import { Paho } from 'react-native-mqtt';

const MQTTExample = () => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Disconnected');
  const [client, setClient] = useState(null);
  const [messageToSend, setMessageToSend] = useState('');

  // Configurar cliente MQTT
  useEffect(() => {
    const newClient = new Paho.Client(
      'test.mosquitto.org',  // Broker público de prueba
      8083,                 // Puerto para WebSocket
      'clientId-' + Math.random().toString(16).substr(2, 8)
    );

    setClient(newClient);

    // Callbacks
    newClient.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        setStatus('Connection lost: ' + responseObject.errorMessage);
      }
    };

    newClient.onMessageArrived = (message) => {
      setMessages(prev => [...prev, `${message.destinationName}: ${message.payloadString}`]);
    };

    return () => {
      if (newClient.isConnected()) {
        newClient.disconnect();
      }
    };
  }, []);

  // Conectar al broker
  const connect = useCallback(() => {
    if (client) {
      client.connect({
        onSuccess: () => {
          setStatus('Connected');
          client.subscribe('testtopic/react-native'); // Suscribirse a un topic
        },
        onFailure: (err) => {
          setStatus('Connection failed: ' + err.errorMessage);
        }
      });
    }
  }, [client]);

  // Enviar mensaje
  const publishMessage = () => {
    if (client && client.isConnected()) {
      const message = new Paho.Message(messageToSend || 'Hello from React Native!');
      message.destinationName = 'testtopic/react-native';
      client.send(message);
      setMessageToSend('');
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Status: {status}</Text>
      
      <Button 
        title={client?.isConnected() ? "Disconnect" : "Connect"} 
        onPress={connect} 
        disabled={client?.isConnected()}
      />

      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1, marginVertical: 10 }}
        value={messageToSend}
        onChangeText={setMessageToSend}
        placeholder="Escribe un mensaje"
      />

      <Button 
        title="Enviar mensaje" 
        onPress={publishMessage} 
        disabled={!client?.isConnected()}
      />

      <ScrollView style={{ marginTop: 20 }}>
        {messages.map((msg, index) => (
          <Text key={index}>{msg}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

export default MQTTExample;
#4. index.js: 

import 'react-native-url-polyfill/auto'; // Añade esto al principio
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

#5: AndroidManifest: 

<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
      android:name=".MainApplication"
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher_round"
      android:allowBackup="false"
      android:theme="@style/AppTheme"
      android:supportsRtl="true"
      android:usesCleartextTraffic="true"> <!-- Atributo añadido aquí -->
      <activity
        android:name=".MainActivity"
        android:label="@string/app_name"
        android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>

npm install react-native-mqtt
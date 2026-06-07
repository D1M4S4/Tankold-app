app-v0 proyecto en blanco solo con el welcome to react native

app-v0.1 proyecto con el frontend(animacion y lo demas)-solo emulador

app-v0.2 Frontend completo en apk 

app-v0.3 Frontend con backend (function buscar dispositivos integrado en el index.tsx)
app-v0.3.5 Frontend con backend (function buscar dispositivos integrado en una funcion) - no jalo xD

app-v0.4 Frontend con backend (function buscar dispositivos y conectar integrado en el index.tsx)

app-v0.5 Frontend con backend y esp32 (function buscar, conectar y enviar datos por separado integrado en el index.tsx)
11/03/2025 
cosas faltantes: 
- recibir los datos del MQTT encender y apagar MQTT.
-Conectar varios dispositivos al esp32
-Ajustar el texto de la pantalla para todos los celulares

-Implementacione futuras: agregar las funciones avanzadas: estado, cambiar contraseña, temp,     eliminar maquina, etc
-Maquina de bolis diseño igual que el de los tankes pero sin el boton de copo de nieve, y con un bolis de imagen, menu desplegable con 3 opciones 5cm, 10cm y 15cm, y a un lado un botn que dice cambiar tamaño de bolis
-Soporte asistido como un tutorial que te dice cmo usar la app y al final te dice si requieres al soporte tecnico

app-v.5.5 Frontend con backend y esp32 (function buscar, conectar, enviar datos, recibir la ip)
19/03/2025
osas faltantes: 
-recibir la confirmacion del WiFi, recibir los datos del MQTT encender y apagar MQTT.
-Conectar varios dispositivos al esp32
-Ajustar el texto de la pantalla para todos los celulares

-Implementacione futuras: agregar las funciones avanzadas: estado, cambiar contraseña, temp,     eliminar maquina, etc
-Maquina de bolis diseño igual que el de los tankes pero sin el boton de copo de nieve, y con un bolis de imagen, menu desplegable con 3 opciones 5cm, 10cm y 15cm, y a un lado un botn que dice cambiar tamaño de bolis
-Soporte asistido como un tutorial que te dice cmo usar la app y al final te dice si requieres al soporte tecnico

app-.5.5 Frontend con backend y esp32 (function buscar, conectar, enviar datos, recibir la ip)
agregando los detalles faltantes: 
1. recibir la confirmacion del WiFi
2. esp32 multiples dispositivos, led verde encendido
3. animación de cargando en el botón de enviar

Detalles Faltantes: 
1. -Ajustar el texto de la pantalla para todos los celulares

Funciones Faltantes: 
1.Menu de funciones avanzadas: estado, cambiar contraseña, temp, eliminar maquina, etc
2.-Soporte asistido como un tutorial que te dice como usar la app y al final te dice si requieres al soporte tecnico

app-v0.5.5.1 cosas agregadas: texto y animación adaptativo a todos los celulares, sin prueba en el cel del profe 
Funciones Faltantes: 
1.Menu de funciones avanzadas: estado, cambiar contraseña, temp, eliminar maquina, etc
2.-Soporte asistido como un tutorial que te dice como usar la app y al final te dice si requieres al soporte tecnico

app-v0.5.6 recibir datos mqtt (ya se reciben las credenciales mqtt y se elimina el dispositivo encontrado y ya se muestra con el botón de encender)
04/04/2025

app-v0.5.7 al presionar el snowbutton enviar un 1 al mqtt y que el esp32 lo reciba y se encienda usando: npm install react-native-mqtt 
pero aparece este error: 
Error: Could not find or load main class org.gradle.wrapper.GradleWrapperMain
Caused by: java.lang.ClassNotFoundException: org.gradle.wrapper.GradleWrapperMain
solución: 
crear nuevo proyecto de react native: 
 -cd escritorio
 -cd app
 -mkdir app-v0.5.7.1

 -cd app-v0.5.7.1
 -code ..
 -npx @react-native-community/cli init Tankold
 -cd Tankold
 -cd android
 -./gradlew clean
 -./gradlew assembleRelease
----------------HASTA AQUI FUNCIONO------------------

----------------------agregar carpetas-------------------
app-v0.5.7.1.1 
(carpeta scr y App.tsx)
desde app-v0.5.7
========instalar dependencias========
-cd tankold
-npm install lottie-react-native lottie-ios
_______________instalar dependencia de MQTT_________________
-npm install react-native-mqtt
 1. crear carpeta: @types en la carpeta de src 
 2. en la carpeta @types crear el archivo: react-native-mqtt.d.ts:
 3. en el archivo react-native-mqtt.d.ts poner esto: declare module 'react-native-mqtt'; 
 4. en el archivo tsconfig.json agregar:
 
  "compilerOption": {
    "typeRoots": [
      "node_modules/@types",
      "src/@types"
    ]
  }

 librería de react-native-mqtt esta obsoleta: El error ocurre porque la librería react-native-mqtt está usando una sintaxis obsoleta de Gradle
 
-----------------------USAR MQTT.js-------------------
Desinstalar react-native-mqtt:
-npm uninstall react-native-mqtt
 Instalar MQTT.js (y dependencias para React Native):
-npm install mqtt --save
-npm install react-native-tcp --save-dev  # Para soporte de TCP en React Native
-npm audit fix
-npm install buffer@6  # Requerido por MQTT.js en React Native
-npm install react-native-mqtt-js

el archivo app-v0.5.7.1.1 funcionaba el BLE muy bien y solo faltaba que se envie un 1 por mqtt
pero el código se contamino de errores de lógica y ya no funciona ble 
el app-v0.5.7.1.2 es lo mismo. el app-v0.5.7.1.3 va a ser puro MQTT ya que funcione el mqtt en local bien lo junto con anteriores de BLE que si funcionen bien
viernes 18 de abril de 2025
use la librería para mqtt "mejor mantenida": react-native-paho-mqtt primero la app no podia enviar mensajes por que el broker myqtt no tenia el protocolo WS(WebSocket) entonces intale mosquitto en la rasspberry pi con mosquitto al inicio fue un poco fácil puse la ip local estatica y ya ese dia nos fuimos temprano por que eran vacaciones de semana santa, me lleve la rasspberry pi con la pantallita y ya en mi casa puse la ip en el cpnel configure el dominio y todo pero deepseek me dijo que tenia que usar una DDNS para que si cambia la ip el mosquitto siga funcionando o comprar una ip publica fija a totalplay segui haciendo eso en la oficina por una semana pero el internet era inestable y la ip local y publica se cambiaba me sacada de la red y asi toda la semana, entonces instale mosquitto en mi laptop y lo use en red local por una semana pero la app me daba un error de credenciales y de autorización que era AMSQ0007 masomenos entonces use un broker llamado HIVEMQ que es gratuito y esta muy bien y fácil de usar, pero el error en la app todavía aparecía al querer enviar los datos.
lunes 28 de abril de 2025 
hoy 6:30 de la tarde voy a usar otra librería de mqtt en el archivo app-v0.5.8 solo para enviar un mensaje al nuevo broker mqtt con un pequeño código de ejemplo y ya

				



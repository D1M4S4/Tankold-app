#Que hace el ESP32: publicar que esta encendido, conectarse al celular, recibir las credenciales wifi, conectarse a internet, enviar la ip, enviar credenciales mqtt, guardar las credenciales wifi, conectarse a mqtt al iniciar.
#Que falta: actualizacion OTA, enviar topics por BLE
#Detalles faltantes: UUID dinamicos.

#Que falta en la App: detectar las redes 2.4G cercanas. Terminar Botones: Borrar con verificacio, cambiar wifi, hora de encendido. Recibir los topics por BLE de cada dispositivo. 
#Detalles de la App: quitar "Dispositivos Conectados:". Menu de Accesibilidad: Servicio tecnico, cambiar idioma, cambiar tema, acerca de la App. Cambiar nombre de la app a: TANKOLD y el icono.  
import asyncio
import aioble
import bluetooth
import network
import machine
import time
import math
import ssl
import json
import ntptime
from umqtt.simple import MQTTClient
from neopixel import NeoPixel

# Configuración de hardware NeoPixel
pin_neopixel = machine.Pin(8, machine.Pin.OUT)
num_leds = 1
np = NeoPixel(pin_neopixel, num_leds)
np[0] = (0, 0, 0)
np.write()

# UUIDs BLE
_SERVICE_UUID = bluetooth.UUID("19b10000-e8f2-537e-4f6c-d104768a1214")
_CHARACTERISTIC_UUID = bluetooth.UUID("19b10001-e8f2-537e-4f6c-d104768a1214")
_SEND_SERVICE_UUID = bluetooth.UUID(0xFF01)
_SEND_CHARACTERISTIC_UUID = bluetooth.UUID(0xFF02)

# Constantes MQTT
BROKER = 'qbd56d0e.ala.us-east-1.emqxsl.com'
PORT = 8883
CLIENT_ID = b'TK-2025-MA00-0001'
MQTT_USER = 'Mariano_Sanchez'
MQTT_PASSWORD = '0001'
CA_CERT_FILE = 'emqxsl-ca.crt'

# Archivo para guardar credenciales
CREDENTIALS_FILE = 'wifi_creds.json'

# Variables globales
wifi_ssid = None
wifi_password = None
sensor = None
client = None
ble_active = False
mqtt_running = False

# Registro de servicios BLE
ble_service = aioble.Service(_SERVICE_UUID)
send_service = aioble.Service(_SEND_SERVICE_UUID)

wifi_characteristic = aioble.Characteristic(
    ble_service,
    _CHARACTERISTIC_UUID,
    write=True,
    read=False,
    notify=False,
    capture=True
)

status_characteristic = aioble.Characteristic(
    send_service,
    _SEND_CHARACTERISTIC_UUID,
    read=False,
    write=False,
    notify=True,
    indicate=False
)

aioble.register_services(ble_service, send_service)

class MAX31865:
    def __init__(self, spi, cs, ref_r=430, r0=100.0, wire3=False):
        self.spi = spi
        cs.init(mode=machine.Pin.OUT)
        cs.value(1)
        self.cs = cs
        self.RefR = ref_r
        self.r0 = r0
        
        config = 0b11000011
        if wire3: 
            config |= (1 << 4)
        buf = bytearray(2)
        buf[0] = 0x80
        buf[1] = config        
        self._write(buf)

    def convert_res(self, raw):
        return raw / 0x8000 * self.RefR
    
    def convert_temp(self, raw):
        r = self.convert_res(raw)/self.r0
        a = 3.9083e-3
        b = -5.77500e-7
        p2 = a/b/2
        q = (1-r)/b
        return -p2 - math.sqrt(p2**2 - q)        
    
    def temperature(self):
        return self.convert_temp(self.read_sensor())
    
    def read_sensor(self):
        _, _, MSB, LSB = self._read(0x00, 4)
        raw = ((MSB << 8) + LSB) >> 1                        
        return raw    

    def _read(self, adr, num_bytes):
        self.cs.value(0)
        ret = self.spi.read(num_bytes, adr)        
        self.cs.value(1)
        return ret
    
    def _write(self, buf):
        self.cs.value(0)
        self.spi.write(buf)
        self.cs.value(1)

# Funciones para manejar credenciales
def save_credentials(ssid, password):
    try:
        with open(CREDENTIALS_FILE, 'w') as f:
            json.dump({'ssid': ssid, 'password': password}, f)
        print("Credenciales guardadas correctamente")
        return True
    except Exception as e:
        print("Error guardando credenciales:", e)
        return False

def load_credentials():
    try:
        with open(CREDENTIALS_FILE, 'r') as f:
            creds = json.load(f)
        print("Credenciales cargadas correctamente")
        return creds['ssid'], creds['password']
    except Exception as e:
        print("No se pudieron cargar las credenciales:", e)
        return None, None

async def send_status(connection, message):
    try:
        if connection and connection.is_connected():
            status_characteristic.write(message.encode('utf-8'))
            await status_characteristic.notify(connection)
            print("Estado enviado:", message)
    except Exception as e:
        print("Error enviando estado:", e)
        
def sync_time():
    max_retries = 3
    ntp_servers = ["pool.ntp.org", "time.nist.gov", "time.google.com"]
    
    for attempt in range(max_retries):
        try:
            print(f"Intento {attempt + 1} de sincronización NTP con {ntp_servers[attempt % len(ntp_servers)]}")
            ntptime.host = ntp_servers[attempt % len(ntp_servers)]
            ntptime.settime()
            
            # Verificar que la hora sea razonable (año >= 2023)
            current_time = time.localtime()
            if current_time[0] >= 2023:
                print("Hora sincronizada correctamente:", current_time)
                return True
            else:
                print("Hora sincronizada pero parece incorrecta:", current_time)
                
        except Exception as e:
            print(f"Error sincronizando con {ntp_servers[attempt % len(ntp_servers)]}:", e)
        
        time.sleep(2)
    
    # Si falla la sincronización NTP, establecer hora aproximada manualmente
    print("Estableciendo hora manualmente como fallback")
    manual_time = (2024, 6, 1, 12, 0, 0, 0, 0)
    time.localtime(manual_time)
    print("Hora establecida manualmente:", time.localtime())
    return False

def connect_wifi():
    global wifi_ssid, wifi_password
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    time.sleep(1)
    
    # Intentar cargar credenciales si no están en memoria
    if not wifi_ssid or not wifi_password:
        wifi_ssid, wifi_password = load_credentials()
    
    if not wifi_ssid or not wifi_password:
        raise OSError("No hay credenciales WiFi disponibles")
        
    if not sta.isconnected():
        print("Conectando a WiFi...")
        sta.connect(wifi_ssid, wifi_password)
        start_time = time.time()
        while not sta.isconnected():
            if (time.time() - start_time) > 15:
                raise OSError("Timeout de conexión WiFi")
            time.sleep(0.5)
    print('Conexión WiFi exitosa:', sta.ifconfig())
    
    # Sincronizar hora después de conectar WiFi
    time_synced = sync_time()
    
    if not time_synced:
        print("Advertencia: La hora podría no ser precisa, lo que puede afectar las conexiones SSL")

def sub_callback(topic, msg):
    try:
        topic = topic.decode()
        message = msg.decode().strip()
        print(f"Mensaje recibido: {topic} -> {message}")
        
        if topic == "Control":
            if message == "1":
                np[0] = (255, 255, 255)
                np.write()
                print("LED encendido")
            elif message == "0":
                np[0] = (0, 0, 0)
                np.write() 
                print("LED apagado")
                
    except Exception as e:
        print("Error en callback:", e)

def connect_mqtt():
    global client
    
    with open(CA_CERT_FILE, 'rb') as f:
        ca_cert = f.read()
    
    ssl_params = {
        "cert_reqs": ssl.CERT_REQUIRED,
        "cadata": ca_cert,
        "server_hostname": BROKER
    }
    
    client = MQTTClient(
        client_id=CLIENT_ID,
        server=BROKER,
        port=PORT,
        user=MQTT_USER,
        password=MQTT_PASSWORD,
        ssl=True,
        ssl_params=ssl_params,
        keepalive=60
    )
    
    client.set_callback(sub_callback)
    client.connect()
    client.subscribe(b"Control")
    print("Conectado a EMQX Cloud")
    return client

def publish_status():
    if client is None:
        return
        
    current_color = np[0]
    led_state = b"1" if (current_color != (0, 0, 0)) else b"0"
    client.publish(b"Estado", led_state)
    print(f"Estado LED publicado: {led_state.decode()}")
    
    try:
        current_temp = sensor.temperature()
        temp_str = f"{current_temp:.0f}"
        client.publish(b"Temp", temp_str.encode())
        print(f"Temperatura publicada: {temp_str}°C")
    except Exception as e:
        print("Error al publicar temperatura:", e)

async def run_mqtt():
    global client, sensor, mqtt_running
    mqtt_running = True
    
    try:
        spi = machine.SPI(1, baudrate=400000, polarity=0, phase=1)
        cs = machine.Pin(5)
        sensor = MAX31865(spi, cs)
        
        client = connect_mqtt()
        last_ping = time.time()
        last_status = time.time()
        
        while mqtt_running:
            client.check_msg()
            
            if time.time() - last_status >= 5:
                publish_status()
                last_status = time.time()
            
            if time.time() - last_ping > 30:
                client.ping()
                last_ping = time.time()
            
            await asyncio.sleep(0.5)
            
    except Exception as e:
        print("Error crítico en MQTT:", e)
    finally:
        if client:
            client.disconnect()
        mqtt_running = False

async def handle_ble_communication(connection):
    global wifi_ssid, wifi_password, mqtt_running
    try:
        print("Conexión BLE establecida desde:", connection.device)
        np[0] = (0, 0, 255)
        np.write()
        
        await connection.exchange_mtu(512)
        
        while True:
            wlan = network.WLAN(network.STA_IF)
            wlan.active(False)
            await asyncio.sleep_ms(100)
            
            print("Esperando credenciales WiFi...")
            
            await wifi_characteristic.written()
            wifi_ssid = wifi_characteristic.read().decode().strip()
            
            await wifi_characteristic.written()
            wifi_password = wifi_characteristic.read().decode().strip()

            # Guardar las nuevas credenciales
            if save_credentials(wifi_ssid, wifi_password):
                await send_status(connection, "Credenciales guardadas")
            else:
                await send_status(connection, "Error:No se pudieron guardar credenciales")

            wlan.active(True)
            wlan.connect(wifi_ssid, wifi_password)
            
            connected = False
            for _ in range(20):
                if wlan.isconnected():
                    connected = True
                    break
                await asyncio.sleep_ms(500)
            
            if connected:
                ip = wlan.ifconfig()[0]
                print("Conectado a WiFi. IP:", ip)
                np[0] = (0, 255, 0)
                np.write()
                await send_status(connection, f"IP:{ip}")
                await send_status(connection, f"PORT:1883")
                await send_status(connection, f"USER:Mariano_Sanchez")
                await send_status(connection, f"PASSWORD:0001")
                await send_status(connection, f"CLIENT_ID:TK-2025-MA00-0001")
                await asyncio.sleep_ms(2000)
                return True
            else:
                np[0] = (0, 0, 0)
                np.write()
                await send_status(connection, "Error:Datos de red incorrectos")
                print("Error de conexión - Esperando nuevos datos...")
                
    except Exception as e:
        print("Error en comunicación BLE:", e)
        np[0] = (0, 0, 0)
        np.write()
        return False
    finally:
        np[0] = (0, 0, 0)
        np.write()

async def ble_server():
    global ble_active, mqtt_running
    while True:
        try:
            print("Anunciando BLE...")
            wlan = network.WLAN(network.STA_IF)
            
            if wlan.isconnected():
                np[0] = (0, 255, 0)  
            else:
                np[0] = (255, 0, 0)  
            np.write()
            
            async with await aioble.advertise(
                250_000,
                name="TK-2025-MA00-0001",
                services=[_SERVICE_UUID],
                appearance=0x0000
            ) as connection:
                print("Dispositivo BLE conectado")
                # Pausar MQTT si está corriendo
                if mqtt_running:
                    mqtt_running = False
                    await asyncio.sleep(1)  # Esperar a que MQTT se detenga
                
                success = await handle_ble_communication(connection)
                if success:
                    # Reconectar MQTT después de exitosa configuración BLE
                    asyncio.create_task(run_mqtt())
                
        except Exception as e:
            print("Error en servidor BLE:", e)
            np[0] = (0, 0, 0)
            np.write()
            await asyncio.sleep_ms(1000)

async def main():
    global wifi_ssid, wifi_password, ble_active
    np[0] = (0, 0, 0)
    np.write()
    
    # Cargar credenciales al iniciar
    wifi_ssid, wifi_password = load_credentials()
    
    # Iniciar servidor BLE
    asyncio.create_task(ble_server())
    
    # Esperar un momento antes de intentar conectar MQTT
    await asyncio.sleep(2)
    
    # Intentar conectar a WiFi y MQTT si hay credenciales
    if wifi_ssid and wifi_password:
        try:
            connect_wifi()
            asyncio.create_task(run_mqtt())
        except Exception as e:
            print("Error al conectar MQTT:", e)
    
    # Mantener el programa corriendo
    while True:
        await asyncio.sleep(1)

# Ejecución principal
try:
    asyncio.run(main())
except Exception as e:
    print("Error fatal:", e)
    machine.reset()
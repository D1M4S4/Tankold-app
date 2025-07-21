import network
import machine
import time
import math
import ssl
from umqtt.simple import MQTTClient

# Configuración WiFi
WIFI_SSID = 'TP-Link_E116'
WIFI_PASSWORD = '27063637'
#TP-Link_E116, 27063637
#Totalplay-5044, 50449694UA3MHPn9

# Configuración EMQX Cloud
BROKER = 'qbd56d0e.ala.us-east-1.emqxsl.com'
PORT = 8883
CLIENT_ID = b'TK-2025-MA00-0001'
MQTT_USER = 'Mariano_Sanchez'
MQTT_PASSWORD = '0001'
CA_CERT_FILE = 'emqxsl-ca.crt'

# Configuración de hardware
led = machine.Pin(13, machine.Pin.OUT)
led.value(0)

# Variable global para el cliente MQTT
client = None

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

def connect_wifi():
    sta = network.WLAN(network.STA_IF)
    sta.active(True)
    time.sleep(1)
    if not sta.isconnected():
        print("Conectando a WiFi...")
        sta.connect(WIFI_SSID, WIFI_PASSWORD)
        start_time = time.time()
        while not sta.isconnected():
            if (time.time() - start_time) > 15:
                raise OSError("Timeout de conexión WiFi")
            time.sleep(0.5)
    print('Conexión WiFi exitosa:', sta.ifconfig())

def sub_callback(topic, msg):
    try:
        topic = topic.decode()
        message = msg.decode().strip()
        print(f"Mensaje recibido: {topic} -> {message}")
        
        if topic == "Control":
            if message == "1":
                led.value(1)
                print("LED encendido")
            elif message == "0":
                led.value(0)
                print("LED apagado")
                
    except Exception as e:
        print("Error en callback:", e)

def connect_mqtt():
    global client
    
    # Leer certificado CA
    with open(CA_CERT_FILE, 'rb') as f:
        ca_cert = f.read()
    
    # Configurar parámetros SSL
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
        
    # Publicar estado del LED
    led_state = b"1" if led.value() else b"0"
    client.publish(b"Estado", led_state)
    print(f"Estado LED publicado: {led_state.decode()}")
    
    # Publicar temperatura
    try:
        current_temp = sensor.temperature()
        temp_str = f"{current_temp:.0f}"
        client.publish(b"Temp", temp_str.encode())
        print(f"Temperatura publicada: {temp_str}°C")
    except Exception as e:
        print("Error al publicar temperatura:", e)

def main():
    global client, sensor
    connect_wifi()
    
    try:
        # Inicializar sensor de temperatura
        spi = machine.SPI(2, baudrate=400000, polarity=0, phase=1)
        cs = machine.Pin(5)
        sensor = MAX31865(spi, cs)
        
        client = connect_mqtt()
        last_ping = time.time()
        last_status = time.time()
        
        while True:
            client.check_msg()
            
            # Publicar estados cada 5 segundos
            if time.time() - last_status >= 5:
                publish_status()
                last_status = time.time()
            
            # Mantener conexión MQTT
            if time.time() - last_ping > 30:
                client.ping()
                last_ping = time.time()
            
            time.sleep(0.5)
            
    except Exception as e:
        print("Error crítico:", e)
        machine.reset()

if __name__ == "__main__":
    main()
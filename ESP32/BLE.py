#que hace el codigo: publicar que esta encendido, conectarse al celular, recibir las credenciales wifi, conectarse a internet, enviar la ip.
#que falta: enviar solo los datos necesarios para mqtt correctamente: CLIENT_ID, USER Y PASSWORD.
#detalles faltantes: UUID dinamicos, que el esp32 guarde la contraseña wifi.
import asyncio
import aioble
import bluetooth
from machine import Pin, PWM
import network
import time

# Configuración de hardware
LED_PIN = 12
LED_GREEN_PIN = 14

led_pwm = PWM(Pin(LED_PIN), freq=5000, duty=150)
led_green = Pin(LED_GREEN_PIN, Pin.OUT)

# UUIDs BLE
_SERVICE_UUID = bluetooth.UUID("19b10000-e8f2-537e-4f6c-d104768a1214")
_CHARACTERISTIC_UUID = bluetooth.UUID("19b10001-e8f2-537e-4f6c-d104768a1214")
_SEND_SERVICE_UUID = bluetooth.UUID(0xFF01)
_SEND_CHARACTERISTIC_UUID = bluetooth.UUID(0xFF02)

# Registro de servicios
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

async def send_status(connection, message):
    try:
        if connection and connection.is_connected():
            # Primero escribe el valor en la característica
            status_characteristic.write(message.encode('utf-8'))
            # Luego envía la notificación sin datos
            await status_characteristic.notify(connection)
            print("Estado enviado:", message)
    except Exception as e:
        print("Error enviando estado:", e)

async def handle_ble_communication(connection):
    try:
        print("Conexión establecida desde:", connection.device)
        led_pwm.duty(150)
        
        await connection.exchange_mtu(512)
        
        while True:
            wlan = network.WLAN(network.STA_IF)
            wlan.active(False)
            await asyncio.sleep_ms(100)
            
            print("Esperando credenciales...")
            
            # Recibir SSID
            await wifi_characteristic.written()
            ssid = wifi_characteristic.read().decode().strip()
            
            # Recibir contraseña
            await wifi_characteristic.written()
            password = wifi_characteristic.read().decode().strip()

            # Intentar conexión WiFi
            wlan.active(True)
            wlan.connect(ssid, password)
            
            connected = False
            for _ in range(20):
                if wlan.isconnected():
                    connected = True
                    break
                await asyncio.sleep_ms(500)
            
            if connected:
                ip = wlan.ifconfig()[0]
                print("Conectado a WiFi. IP:", ip)
                led_green.value(1)
                await send_status(connection, f"IP:{ip}") #ip del esp32
                await send_status(connection, f"PORT:1883") #puerto
                await send_status(connection, f"USER:Mariano_Sanchez") #MQTT user
                await send_status(connection, f"PASSWORD:0001") #MQTT password
                await send_status(connection, f"CLIENT_ID:TK-2025-MA00-0001") #client id
                await asyncio.sleep_ms(2000)
                break
            else:
                led_green.value(0)
                await send_status(connection, "Error:Datos de red incorrectos")
                print("Error de conexión - Esperando nuevos datos...")
                
    except Exception as e:
        print("Error en comunicación BLE:", e)
        led_green.value(0)
    finally:
        led_pwm.duty(0)
        wlan = network.WLAN(network.STA_IF)
        if not wlan.isconnected():
            led_green.value(0)
        try:
            await connection.disconnect()
        except:
            pass

async def ble_server():
    while True:
        try:
            print("Anunciando BLE...")
            wlan = network.WLAN(network.STA_IF)
            led_green.value(1 if wlan.isconnected() else 0)
            
            async with await aioble.advertise(
                250_000,
                name="TK-2025-MA00-0001",
                services=[_SERVICE_UUID],
                appearance=0x0000
            ) as connection:
                print("Dispositivo conectado")
                await handle_ble_communication(connection)
                
        except Exception as e:
            print("Error en servidor BLE:", e)
            led_green.value(0)
            await asyncio.sleep_ms(1000)

async def main():
    led_pwm.duty(0)
    wlan = network.WLAN(network.STA_IF)
    led_green.value(1 if wlan.isconnected() else 0)
    await ble_server()

asyncio.run(main()) 
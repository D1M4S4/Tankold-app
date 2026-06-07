from machine import Pin
from neopixel import NeoPixel
import time

# Configuración del Neopixel
pin_neopixel = Pin(8, Pin.OUT)  # Pin donde está conectado el Neopixel (ver esquemático)
num_leds = 1                    # Número de LEDs Neopixel (generalmente 1 en ESP32-C6)
np = NeoPixel(pin_neopixel, num_leds)

# Encender en BLANCO (R, G, B) - Valores de 0 a 255
np[0] = (255, 255, 255)  # Blanco máximo
np.write()               # Enviar datos al LED

# Mantener encendido (opcional)
while True:
    time.sleep(1)

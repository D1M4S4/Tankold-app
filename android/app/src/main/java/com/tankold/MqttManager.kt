package com.tankold

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.eclipse.paho.client.mqttv3.*
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import javax.net.ssl.SSLSocketFactory
import com.facebook.react.module.annotations.ReactModule
import java.security.KeyStore
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.*

@ReactModule(name = "MqttManager")
class MqttManager(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var mqttClient: MqttAsyncClient? = null
    private val TAG = "MqttManager"
    private val handler = Handler(Looper.getMainLooper())
    private val reactAppContext = reactContext

    override fun getName() = "MqttManager"

    @ReactMethod
    fun connect(url: String, clientId: String, username: String, password: String, promise: Promise) {
        try {
            if (mqttClient?.isConnected == true) {
                Log.d(TAG, "Cliente ya conectado")
                promise.resolve(true)
                return
            }

            Log.d(TAG, "Conectando a: $url con clientId: $clientId")

            mqttClient = MqttAsyncClient(url, clientId, MemoryPersistence()).apply {
                setCallback(object : MqttCallback {
                    override fun connectionLost(cause: Throwable?) {
                        Log.e(TAG, "Conexión perdida: ${cause?.message}")
                        sendEvent("connectionStatus", Arguments.createMap().apply {
                            putBoolean("connected", false)
                            putString("error", cause?.message ?: "Conexión perdida")
                        })
                    }

                    override fun messageArrived(topic: String, message: MqttMessage) {
                        Log.d(TAG, "Mensaje recibido en $topic: ${String(message.payload)}")
                        sendEvent("messageReceived", Arguments.createMap().apply {
                            putString("topic", topic)
                            putString("message", String(message.payload))
                        })
                    }

                    override fun deliveryComplete(token: IMqttDeliveryToken?) {
                        // No necesario para conexión básica
                    }
                })
            }

            val options = MqttConnectOptions().apply {
                isCleanSession = true
                this.userName = username
                this.password = password.toCharArray()
                connectionTimeout = 30
                keepAliveInterval = 60
                isAutomaticReconnect = true

                // Configuración SSL para conexiones seguras
                if (url.startsWith("ssl://")) {
                    Log.d(TAG, "Configurando SSL para conexión segura")

                    // Usar socket factory que acepta todos los certificados (solo para desarrollo)
                    socketFactory = getTrustAllSocketFactory()
                }
            }

            mqttClient?.connect(options, null, object : IMqttActionListener {
                override fun onSuccess(asyncActionToken: IMqttToken) {
                    Log.d(TAG, "Conexión exitosa")
                    promise.resolve(true)
                    sendEvent("connectionStatus", Arguments.createMap().apply {
                        putBoolean("connected", true)
                    })
                }

                override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable) {
                    Log.e(TAG, "Error de conexión: ${exception.message}", exception)
                    promise.reject("CONNECTION_FAILED", exception)
                    sendEvent("connectionStatus", Arguments.createMap().apply {
                        putBoolean("connected", false)
                        putString("error", exception.message ?: "Error desconocido")
                    })
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error en connect: ${e.message}", e)
            promise.reject("CONNECTION_ERROR", e)
        }
    }

    private fun getTrustAllSocketFactory(): SSLSocketFactory {
        try {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })

            val sslContext = SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, SecureRandom())
            return sslContext.socketFactory
        } catch (e: Exception) {
            throw RuntimeException("Error creando socket factory", e)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            if (mqttClient == null) {
                promise.resolve(false)
                return
            }

            if (mqttClient?.isConnected == true) {
                mqttClient?.disconnect()?.setActionCallback(object : IMqttActionListener {
                    override fun onSuccess(asyncActionToken: IMqttToken?) {
                        Log.d(TAG, "Desconexión exitosa")
                        promise.resolve(true)
                        sendEvent("connectionStatus", Arguments.createMap().apply {
                            putBoolean("connected", false)
                        })
                    }

                    override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                        Log.e(TAG, "Error en disconnect: ${exception?.message}")
                        promise.reject("DISCONNECT_ERROR", exception?.message)
                    }
                })
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error en disconnect: ${e.message}", e)
            promise.reject("DISCONNECT_ERROR", e)
        }
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        try {
            val connected = mqttClient?.isConnected ?: false
            Log.d(TAG, "isConnected: $connected")
            promise.resolve(connected)
        } catch (e: Exception) {
            Log.e(TAG, "Error en isConnected: ${e.message}", e)
            promise.reject("CONNECTION_CHECK_ERROR", e)
        }
    }

    @ReactMethod
    fun subscribe(topic: String, qos: Int, promise: Promise) {
        try {
            if (mqttClient?.isConnected != true) {
                promise.reject("NOT_CONNECTED", "Client not connected")
                return
            }

            Log.d(TAG, "Suscribiendo a topic: $topic con QoS: $qos")
            mqttClient?.subscribe(topic, qos, null, object : IMqttActionListener {
                override fun onSuccess(asyncActionToken: IMqttToken?) {
                    Log.d(TAG, "Suscripción exitosa a $topic")
                    promise.resolve(true)
                }

                override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                    Log.e(TAG, "Error en suscripción a $topic: ${exception?.message}")
                    promise.reject("SUBSCRIBE_FAILED", exception?.message)
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error en subscribe: ${e.message}", e)
            promise.reject("SUBSCRIBE_ERROR", e)
        }
    }

    @ReactMethod
    fun publish(topic: String, message: String, qos: Int, promise: Promise) {
        try {
            if (mqttClient?.isConnected != true) {
                promise.reject("NOT_CONNECTED", "Client not connected")
                return
            }

            Log.d(TAG, "Publicando en $topic: $message (QoS: $qos)")
            val mqttMessage = MqttMessage(message.toByteArray()).apply {
                this.qos = qos
                isRetained = false
            }

            mqttClient?.publish(topic, mqttMessage, null, object : IMqttActionListener {
                override fun onSuccess(asyncActionToken: IMqttToken?) {
                    Log.d(TAG, "Publicación exitosa en $topic")
                    promise.resolve(true)
                }

                override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                    Log.e(TAG, "Error en publicación a $topic: ${exception?.message}")
                    promise.reject("PUBLISH_FAILED", exception?.message ?: "Publish failed")
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error en publish: ${e.message}", e)
            promise.reject("PUBLISH_ERROR", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        handler.post {
            try {
                reactAppContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            } catch (e: Exception) {
                Log.e(TAG, "Error enviando evento: ${e.message}")
            }
        }
    }
}
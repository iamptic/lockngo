#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- CONFIGURATION ---
const char* WIFI_SSID = "LocknGo_Guest";
const char* WIFI_PASS = "securepassword";
const char* MQTT_SERVER = "mqtt.lockngo.ru";
const int MQTT_PORT = 1883;
const char* DEVICE_ID = "STATION_001";

// --- PINS ---
// Using Shift Register (74HC595) or IO Expander for locks to save pins
const int DATA_PIN = 13;
const int LATCH_PIN = 12;
const int CLOCK_PIN = 14;

// --- GLOBALS ---
WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastHeartbeat = 0;

// --- LOCK CONTROL ---
void openLock(int cellId) {
  Serial.printf("Opening cell %d\n", cellId);
  // Logic to trigger solenoid via Shift Register/Expander
  // Pulse for 500ms
  // digitalWrite(RELAY_PIN, HIGH); delay(500); digitalWrite(RELAY_PIN, LOW);
}

// --- MQTT CALLBACK ---
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.printf("Msg on [%s]: %s\n", topic, message.c_str());

  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);

  const char* cmd = doc["cmd"];
  if (strcmp(cmd, "open") == 0) {
    int cell = doc["cell"];
    openLock(cell);
    // Publish confirmation
    char resp[100];
    sprintf(resp, "{\"event\":\"opened\", \"cell\":%d}", cell);
    client.publish("lockngo/events", resp);
  }
  else if (strcmp(cmd, "reboot") == 0) {
    ESP.restart();
  }
}

void setup() {
  Serial.begin(115200);
  
  // Init Hardware
  pinMode(DATA_PIN, OUTPUT);
  pinMode(LATCH_PIN, OUTPUT);
  pinMode(CLOCK_PIN, OUTPUT);

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi Connected");

  // MQTT
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect(DEVICE_ID)) {
      client.subscribe("lockngo/cmd/" DEVICE_ID);
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Heartbeat every 60s
  if (millis() - lastHeartbeat > 60000) {
    lastHeartbeat = millis();
    String status = String("{\"id\":\"") + DEVICE_ID + "\", \"battery\": 100, \"wifi\": " + WiFi.RSSI() + "}";
    client.publish("lockngo/heartbeat", status.c_str());
  }
}

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- CONFIGURATION ---
const char* WIFI_SSID = "LocknGo_Guest";
const char* WIFI_PASS = "securepassword";
const char* API_URL = "https://lockngo.pages.dev"; // ЗАМЕНИТЕ НА ВАШ АКТУАЛЬНЫЙ URL (например, из wrangler)
const int STATION_ID = 1; // ID станции в базе данных (1 = Галерея, 2 = Пулково)

// --- PINS ---
// Using Shift Register (74HC595) for locks
const int DATA_PIN = 13;
const int LATCH_PIN = 12;
const int CLOCK_PIN = 14;
const int SCANNER_RX = 16; // Pin connected to QR Scanner TX
const int SCANNER_TX = 17;

// --- GLOBALS ---
unsigned long lastSync = 0;
const long syncInterval = 5000; // Sync every 5 seconds

// --- LOCK CONTROL ---
// Map cell numbers (e.g., "A01") to Shift Register bit indices
int getCellIndex(String cellNumber) {
  // Example mapping logic. In reality, you'd have a lookup table.
  // A01 -> 0, A02 -> 1, ...
  char row = cellNumber.charAt(0); // 'A', 'B', ...
  int num = cellNumber.substring(1).toInt(); // 1, 2, ...
  
  int rowIndex = row - 'A'; // 0, 1, 2...
  return (rowIndex * 8) + (num - 1);
}

void openLock(String cellNumber) {
  int pinIndex = getCellIndex(cellNumber);
  Serial.printf("[HW] Opening lock for cell %s (Index: %d)\n", cellNumber.c_str(), pinIndex);
  
  // Logic to drive 74HC595
  // This is a simplified example pulsing the specific bit
  digitalWrite(LATCH_PIN, LOW);
  // shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, (1 << pinIndex)); // Simplified bitmask
  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, 255); // Debug: turn on all for test
  digitalWrite(LATCH_PIN, HIGH);
  
  delay(500); // Keep open for 0.5s
  
  // Reset locks (close)
  digitalWrite(LATCH_PIN, LOW);
  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, 0);
  digitalWrite(LATCH_PIN, HIGH);
}

// --- API INTERACTION ---
void syncWithServer() {
  if(WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String endpoint = String(API_URL) + "/api/hw/sync";
  
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["id"] = STATION_ID;
  doc["battery"] = 100; // Mock battery level
  doc["wifi"] = WiFi.RSSI();
  doc["error"] = ""; // Send error string if any HW fault
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    // Serial.println(httpResponseCode);
    // Serial.println(response);
    
    DynamicJsonDocument reqDoc(2048);
    DeserializationError error = deserializeJson(reqDoc, response);
    
    if (!error) {
      // 1. Check for open commands
      JsonArray openCells = reqDoc["open"].as<JsonArray>();
      for(JsonVariant v : openCells) {
        String cellNum = v.as<String>();
        openLock(cellNum);
      }
      
      // 2. Update Screen Content (e.g. Nextion display or LCD)
      String screenMode = reqDoc["screen"]["mode"].as<String>();
      String screenContent = reqDoc["screen"]["content"].as<String>();
      // Serial.printf("Updating Screen: Mode=%s Content=%s\n", screenMode.c_str(), screenContent.c_str());
    }
  } else {
    Serial.printf("Error on sending POST: %d\n", httpResponseCode);
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  
  // Init Pins
  pinMode(DATA_PIN, OUTPUT);
  pinMode(LATCH_PIN, OUTPUT);
  pinMode(CLOCK_PIN, OUTPUT);
  
  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
}

void loop() {
  // 1. Periodic Sync
  if (millis() - lastSync > syncInterval) {
    syncWithServer();
    lastSync = millis();
  }
  
  // 2. Listen for QR Scanner (UART)
  if (Serial.available()) {
    String qrCode = Serial.readStringUntil('\n');
    qrCode.trim();
    if (qrCode.length() > 5) {
       Serial.println("Scanned QR: " + qrCode);
       // Call /api/station/scan logic here...
    }
  }
}
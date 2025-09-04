// Installation instructions for the ESP32-Board
// https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/

// Boards:
// esp32 by Espressif Systems@3.2.1

// Select ESP32 Dev Module as your board

// Libraries:
// ArduinoMqttClient by Arduino@0.1.8
// ArduinoJson by Benoit@7.4.2

#include <WiFi.h> // Is installed automatically. Don't install additional libs
#include <ArduinoMqttClient.h> // Has to be installed manually
#include <esp_now.h>
#include <esp_wifi.h>
#include "../arduino_secrets.h" // Local file with secrets
#include "time.h" // For Timestamps NTP
#include <ArduinoJson.h> // For MQTT Json

// This sketch is executed on the Edge-Device.
// It connects to WiFi and gives all sensor data from the other ESPs to the MQTT server.
// Sensor data is being captured locally but also received from the other ESPs over ESP-Now.

// Mac-Adresses:
// ESP-1:         94:54:C5:E8:A5:DC -> DE:AD:C0:DE:00:01
// ESP-2:         94:54:C5:E8:BC:40 -> DE:AD:C0:DE:00:02
// ESP-3:         D4:8C:49:69:D5:74 -> DE:AD:C0:DE:00:03
// ESP-4:         D4:8C:49:6A:EC:24 -> DE:AD:C0:DE:00:04
// ESP-5: (Edge)  D4:8C:49:69:A2:F0 -> unchanged

const char ssid[] = SECRET_SSID;    // your network SSID
const char pass[] = SECRET_PASS;    // your network password

// MQTT Settings etc...
WiFiClient espClient;
MqttClient mqttClient(espClient);
int        port     = 1883;
const char topic[]  = "dhbw/ai/si2023/5/max4466/0";
const char MQTT_USER[] = "haenisch";
const char MQTT_PASS[] = "geheim";
const char broker[] = "aicon.dhbw-heidenheim.de";
unsigned long  count = 0;

// ESP-Now
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
} struct_message; // Typedef

// Collect Data: 4 senders x 10 ticks buffer
uint16_t collectEsp[4][10];
// Track which sender sent data during the current tick
bool dataReceived[4] = {false, false, false, false};
int countEspTicks = 0; 

// JSON
JsonDocument doc;
char jsonString[400];

// NTP 
time_t timestamp;

void setup() {
  // Connect to WiFi (STA)
  connectWPA2();

  // Connect to MQTT Broker
  connectMqtt();
  
  // ESP-Now Initialization
  if (esp_now_init() != ESP_OK) {
    return;
  }
  esp_now_register_recv_cb(onReceive);
}

void loop() {
  for (int i = 0; i < 4; i++) {
    dataReceived[i] = false;
  }

  unsigned long startProbeMillis = millis(); // Each measure and sending cycle will take exactly 100ms

  countEspTicks++;
  if (countEspTicks >= 10){
    countEspTicks = 0;
    sendMqtt(count++);
    for(int i = 0; i < 4; i++){
      for(int j = 0; j < 10; j++){
        collectEsp[i][j] = 0;
      }
    }
  }

  // Non-blocking wait to simulate 100ms measurement cycle
  while((startProbeMillis + 100) > millis()){
    delay(1); // Yield to WiFi/ESP-NOW tasks
  }
}

// ESP-Now receive callback
void onReceive(const esp_now_recv_info* info, const uint8_t* data, int len) {
  uint8_t identifier = info->src_addr[5];

  if (len != sizeof(struct_message)) {
    return;
  }

  struct_message incomingData;
  memcpy(&incomingData, data, sizeof(incomingData));

  int index = identifier - 1;

  if (index >= 0 && index < 4) {
    collectEsp[index][countEspTicks] = incomingData.audio;
    dataReceived[index] = true; // Mark as updated for this tick
  }
}

// Prepare and send MQTT payload
void sendMqtt(int count){
  configTime(0, 0, "de.pool.ntp.org");
  timestamp = time(nullptr);
  doc["timestamp"] = timestamp;

  // Flatten 2D Array -> 1D for JSON
  for (int i = 0; i < 40; i++) {
      doc["value"][i] = *(&collectEsp[0][0] + i); 
  }

  doc["sequence"] = count;
  doc["meta"] = "null";
  serializeJson(doc, jsonString);

  // Ensure connectivity before sending
  while(WiFi.status() != WL_CONNECTED) {
    connectWPA2();
  }

  if (!mqttClient.connected()) {
    mqttClient.stop();
    connectMqtt();
  }

  mqttClient.beginMessage(topic);
  mqttClient.println(jsonString);
  mqttClient.endMessage();
  doc.clear();
}

// Connect to Wi-Fi with retries
void connectWPA2() {
  // Cleanup previous connections
  WiFi.disconnect(true);        // Disconnect from STA
  delay(100);                   // Tactical delay

  // Connect to STA first
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  
  // Attempt connection for 10 seconds
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 10000) {
    delay(500);
  }
}

// Connect to MQTT Broker with retry logic
void connectMqtt(){
  mqttClient.setUsernamePassword(MQTT_USER, MQTT_PASS);
  while (!mqttClient.connect(broker, port)) {
    delay(1000);
  }
}

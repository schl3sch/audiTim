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
// ESP-5: (Edge)  UNKNOWN           -> DE:AD:C0:DE:00:05

const char ssid[] = SECRET_SSID;    // your network SSID
const char pass[] = SECRET_PASS;    // your network password

// MQTT Settings etc...
WiFiClient espClient;
MqttClient mqttClient(espClient);
int        port     = 1883;
const char topic[]  = "dhbw/ai/si2023/5/max4466/0";
const char MQTT_USER[] = "haenisch";
const char MQTT_PASS[] = "geheim";
const char broker[] = "aicon.dhbw-heidenheim.de"; // changed??
const long interval = 1000;
unsigned long previousMillis = 0;
unsigned long  count = 0;

// ESP-Now
const uint8_t myMac[] = {0xDE, 0xAD, 0xC0, 0xDE, 0x00, 0x05}; // Will get changed based on the ESP; myMac[5] can be used as identifier
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
} struct_message; // Typedef
uint16_t failedTransmissionCounter = 0;

// Collect Data
uint16_t collectEsp[4][10];
int countEspTicks = 0; 

// JSON
JsonDocument doc;
char jsonString[400];

// NTP 
time_t timestamp;

void setup() {
  // Serial Setup
  Serial.begin(115200);
  delay(1000);

  // Change local MAC-Adress
  esp_wifi_set_mac(WIFI_IF_STA, myMac);

  // Connect to enterprise WiFi
  connectWPA2();

  // Connect to MQTT
  connectMqtt();
  
  // ESP-Now
  esp_now_init();
  esp_now_register_recv_cb(onReceive);
}

void loop() {
  for (int i = 0; i < 4; i++){
    collectEsp[i][countEspTicks] = 5000;
  }
  unsigned long startProbeMillis = millis(); // Each measure and sending cycle will take exactly 100ms

  // Non-blocking wait
  while((startProbeMillis + 100) > millis()){
    ; // Just chill here for the duration of 100ms
  }
  
  countEspTicks++;
  if (countEspTicks >= 10){
    countEspTicks = 0;
    sendMqtt(count++);
  }
}

void onReceive(const esp_now_recv_info* info, const uint8_t* data, int len) {
  uint8_t identifier = info->src_addr[5];

  if (len != sizeof(struct_message)) {
    Serial.printf("Received unexpected data size: %d bytes\n", len);
    return;
  }

  struct_message incomingData;
  memcpy(&incomingData, data, sizeof(incomingData));

  Serial.print("Ref:4095,");
  Serial.printf("%u-Data:%u,", identifier, incomingData.audio); // %u for unsigned integer
  collectEsp[identifier - 1][countEspTicks] = incomingData.audio;
}

void sendMqtt(int count){
  configTime(0, 0, "de.pool.ntp.org");
  timestamp = time(nullptr);
  doc["timestamp"] = timestamp;
  for (int i = 0; i < 40; i++) { // 2D Array -> Array by Pointer
      doc["value"][i] = *(&collectEsp[0][0] + i); 
  }
  doc["sequence"] = count;
  doc["meta"] = "null";
  serializeJson(doc, jsonString);

  // In case of disconnect
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
    Serial.print(".");
    delay(500);
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nFailed to connect to STA");
    return; // Will get called again to retry
  }
}

void connectMqtt(){
  mqttClient.setUsernamePassword(MQTT_USER, MQTT_PASS);
  Serial.print("Attempting MQTT connection");
  while (!mqttClient.connect(broker, port)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());
    Serial.println("Trying again in 1 second");
    delay(1000);
  }
  Serial.println("You're connected to the MQTT broker!");
}

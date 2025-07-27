// Installation instructions for the ESP32-Board
// https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/

// Select ESP32 Dev Module as your board

// Libraries:
// ArduinoMqttClient@0.1.8

#include <WiFi.h> // Is installed automatically. Don't install additional libs
#include <ArduinoMqttClient.h> // Has to be installed manually
#include <esp_now.h>
#include "arduino_secrets.h" // Local file with secrets
#include "probeMax.h" // Unified max4466 probe code
#include "time.h" // For Timestamps NTP


// This sketch is executed on the Edge-Device.
// It connects to WiFi and gives all sensor data from the other ESPs to the MQTT server.
// Sensor data is being captured locally but also received from the other ESPs over ESP-Now.

// Mac-Adresses:
// ESP-1 (Edge):  94:54:C5:E8:A5:DC -> Unchanged
// ESP-2:         94:54:C5:E8:BC:40 -> DE:AD:C0:DE:00:02
// ESP-3:         D4:8C:49:69:D5:74 -> DE:AD:C0:DE:00:03
// ESP-4:         D4:8C:49:6A:EC:24 -> DE:AD:C0:DE:00:04

char ssid[] = SECRET_SSID;    // your network SSID (name)
char pass[] = SECRET_PASS;    // your network password (use for WPA, or use as key for WEP)

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
int count = 0;

// ESP-Now
uint8_t empfaengerMac[] = {0xDE, 0x8C, 0x49, 0x69, 0xD5, 0x74};
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
  uint16_t error; // Error = Number of failed messages
} struct_message; // Typedef
uint16_t failedTransmissionCounter = 0;

// Collect Data
uint16_t collectEsp[4][10];
int countEspTicks = 0; 

void setup() {
  // Serial Setup
  Serial.begin(115200);

  // Connect to WiFi
  /*Serial.print("Attempting to connect to WPA SSID: ");
  Serial.println(ssid);
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    // failed, retry
    Serial.print(".");
    delay(5000);
  }
  Serial.println("You're connected to the network");
  Serial.println();*/

  // ESP-NOW
  WiFi.mode(WIFI_STA);
  while (!(WiFi.STA.started())) {
    delay(100);
  }

  // ESP-Now
  esp_now_init();
  esp_now_register_recv_cb(onReceive);
}

void loop() {
    for (int i = 0; i < 4; i++){
    collectEsp[i][countEspTicks] = 5000;
  }
  unsigned long startProbeMillis = millis(); // Each measure and sending cycle will take exactly 100ms
  uint16_t peakToPeak = probeMax4466();

  //Serial.println(peakToPeak);
  Serial.print("Reference:");
  Serial.print("4095");
  
  Serial.print(",Local:");
  Serial.println(peakToPeak);

  collectEsp[0][countEspTicks] = peakToPeak;

  // Non-blocking wait
  while((startProbeMillis + 100) > millis()){
    ; // Just chill here for the duration of 100ms
  }
  
  countEspTicks++;
    if (countEspTicks >= 10)
    countEspTicks = 0;
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
  Serial.printf("%u-Error:%u\n", identifier, incomingData.error);

  collectEsp[identifier - 1][countEspTicks] = incomingData.audio;
}

void sendMqtt(){
  configTime(0, 0, "de.pool.ntp.org");
  time(nullptr);
}

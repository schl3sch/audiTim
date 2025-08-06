// Installation instructions for the ESP32-Board
// https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/

// Select ESP32 Dev Module as your board

// Libraries:
// ArduinoMqttClient by Arduino@0.1.8
// ArduinoJson by Benoit@7.4.2

#include <WiFi.h> // Is installed automatically. Don't install additional libs
#include <ArduinoMqttClient.h> // Has to be installed manually
#include <esp_now.h>
#include "../arduino_secrets.h" // Local file with secrets
#include "../probeMax.h" // Unified max4466 probe code
//#include "../inmp441.h" // I2S Microphone
#include "time.h" // For Timestamps NTP
#include <ArduinoJson.h> // For MQTT Json
//#include "esp_wpa2.h" // For PEAP StudentenWlan


// This sketch is executed on the Edge-Device.
// It connects to WiFi and gives all sensor data from the other ESPs to the MQTT server.
// Sensor data is being captured locally but also received from the other ESPs over ESP-Now.

// Mac-Adresses:
// ESP-1 (Edge):  94:54:C5:E8:A5:DC -> Unchanged
// ESP-2:         94:54:C5:E8:BC:40 -> DE:AD:C0:DE:00:02
// ESP-3:         D4:8C:49:69:D5:74 -> DE:AD:C0:DE:00:03
// ESP-4:         D4:8C:49:6A:EC:24 -> DE:AD:C0:DE:00:04
// Liste der Sender-MACs (ESP-2, ESP-3, ESP-4):
uint8_t senderMacDefault[] = {0xDE,0xAD,0xC0,0xDE,0x00,0x00};

// Hilfs-Struct für Kanal-Info
typedef struct {
  uint8_t channel; // 1–13
} channel_msg_t;


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
uint8_t empfaengerMac[] = {0xDE, 0x8C, 0x49, 0x69, 0xD5, 0x74};
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
  uint16_t error; // Error = Number of failed messages
} struct_message; // Typedef
uint16_t failedTransmissionCounter = 0;
uint8_t channelInfo = 0;  
int targetChannel = 1; 

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

  // Connect to enterprise WiFi
  //connectToStudentenWlan();
  connectWPA2();

  // Connect to MQTT
  connectMqtt();

  // Find target channel
  findTargetChannel();
  channelInfo = targetChannel; 
  
  // ESP-Now
  esp_now_init();
  esp_now_register_recv_cb(onReceive);

  SenderAsPeers(); // Add all senders as peers
  sendCurrentChannelToSender();
  // CHANNEL ÄNDERUNG NOCH NICHT IMPLEMENTIERT
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
  Serial.printf("%u-Error:%u\n", identifier, incomingData.error);
  collectEsp[identifier - 1][countEspTicks] = incomingData.audio;
}

void SenderAsPeers(){
  for (uint8_t i = 2; i < 5; ++i) {
    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, senderMacDefault[5]=i, 6);
    peerInfo.channel = 0;             // 0 = aktueller Kanal
    peerInfo.encrypt = false;
    esp_err_t err = esp_now_add_peer(&peerInfo);
    Serial.printf("Peer %u add: %s\n", i+1, err == ESP_OK ? "OK" : "FAIL");
  }
}

void sendCurrentChannelToSender() {
  channel_msg_t msg;
  msg.channel = channelInfo;

  for (uint8_t i = 2; i < 5; ++i) {
    esp_err_t res = esp_now_send(senderMacDefault[5]=i, (uint8_t*)&msg, sizeof(msg));
    Serial.printf("ESP-NOW sending to MAC-Ending: ", i ,
     "\n");
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
  if (WiFi.status() != WL_CONNECTED) {
    connectWPA2();
  }
  if (!mqttClient.connected()) {
    if (WiFi.status() != WL_CONNECTED) {
        connectWPA2();
    }
    mqttClient.stop();
    connectMqtt();
  }

  mqttClient.beginMessage(topic);
  mqttClient.println(jsonString);
  mqttClient.endMessage();
  doc.clear();
}

void findTargetChannel() {
  WiFi.mode(WIFI_STA); // Muss vor dem Scan gesetzt sein
  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++) {
    if (WiFi.SSID(i) == "AI401") {
      targetChannel = WiFi.channel(i);
      Serial.printf("SSID AI401 gefunden auf Kanal %u\n", targetChannel);
      break;
    }
  }
}

/*void connectToStudentenWlan(){
  WiFi.disconnect(true); // Disconnect before setup
  WiFi.mode(WIFI_STA); // Mandatory for ESP-Now

  // WPA2 Enterprise config
  esp_wifi_sta_wpa2_ent_set_identity((uint8_t *)SECRET_USERNAME, strlen(SECRET_USERNAME));
  esp_wifi_sta_wpa2_ent_set_username((uint8_t *)SECRET_USERNAME, strlen(SECRET_USERNAME));
  esp_wifi_sta_wpa2_ent_set_password((uint8_t *)SECRET_USERPASS, strlen(SECRET_USERPASS));
  esp_wpa2_config_t config = WPA2_CONFIG_INIT_DEFAULT();
  esp_wifi_sta_wpa2_ent_enable(&config);
  
  // Start connection
  WiFi.begin("Studenten WLAN");
  
  while (WiFi.status() != WL_CONNECTED) {
    // failed, retry
    Serial.print(".");
    delay(500);
  }
  Serial.println("You're connected to the network");
}*/

void connectWPA2(){
  WiFi.disconnect(true); // Disconnect before setup
  WiFi.mode(WIFI_STA); // Mandatory for ESP-Now
  // Start connection
  WiFi.begin(ssid, pass);
  
  while (WiFi.status() != WL_CONNECTED) {
    // failed, retry
    Serial.print(".");
    delay(500);
  }
  Serial.println("You're connected to the network");
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
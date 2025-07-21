#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>

// This sketch is being executed on the 3 ESPs wich are not connected to wifi.
// They only gather sound values and send them to the Edge-Device using ESP-Now

// Hardwired Mac-Adresses:
// ESP-1 (Edge):  94:54:C5:E8:A5:DC
// ESP-2:         94:54:C5:E8:BC:40
// ESP-3:         D4:8C:49:69:D5:74
// ESP-4:         D4:8C:49:6A:EC:24

// Dependning on the builtin Mac a custom one is assigned
uint8_t edgeDeviceMac[] = {0x94, 0x54, 0xC5, 0xE8, 0xA5, 0xDC};
uint8_t myMac[] = {0xDE, 0xAD, 0xC0, 0xDE, 0x00, 0x00}; // Will get changed based on the ESP; myMac[5] can be used as identifier

// Standard channel should be 1 but could change
int targetChannel = 1;

// Variables for controlling LED
const int LED_PIN = 2;
bool ledStatus = false; // false - LOW; true - HIGH

// ESP-Now
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
  uint16_t error; // Error = Number of failed messages
} struct_message; // Typedef
uint16_t failedTransmissionCounter = 0;
struct_message myData; // Create a struct_message called myData

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  while (!(WiFi.STA.started())) {
    delay(100);
  }

  // Make LED blinkable
  pinMode(LED_PIN, OUTPUT);
  
  // Scan for WiFi networks
  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++) {
    if (WiFi.SSID(i) == "AI401") {
      targetChannel = WiFi.channel(i);// Set channel to the same as AI401
      break;
    }
  }

  // Set the Wi-Fi channel to match the edge device
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(targetChannel, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);

  selectMac();
  if(myMac[5] != 0){
    esp_wifi_set_mac(WIFI_IF_STA, myMac);
  }

  esp_now_init();

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, edgeDeviceMac, 6);
  peerInfo.channel = 0; // Use the same channel as device is on
  peerInfo.encrypt = false;

  esp_now_add_peer(&peerInfo);
  esp_now_register_send_cb(onSent);
}

void loop() {
  Serial.print(myMac[5]);
  delay(1000);
}

void onSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("Send status: ");
  if(status == ESP_NOW_SEND_SUCCESS && ledStatus == false){
    digitalWrite(LED_PIN, HIGH);
    ledStatus = true;
  }
  else if(status != ESP_NOW_SEND_SUCCESS){
    failedTransmissionCounter++; // Hopefully this doesn't overflow to quickly
    if(ledStatus){
      digitalWrite(LED_PIN, LOW);
      ledStatus = false;
    }
  }
}

// This function recognizes on wich ESP the code is being executed and changes MAC/Identifier accordingly
void selectMac(){
  uint8_t originalMac[6];
  WiFi.macAddress(originalMac);
  switch(originalMac[5]){
    case 0x40:
      myMac[5] = 0x02;
      break;
    case 0x74:
      myMac[5] = 0x03;
      break;
    case 0x24:
      myMac[5] = 0x04;
      break;      
  }
}



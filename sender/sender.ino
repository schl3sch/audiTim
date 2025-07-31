// Installation instructions for the ESP32-Board
// https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/

// Select ESP32 Dev Module as your board

#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include "../probeMax.h"
#include "../inmp441.h"

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

// ESP-Now
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
  uint16_t error; // Error = Number of failed messages since last success
} struct_message; // Typedef
uint16_t failedTransmissionCounter = 0;
struct_message myData; // Create a struct_message called myData

void setup() {
  Serial.begin(115200);

  // INMP441 setup I2S
  /*i2s_install();
  i2s_setpin();
  i2s_start(I2S_PORT);
  delay(500);*/

  WiFi.mode(WIFI_STA);
  while (!(WiFi.STA.started())) {
    delay(100);
  }
  
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
  unsigned long startProbeMillis = millis(); // Each measure and sending cycle will take exactly 100ms
  uint16_t peakToPeak = probeMax4466();
  //Serial.print("Zero:0,Max:4095,Mic:");
  //Serial.println(peakToPeak);

  // Prepare ESP-NOW message
  myData.audio = peakToPeak;
  myData.error = failedTransmissionCounter;

  esp_now_send(edgeDeviceMac, (uint8_t *) &myData, sizeof(myData));

  // Non-blocking wait
  while((startProbeMillis + 100) > millis()){
    ; // Just chill here for the duration of 100ms
  }
  //inmpLoop();
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

void onSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  if(status == ESP_NOW_SEND_SUCCESS && failedTransmissionCounter){
    failedTransmissionCounter = 0; // Reset counter on succesfull transmission
  }
  else if(status != ESP_NOW_SEND_SUCCESS){
    failedTransmissionCounter++; // Hopefully this doesn't overflow to quickly
  }
}

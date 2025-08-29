// Installation instructions for the ESP32-Board
// https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/

// Select ESP32 Dev Module as your board

#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include "../probeMax.h"
#include "../arduino_secrets.h" // Local file with secrets
//#include "../inmp441.h" // I2S Microphone

// This sketch is being executed on the 3 ESPs wich are not connected to wifi.
// They only gather sound values and send them to the Edge-Device using ESP-Now

// Mac-Adresses:
// ESP-1:         94:54:C5:E8:A5:DC -> DE:AD:C0:DE:00:01
// ESP-2:         94:54:C5:E8:BC:40 -> DE:AD:C0:DE:00:02
// ESP-3:         D4:8C:49:69:D5:74 -> DE:AD:C0:DE:00:03
// ESP-4:         D4:8C:49:6A:EC:24 -> DE:AD:C0:DE:00:04
// ESP-5: (Edge)  D4:8C:49:69:A2:F0 -> unchanged

// Dependning on the builtin Mac a custom one is assigned
uint8_t edgeDeviceMac[] = {0xD4, 0x8C, 0x49, 0x69, 0xA2, 0xF0};
uint8_t myMac[] = {0xDE, 0xAD, 0xC0, 0xDE, 0x00, 0x00}; // Will get changed based on the ESP; myMac[5] can be used as identifier

const char ssid[] = SECRET_SSID;    // your network SSID

// Standard channel should be 1 but could change
int targetChannel = 1;

// ESP-Now
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
} struct_message; // Typedef
struct_message myData; // Create a struct_message called myData

unsigned long failedTransmissionCounter  = 0;

void setup() {
  WiFi.mode(WIFI_STA);
  while (!(WiFi.STA.started())) {
    delay(100);
  } 

  setMac(); // Change MAC adress
  findNewChannel(); // Connect to wifi
}

void loop() {
  unsigned long startProbeMillis = millis(); // Each measure and sending cycle will take exactly 100ms
  uint16_t peakToPeak = probeMax4466();

  // Prepare ESP-NOW message
  myData.audio = peakToPeak;
  esp_now_send(edgeDeviceMac, (uint8_t *) &myData, sizeof(myData));

  // Non-blocking wait
  while((startProbeMillis + 100) > millis()){
    ; // Just chill here for the duration of 100ms
  }

  if(failedTransmissionCounter >= 10){
    findNewChannel();
  }
}

// This function recognizes on wich ESP the code is being executed and changes MAC/Identifier accordingly
void setMac(){
  uint8_t originalMac[6];
  WiFi.macAddress(originalMac);
  switch(originalMac[5]){
    case 0xDC:
      myMac[5] = 0x01;
      break;
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

  if(myMac[5] != 0){
    esp_wifi_set_mac(WIFI_IF_STA, myMac); // Change local MAC-Adress
  }
}

// Callback espNOW when message has been sent
void onSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  if(status == ESP_NOW_SEND_SUCCESS){
    failedTransmissionCounter = 0;
  }
  else if(status != ESP_NOW_SEND_SUCCESS){
    failedTransmissionCounter++;
  }
}

void findNewChannel(){
  // Scan for WiFi networks
  int n = WiFi.scanNetworks();
  delay(100);  // Taktischer Delay
  for (int i = 0; i < n; i++) {
    if (WiFi.SSID(i) == ssid) {
      targetChannel = WiFi.channel(i);// Set channel to the same as Edge
      break;
    }
  }
  // Aktuellen Channel setzen
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(targetChannel, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);

  // ESP-Now neu starten, da Kanal sich geändert hat
  esp_now_deinit();
  esp_now_init();

  // Peer wieder hinzufügen
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, edgeDeviceMac, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  esp_now_add_peer(&peerInfo);

  // Callback erneut registrieren
  esp_now_register_send_cb(onSent);
}

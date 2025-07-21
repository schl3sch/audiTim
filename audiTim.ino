// Installation instructions for the ESP32-Board
// https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/

// Select ESP32 Dev Module as your board

// Libraries:
// ArduinoMqttClient@0.1.8

#include <WiFi.h> // Is installed automatically. Don't install additional libs
#include <ArduinoMqttClient.h> // Has to be installed manually
#include <esp_now.h>
#include "arduino_secrets.h" // Local file with secrets

char ssid[] = SECRET_SSID;    // your network SSID (name)
char pass[] = SECRET_PASS;    // your network password (use for WPA, or use as key for WEP)

// MQTT Settings etc...
WiFiClient espClient;
MqttClient mqttClient(espClient);
int        port     = 1883;
const char topic[]  = "arduino/simple";
const char MQTT_USER[] = "haenisch";
const char MQTT_PASS[] = "geheim";
const char broker[] = "aicon.dhbw-heidenheim.de"; // changed?? TODO

const long interval = 1000;
unsigned long previousMillis = 0;

int count = 0;

//MAX4466
const unsigned long sampleWindow = 50;  // Sample window width in mS (50 mS = 20Hz)
int const AMP_PIN = 32;       // Analog Pin on the ESP32
uint16_t maxAnalogRead = 4095; // For the ESP32 0-4095
uint16_t sample;

// Setup for DFRobot Sound Level Meter V2.0
#define SoundSensorPin 33  // Analog Pin on the ESP32
#define VREF 3.3           // ESP32 ADC reference voltage

// ESP-NOW
uint8_t empfaengerMac[] = {0xD4, 0x8C, 0x49, 0x69, 0xD5, 0x74};
typedef struct struct_message {
  uint16_t audio; // 0-4095 Mic volume
  uint16_t error; // Error = Number of failed messages
} struct_message; // Typedef
uint16_t failedTransmissionCounter = 0;
struct_message myData; // Create a struct_message called myData

void setup() {
  // Serial Setup
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for native USB port only
  }

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
  esp_now_init();
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, empfaengerMac, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Peer hinzufügen fehlgeschlagen");
    return; // Leave Setup()
  }

  esp_now_register_send_cb(onSent);
}


void loop() {
  unsigned long startProbeMillis = millis(); // Each measure and sending cycle will take exactly 100ms

  uint16_t peakToPeak = probeMax4466();

  // Gravity Mic
  int rawADC = analogRead(SoundSensorPin);
  float voltageRaw = rawADC * (VREF / 4095.0); // 12-bit ADC: max 4095; Mapping 0.6V to 2.6V
  // float dB_estimate = voltage * 50.0; // Kalibrierte Multiplikation für lineare Zuordnung
  float voltageCalc = voltageRaw - 0.6;

  Serial.println(peakToPeak);
  Serial.print("Reference-5V:");
  Serial.print("5");
  Serial.print(",Reference-2.6V:");
  Serial.print("2.6");
  
  Serial.print(",MAX4466:");
  double volts = (peakToPeak * 5.0) / maxAnalogRead;  // convert to volts
  Serial.print(volts);

  Serial.print(",Gravity:");
  Serial.println(voltageCalc);

  // Prepare ESP-NOW message
  myData.audio = peakToPeak;
  myData.error = failedTransmissionCounter;

  esp_now_send(empfaengerMac, (uint8_t *) &myData, sizeof(myData));

  while((startProbeMillis + 100) < millis()){
    ; // Just chill here for the duration of 100ms
  }
}

void onSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("Send status: ");
  if(status == ESP_NOW_SEND_SUCCESS){
    Serial.println("✅");
  }else{
    failedTransmissionCounter++;
    Serial.println("❌");
  }
}

uint16_t probeMax4466(){
  unsigned long startMillis = millis(); // Start of sample window
  uint16_t signalMax = 0;
  uint16_t signalMin = maxAnalogRead;

  // collect data for 50 mS
  while (millis() - startMillis < sampleWindow)
  {
    sample = analogRead(AMP_PIN);
    if (sample < maxAnalogRead)  // toss out spurious readings
    {
      if (sample > signalMax)
      {
        signalMax = sample;  // save just the max levels
      }
      else if (sample < signalMin)
      {
        signalMin = sample;  // save just the min levels
      }
    }
  }
  return(signalMax - signalMin);  // max - min = peak-peak amplitude
}


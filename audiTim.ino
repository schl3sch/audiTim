// Installation instructions for the ESP32-Board
// https://randomnerdtutorials.com/installing-the-esp32-board-in-arduino-ide-windows-instructions/

// Select ESP32 Dev Module as your board

// Libraries:
// ArduinoMqttClient@0.1.8

#include <WiFi.h> // Is installed automatically. Don't install additional libs
#include <ArduinoMqttClient.h> // Has to be installed manually
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
const char broker[] = "10.43.100.127";

const long interval = 1000;
unsigned long previousMillis = 0;

int count = 0;

// Pin to test LED
const int LED_PIN = 2;// For the dev boards

void setup() {
  // Initialize the LED pin as an output:
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  // Turn the LED on:
  digitalWrite(LED_PIN, HIGH);
  delay(1000);

  // Turn the LED off:
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}

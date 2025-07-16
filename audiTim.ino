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
const char broker[] = "aicon.dhbw-heidenheim.de"; // changed?? TODO

const long interval = 1000;
unsigned long previousMillis = 0;

int count = 0;

//MAX4466
const unsigned long sampleWindow = 50;  // Sample window width in mS (50 mS = 20Hz)
int const AMP_PIN = 13;       // Preamp output pin connected to GPIO13
unsigned int maxAnalogRead = 4095; // For the ESP32 0-4095
unsigned int sample;

// Setup for DFRobot Sound Level Meter V2.0
#define SoundSensorPin 12  // Analog input pin
#define VREF 3.3           // ESP32 ADC reference voltage

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for native USB port only
  }
  /*
  Serial.print("Attempting to connect to WPA SSID: ");
  Serial.println(ssid);
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    // failed, retry
    Serial.print(".");
    delay(5000);
  }

  Serial.println("You're connected to the network");
  Serial.println();*/
}


void loop() {
  unsigned long startMillis = millis(); // Start of sample window
  unsigned int peakToPeak = 0;   // peak-to-peak level

  unsigned int signalMax = 0;
  unsigned int signalMin = maxAnalogRead;

  // collect data for 50 mS and then plot data
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

  int rawADC = analogRead(SoundSensorPin);
  float voltageRaw = rawADC * (VREF / 4095.0); // 12-bit ADC: max 4095; Mapping 0.6V to 2.6V
  // float dB_estimate = voltage * 50.0; // Kalibrierte Multiplikation für lineare Zuordnung
  float voltageCalc = voltageRaw - 0.6;

  peakToPeak = signalMax - signalMin;  // max - min = peak-peak amplitude
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
}

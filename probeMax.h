#ifndef PROBEMAX_H
#define PROBEMAX_H

//MAX4466
const unsigned long sampleWindow = 50;  // Sample window width in mS (50 mS = 20Hz)
int const AMP_PIN = 32;       // Analog Pin on the ESP32
// Also used to ignore unimportant peak values; Decrease number if needed
uint16_t maxAnalogRead = 4000; // For the ESP32 0-4095
uint16_t sample;

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

#endif
#include <esp_now.h>
#include <WiFi.h>

void onReceive(const esp_now_recv_info* info, const uint8_t* data, int len) {
  Serial.print("Data:");
  for (int i = 0; i < len; i++) {
    Serial.print((char)data[i]);
  }
  Serial.println(",Reference:4095");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  esp_now_init();

  esp_now_register_recv_cb(onReceive); // neue API nutzt esp_now_recv_info*

  Serial.print("Meine MAC: ");
  Serial.println(WiFi.macAddress());
}

void loop() {
  // tut nichts
}

// PYRA Day 1 - DHT11 CSV over serial at 115200 baud
// Wiring: DHT11 S -> GPIO4, + -> 3V3, - -> GND
// Output: timestamp_ms,temp_c,humidity_pct, 2 s interval
#include <Arduino.h>
#include <DHT.h>

#define DHTPIN  4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

const uint32_t PERIOD_MS = 2000;

void setup() {
  Serial.begin(115200);
  delay(500);
  dht.begin();
  Serial.println();
  Serial.println("timestamp_ms,temp_c,humidity_pct");
}

void loop() {
  float humidity_pct = dht.readHumidity();
  float temp_c       = dht.readTemperature();
  uint32_t ts_ms     = millis();
  if (isnan(humidity_pct) || isnan(temp_c)) {
    Serial.printf("%lu,,\n", ts_ms);
  } else {
    Serial.printf("%lu,%.1f,%.1f\n", ts_ms, temp_c, humidity_pct);
  }
  delay(PERIOD_MS);
}

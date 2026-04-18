# PYRA Validation Sprint — Day 1: Plumbing

## What you're building tonight

A working end-to-end data path: **ESP32 → Wi-Fi → MQTT (Mosquitto on Pi) → Telegraf → InfluxDB → Grafana**. By bedtime, a Grafana dashboard on the Pi is showing uptime and chip temperature from an ESP32 on your bench, refreshing every ~10 s.

**Evening budget:** 2–4 hours, most of it install time + Grafana fiddling.

**PYRA question being answered:** can we stand the full data-plumbing spine up on the hardware already in the house, using a topic schema that will survive the swap to LoRaWAN/CBOR later without breaking Grafana or the ingest worker?

---

## What you have in the room

- [ ] Raspberry Pi (assumed Pi 4 or 5, RPi OS Bookworm 64-bit, on the same LAN as your ESP32).
- [ ] ESP32 dev board (ESP32 or ESP32-S3; WROOM / DevKitC / Heltec class all fine).
- [ ] USB cable for the ESP32 + Arduino IDE 2.x on your workstation.
- [ ] A Wi-Fi network both can reach, and the Pi's IP address.

You do **not** need any sensor wired to the ESP32 tonight. We're using the chip's onboard temperature sensor and an uptime counter as the test payload so the sensor choice can't confound a plumbing failure.

---

## 1 · Pi — system prep (~10 min)

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y curl gnupg apt-transport-https software-properties-common
hostname -I              # note the Pi's LAN IP
systemctl is-active avahi-daemon
ping -c2 pyra-pi.local   # pick whatever your Pi's mDNS name is
```

If `pyra-pi.local` doesn't resolve, use the raw IP from `hostname -I` anywhere the doc says `pyra-pi.local`.

---

## 2 · Mosquitto (~5 min)

```bash
sudo apt install -y mosquitto mosquitto-clients
sudo systemctl enable --now mosquitto
```

By default Mosquitto listens only on localhost. Open it to the LAN with password auth. Create `/etc/mosquitto/conf.d/pyra-sprint.conf`:

```conf
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/pyra_passwd
```

Create the `pyra` user (pick any password; it gets hardcoded in the ESP32 sketch tonight — fine for a sprint):

```bash
sudo mosquitto_passwd -c /etc/mosquitto/pyra_passwd pyra
sudo chown mosquitto:mosquitto /etc/mosquitto/pyra_passwd
sudo chmod 640 /etc/mosquitto/pyra_passwd
sudo systemctl restart mosquitto
```

**Smoke test.** Terminal A on the Pi:

```bash
mosquitto_sub -h localhost -u pyra -P 'YOUR_PW' -t 'pyra/#' -v
```

Terminal B anywhere on the LAN:

```bash
mosquitto_pub -h pyra-pi.local -u pyra -P 'YOUR_PW' -t 'pyra/test' -m 'hello'
```

Terminal A should print `pyra/test hello`. If it doesn't, stop and debug — don't proceed.

---

## 3 · InfluxDB 2.x (~10 min)

```bash
curl -fsSL https://repos.influxdata.com/influxdata-archive.key \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/influxdata-archive.gpg
echo "deb https://repos.influxdata.com/debian stable main" \
  | sudo tee /etc/apt/sources.list.d/influxdata.list
sudo apt update
sudo apt install -y influxdb2 telegraf
sudo systemctl enable --now influxdb
```

Open `http://pyra-pi.local:8086`. First-run wizard:

- **Username:** `pyra`
- **Password:** (your pick)
- **Organization:** `pyra`
- **Initial bucket:** `pyra-sprint`

Then *Load Data → API Tokens → Generate API Token → All-Access Token*. Copy the token — you'll paste it into Telegraf next.

---

## 4 · Telegraf — MQTT → InfluxDB bridge (~10 min)

Drop `/etc/telegraf/telegraf.d/pyra-sprint.conf`:

```toml
[agent]
  interval = "10s"
  flush_interval = "10s"

[[inputs.mqtt_consumer]]
  name_override = "pyra_tel"
  servers       = ["tcp://localhost:1883"]
  topics        = ["pyra/v1/node/+/tel"]
  qos           = 0
  username      = "pyra"
  password      = "YOUR_PW"
  data_format   = "json"
  tag_keys      = ["node", "schema"]

[[outputs.influxdb_v2]]
  urls         = ["http://localhost:8086"]
  token        = "YOUR_INFLUX_ALL_ACCESS_TOKEN"
  organization = "pyra"
  bucket       = "pyra-sprint"
```

Day 1 only needs the `tel` topic. Days 2–6 add `hb`, `alert`, `evt` as separate `[[inputs.mqtt_consumer]]` blocks with their own `name_override`.

Restart and watch the log:

```bash
sudo systemctl restart telegraf
sudo journalctl -u telegraf --since '2 minutes ago' | tail -30
```

Look for MQTT connect errors or JSON-parse errors. Silence is good.

---

## 5 · Grafana (~10 min)

```bash
curl -fsSL https://apt.grafana.com/gpg.key \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/grafana.gpg
echo "deb https://apt.grafana.com stable main" \
  | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt update
sudo apt install -y grafana
sudo systemctl enable --now grafana-server
```

Open `http://pyra-pi.local:3000`. Login `admin` / `admin`, set a new password.

Add a data source:

- **Type:** InfluxDB
- **Query language:** Flux *(not InfluxQL — this is the most common Day-1 trap)*
- **URL:** `http://localhost:8086`
- **Organization:** `pyra`
- **Token:** (same all-access token)
- **Default bucket:** `pyra-sprint`

Click **Save & Test** — should say *"datasource is working"*.

Leave the dashboard blank; we'll build one at the end.

---

## 6 · MQTT topic schema v0.1 (read before writing firmware)

Topic taxonomy — `pyra/v1/node/{device_id}/{class}`:

| Class | Direction | Purpose |
|---|---|---|
| `tel` | node → server | Routine telemetry (sprint: every 10 s; production: every 5–15 min) |
| `hb` | node → server | Heartbeat, no sensor payload (production: hourly) |
| `alert` | node → server | Threshold-exceeded event; duplicated across radios |
| `evt` | node → server | One-off events (boot, arm, OTA done, install confirmed) |
| `cmd` | server → node | Downlink — node subscribes, doesn't publish |

**Payload format.** Sprint uses JSON so `mosquitto_sub` stays human-readable. Production LoRaWAN uses CBOR with integer keys to save bytes; **field names and nesting stay identical**. The skeleton we're growing through the week:

```json
{
  "ts": 1713400000,
  "node": "pyra-dev-001",
  "schema": "v1",
  "sys":   {"uptime_s": 12345, "rssi_dbm": -84, "chip_t_c": 45.2},
  "air":   {"t_c": null, "rh": null, "p_hpa": null},
  "soil":  {"m_shallow": null, "m_deep": null, "t_shallow": null, "t_deep": null},
  "fuel":  {"duff_m": null},
  "fire":  {"pm25": null, "pm10": null, "voc": null, "ir_max": null, "lightning_km": null},
  "wind":  {"speed_ms": null, "dir_deg": null},
  "rain":  {"mm": null},
  "imu":   {"tilt_deg": null, "tamper": false},
  "power": {"batt_v": null, "solar_w": null},
  "gnss":  {"lat": null, "lon": null, "fix": null}
}
```

Day 1 populates `sys` only. Day 2 adds `air`. And so on. Null subtrees stay out of the payload for now — no need to include everything every message.

---

## 7 · ESP32 — hello-world firmware (~30 min)

**Arduino IDE setup.**

1. *File → Preferences → Additional Board Manager URLs:*  
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. *Tools → Board → Boards Manager → ESP32 by Espressif Systems → install*.
3. *Tools → Board → ESP32 Arduino →* pick your variant (*ESP32 Dev Module*, *Heltec WiFi LoRa 32(V3)*, etc.).
4. *Sketch → Include Library → Manage Libraries:* install **PubSubClient** (Nick O'Leary) and **ArduinoJson** (Benoit Blanchon, v7.x).

**Sketch** — new file, paste, edit the four config strings, upload:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- CONFIG (edit these four lines) -----------------------------------------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASS";
const char* MQTT_HOST = "pyra-pi.local";      // or raw IP from hostname -I
const char* MQTT_PASS = "YOUR_PW";
// ----------------------------------------------------------------------------

const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER    = "pyra";
const char* NODE_ID      = "pyra-dev-001";
const uint32_t PUBLISH_MS = 10000;

WiFiClient wifi;
PubSubClient mqtt(wifi);
char topicTel[96];

void connectWiFi() {
  Serial.printf("WiFi %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(250); Serial.print('.'); }
  Serial.printf(" ok ip=%s\n", WiFi.localIP().toString().c_str());
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.printf("MQTT %s:%u ", MQTT_HOST, MQTT_PORT);
    String cid = String("pyra-") + NODE_ID + "-" + String((uint32_t)esp_random(), HEX);
    if (mqtt.connect(cid.c_str(), MQTT_USER, MQTT_PASS)) {
      Serial.println("ok");
    } else {
      Serial.printf("rc=%d retry 2s\n", mqtt.state());
      delay(2000);
    }
  }
}

float chipTempC() {
#if CONFIG_IDF_TARGET_ESP32S3 || CONFIG_IDF_TARGET_ESP32S2 || CONFIG_IDF_TARGET_ESP32C3
  return temperatureRead();           // IDF provides this on newer targets
#else
  // Classic ESP32: coarse, drifts with load. Keep only as a relative trend.
  extern uint8_t temprature_sens_read();
  return (temprature_sens_read() - 32) / 1.8f;
#endif
}

void setup() {
  Serial.begin(115200);
  delay(200);
  snprintf(topicTel, sizeof(topicTel), "pyra/v1/node/%s/tel", NODE_ID);
  connectWiFi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  connectMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();

  static uint32_t last = 0;
  uint32_t now = millis();
  if (now - last < PUBLISH_MS) return;
  last = now;

  JsonDocument doc;
  doc["ts"]     = (uint32_t)(now / 1000);       // uptime stands in for wall-clock
  doc["node"]   = NODE_ID;
  doc["schema"] = "v1";
  JsonObject sys  = doc["sys"].to<JsonObject>();
  sys["uptime_s"] = (uint32_t)(now / 1000);
  sys["rssi_dbm"] = WiFi.RSSI();
  sys["chip_t_c"] = chipTempC();

  char buf[512];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  if (mqtt.publish(topicTel, (const uint8_t*)buf, n, false)) {
    Serial.printf("pub %s %u B\n", topicTel, (unsigned)n);
  } else {
    Serial.println("pub FAIL");
  }
}
```

Open Serial Monitor at 115200. You should see `WiFi ... ok`, `MQTT ... ok`, then a `pub` line every 10 s.

---

## 8 · End-of-evening checklist

All five must pass. If any one fails, fix it before calling Day 1 done — Day 2 depends on all of them.

- [ ] `mosquitto_sub -h localhost -u pyra -P 'YOUR_PW' -t 'pyra/v1/#' -v` on the Pi prints a JSON message every 10 s from the ESP32.
- [ ] `sudo journalctl -u telegraf --since '2 minutes ago' | grep -Ei 'error|refused|parse'` prints nothing alarming.
- [ ] InfluxDB UI → Data Explorer → Script editor:
  ```flux
  from(bucket: "pyra-sprint")
    |> range(start: -15m)
    |> filter(fn: (r) => r["_measurement"] == "pyra_tel")
    |> filter(fn: (r) => r["_field"] == "sys_uptime_s")
    |> last()
  ```
  returns a value matching your ESP32 uptime (±10 s).
- [ ] Grafana → New dashboard → New panel → InfluxDB data source → paste the same Flux query → visualization *Time Series*. You see `sys_uptime_s` climbing in a straight line.
- [ ] Add a second panel for `sys_chip_t_c`. You see ESP32 chip temperature (usually 30–60 °C indoor; noisy on classic ESP32 — normal).

---

## 9 · Known gotchas

| Symptom | Likely cause |
|---|---|
| `hostname -I` returns two IPs | Ethernet + Wi-Fi both up. Use the one on the same subnet as the ESP32. |
| Mosquitto refuses LAN connections | Password file owned by root instead of `mosquitto`, or listener line didn't take — `sudo systemctl status mosquitto` and check the log. |
| Telegraf `json parse error` | ESP32 publishing invalid JSON. `mosquitto_sub -v … | jq .` shows you the raw string. |
| Grafana panel "no data" | Data source defaulted to InfluxQL, not Flux. Edit data source, flip Query language. |
| ESP32 loops with `rc=-2` | Wrong MQTT password, or broker is localhost-only. Re-check §2 config. |
| Chip temp stuck at 53.33 °C | Classic ESP32 quirk when the hall sensor is idle. Harmless; use S3 for meaningful onboard T. |
| InfluxDB signup page says "already initialized" | You ran the wizard before — token is already minted. Log in and go to Data → API Tokens. |

---

## 10 · Tomorrow — Day 2 preview

Day 2 "weather" adds the first real kit sensors: kit DHT11 for T/RH (3.3 V safe, ESP32-friendly), kit photoresistor as a crude irradiance proxy, kit BMP180 for barometric pressure if yours has one. Payload gains the `air` subtree. We'll compare DHT11 readings against your phone weather app and a kitchen thermometer to set an initial trust rating — spoiler: DHT11 is going to be "skip — upgrade to SHT45" but we want to **see** it, not just say it.

Day 2 brief lands tomorrow morning.

---

**Done?** Ping me. **Broken?** Paste the failing step — most issues live in sections 2, 4, or 7.

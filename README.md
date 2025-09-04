# 🎧 audiTim – SE-Projekt Code-Repository
Dies ist das zentrale Code-Repository für unser Software-Engineering-Projekt **audiTim**.

📝 **👉 Projektdokumentation:**  
Alle Details zur Idee, Architektur, Technik und Ergebnissen befinden sich in der hier beiligenden Dokumentation:  
📎 ./Documentation/ProjektSe/dokumentation.pdf

## 🛠️ Projekt bauen
1. `.env` konfigurieren (siehe `template.env`)
2. Netzwerk erstellen:
    ```bash
    docker network create sensor-net
    ```
3. Container bauen und starten:
    ```bash
    docker compose up --build -d
    ```
4. In [NodeRed](http://localhost:1880) die InfluxNode konfigurieren
5. [Frontend](http://localhost:8081) öffnen

Ports:
- [Frontend](http://localhost:8081)
- [NodeRed](http://localhost:1880)
- [InfluxDB](http://localhost:8086)

## 📐 Programmierkonventionen
Bitte achtet auf folgende grundlegende Regeln im Projekt:

### Allgemein
-  Klare Projektstruktur: Trennung von `frontend`, `backend`, `firmware`, `tools` etc.
-  Sinnvolle Dateinamen, keine Leerzeichen oder Sonderzeichen
-  Kein Code ohne Nutzen: Altlasten & toten Code entfernen
-  sprechende englische Variablen-/Funktionsnamen

### Code-Stil
- **C++ (ESP32):**
  - Einrückung mit 2 Leerzeichen
  - CamelCase für Variablen und Funktionen
  - Funktionskommentare mit im Stil `CODE // Kommentar ` 
- **Python:**
  - PEP8-konform
  - Docstrings für alle Funktionen und Klassen
- **JavaScript/TypeScript:**
  - ESLint-konformer Stil
  - Klar benannte Funktionen & Kommentare bei komplexer Logik

### Code-Richtlinien
- **C++ (ESP32):**
  - Kein Serial.print in finalem Sketch (Braucht zu lange)
  - Kein \#define -> nur const (Einheitlich)
  - Kein while(!init){} (Nicht benötigt)
  - Funktion probeMax4466 muss in den Dateien identisch sein
  - Externe Bibliotheken müssen mit Version angegeben sein

## Testing
docker-compose -d -build --prod um tests in docker laufen zu lassen!

### E2E-Testing 
npx playwright install to install Browsers locally
npx playwright test to run tests
npx playwright test --ui for ui 
npx playwright test --headed for open Browser on testing
npx playwright codegen http://localhost:8081 for testgenerator im Durchlauf


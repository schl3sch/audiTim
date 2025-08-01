# 🎧 audiTim-Backend – SE-Projekt Code-Repository

Dies ist das zentrale Code-Repository für unser Software-Engineering-Projekt **audiTim**.

📝 **👉 Projektdokumentation:**  
Alle Details zur Idee, Architektur, Technik und Ergebnissen befinden sich im zugehörigen Doku-Repository:  
📎 [https://github.com/JD-GG/audiTim-Documentation.git](https://github.com/JD-GG/audiTim-Documentation.git)

## 📐 Programmierkonventionen und Git-Workflow
Alle Leitlinien befinden sich unter dem Haupt-Repository:
📎 [https://github.com/JD-GG/audiTim.git](https://github.com/JD-GG/audiTim.git)

### `.env` Datei befüllen

```env
# Node.js Client Config
INFLUX_TOKEN=XXXXX
INFLUX_ORG=XXXXX
INFLUX_BUCKET=XXXXX
INFLUX_URL=http://localhost:XXXXX
```

mit der node generateData.js dummy daten generieren
mit node index.js daten in die DB schreiben und abrufen

## Dev Notes
bitti ihn benutzi:
  docker compose down
  docker compose up --build -d

sonst eig nicht viel postman auf ihn geht: http://localhost:3000/api/generate

und mit ihm hier netz aufbauen: 
  docker network create sensor-net

kucki ob laufi:
  docker ps


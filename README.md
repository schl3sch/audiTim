# 🎧 audiTim – SE-Projekt Code-Repository

Dies ist das zentrale Code-Repository für unser Software-Engineering-Projekt **audiTim**.

📝 **👉 Projektdokumentation:**  
Alle Details zur Idee, Architektur, Technik und Ergebnissen befinden sich im zugehörigen Doku-Repository:  
📎 [https://github.com/JD-GG/audiTim-Documentation.git](https://github.com/JD-GG/audiTim-Documentation.git)

## 📐 Programmierkonventionen

Bitte achtet auf folgende grundlegende Regeln im Projekt:

### Allgemein

-  Klare Projektstruktur: Trennung von `frontend`, `backend`, `firmware`, `tools` etc.
-  Sinnvolle Dateinamen, keine Leerzeichen oder Sonderzeichen
-  Kein Code ohne Nutzen: Altlasten & toten Code entfernen
-  sprechende englische Variablen-/Funktionsnamen

### Code-Stil

- **C/C++ (ESP32):**
  - Einrückung mit 2 oder 4 Leerzeichen (einheitlich)
  - CamelCase für Variablen und Funktionen
  - Funktionskommentare mit `///` oder `/** */`  
- **Python:**
  - PEP8-konform
  - Docstrings für alle Funktionen und Klassen
- **JavaScript/TypeScript:**
  - ESLint-konformer Stil
  - Klar benannte Funktionen & Kommentare bei komplexer Logik

## 🔀 Git-Workflow (Feature-Branch-Modell)

Wir arbeiten mit einem **Feature-Branch-Modell**, um saubere und nachvollziehbare Entwicklung zu gewährleisten.

### Branches

- `main`: stabile, getestete Versionen
- `feature/<kurzer-namer>´: jeweiliger Feature-Branch
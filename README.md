# 📈 Aktienhandel Simulator

Ein einfacher, browserbasierter **Aktienhandel-Wirtschaftssimulator** als Schulprojekt von **Julian & Benni**.

## Beschreibung

Der Aktienhandel Simulator ermöglicht es, virtuell Aktien zu kaufen und zu verkaufen. Du startest mit **100 €** Startkapital und versuchst, durch cleveres Handeln deinen Gesamtwert zu steigern.

### Features

- 🏦 **Startgeld:** 100 €
- 📊 **5 fiktive Aktien:** TechCorp, GreenEnergy, FoodWorld, AutoDrive, MediHealth
- 🔄 **Live-Kurse:** Kurse schwanken alle 3 Sekunden zufällig
- 📈 **Kursdiagramm:** Interaktiver Kursverlauf pro Aktie (Canvas)
- 💼 **Portfolio-Übersicht:** Zeigt Besitz, Einkaufspreis und aktuellen Gewinn/Verlust
- 📝 **Transaktionshistorie:** Alle Käufe und Verkäufe werden protokolliert
- 💾 **Speichern:** Spielstand wird automatisch im Browser gespeichert (localStorage)
- 🔄 **Neu starten:** Reset-Button löscht den gespeicherten Fortschritt

## Starten

### Option 1 – Direkt öffnen
Einfach die Datei `index.html` in einem modernen Webbrowser öffnen.

### Option 2 – GitHub Pages
Das Projekt ist als statische Webseite konzipiert und kann direkt über **GitHub Pages** gehostet werden. Dazu im Repository-Einstellungen unter *Pages* den Branch `main` als Quelle auswählen.

## Projektstruktur

```
├── index.html   – Haupt-HTML-Seite
├── style.css    – Styling (dunkles Finanz-Theme)
├── script.js    – Spiellogik (Kurssimulation, Kauf/Verkauf, Chart)
└── README.md    – Projektbeschreibung
```

## Technologien

- Reines **HTML5 / CSS3 / JavaScript** (kein externes Framework)
- Canvas API für das Kursdiagramm
- localStorage für die Spielstand-Speicherung

---

© Julian & Benni

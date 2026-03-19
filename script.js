/**
 * script.js – Aktienhandel Simulator
 * Schulprojekt von Julian & Benni
 *
 * Enthält die gesamte Spiellogik:
 *  - Aktienkurse und deren Simulation
 *  - Kauf- und Verkaufslogik
 *  - Portfolio-Verwaltung
 *  - Kursdiagramm (Canvas)
 *  - Speichern / Laden via localStorage
 */

'use strict';

/* ============================================================
   KONSTANTEN & STARTWERTE
   ============================================================ */

/** Startgeld des Spielers in Euro */
const STARTGELD = 100;

/** Intervall in Millisekunden, in dem Kurse aktualisiert werden */
const KURS_INTERVALL_MS = 3000;

/** Wie viele Kurspunkte pro Aktie in der Historie gespeichert werden */
const MAX_HISTORIE = 60;

/** Fiktive Aktien mit Name, Kürzel und Startkurs */
const AKTIEN_DEFINITIONEN = [
  { id: 'tech',    name: 'TechCorp',    symbol: 'TCR',  startkurs: 24.50, volatilitaet: 0.035 },
  { id: 'green',   name: 'GreenEnergy', symbol: 'GNE',  startkurs: 18.20, volatilitaet: 0.030 },
  { id: 'food',    name: 'FoodWorld',   symbol: 'FDW',  startkurs: 12.00, volatilitaet: 0.020 },
  { id: 'auto',    name: 'AutoDrive',   symbol: 'ADR',  startkurs: 31.75, volatilitaet: 0.040 },
  { id: 'medi',    name: 'MediHealth',  symbol: 'MDH',  startkurs: 15.90, volatilitaet: 0.025 },
];

/* ============================================================
   SPIELZUSTAND
   ============================================================ */

/** Aktueller Spielzustand – wird in localStorage persistiert */
let zustand = ladeZustand();

/**
 * Gibt einen frischen Anfangszustand zurück.
 * @returns {Object} Startzustand
 */
function startzustand() {
  const aktien = {};
  AKTIEN_DEFINITIONEN.forEach(def => {
    aktien[def.id] = {
      kurs: def.startkurs,
      aenderung: 0,         // absolute Änderung zum Vorkurs
      aenderungProzent: 0,  // prozentuale Änderung
      historie: [def.startkurs],
    };
  });
  return {
    geld: STARTGELD,
    depot: {},   // { aktienId: { anzahl, kaufkurs } }
    aktien,
    log: [],     // Transaktionshistorie
  };
}

/* ============================================================
   PERSISTENZ (localStorage)
   ============================================================ */

/**
 * Lädt den Spielzustand aus dem localStorage oder gibt einen Startzustand zurück.
 * @returns {Object} Spielzustand
 */
function ladeZustand() {
  try {
    const gespeichert = localStorage.getItem('aktienSimulator');
    if (gespeichert) {
      return JSON.parse(gespeichert);
    }
  } catch (e) {
    console.warn('Konnte Spielstand nicht laden:', e);
  }
  return startzustand();
}

/**
 * Speichert den aktuellen Spielzustand im localStorage.
 */
function speichereZustand() {
  try {
    localStorage.setItem('aktienSimulator', JSON.stringify(zustand));
  } catch (e) {
    console.warn('Konnte Spielstand nicht speichern:', e);
  }
}

/* ============================================================
   KURS-SIMULATION
   ============================================================ */

/**
 * Simuliert neue Aktienkurse basierend auf zufälliger Schwankung (Random Walk).
 * Jede Aktie hat eine eigene Volatilität.
 */
function aktualisiereKurse() {
  AKTIEN_DEFINITIONEN.forEach(def => {
    const aktie = zustand.aktien[def.id];
    const alterKurs = aktie.kurs;

    // Zufällige Änderung: normalverteilungsähnliche Schwankung
    const zufallsFaktor = (Math.random() * 2 - 1); // −1 bis +1
    const drift = zufallsFaktor * def.volatilitaet * alterKurs;
    let neuerKurs = alterKurs + drift;

    // Kurs darf nicht unter 0,10 € sinken
    neuerKurs = Math.max(0.10, neuerKurs);

    aktie.aenderung = neuerKurs - alterKurs;
    aktie.aenderungProzent = ((neuerKurs - alterKurs) / alterKurs) * 100;
    aktie.kurs = neuerKurs;

    // Historie aktualisieren
    aktie.historie.push(neuerKurs);
    if (aktie.historie.length > MAX_HISTORIE) {
      aktie.historie.shift();
    }
  });

  speichereZustand();
  aktualisiereUI();
}

/* ============================================================
   KAUF / VERKAUF
   ============================================================ */

/**
 * Kauft eine bestimmte Anzahl einer Aktie.
 * @param {string} aktieId  – ID der Aktie
 * @param {number} anzahl   – Anzahl der Anteile
 */
function kaufeAktie(aktieId, anzahl) {
  if (anzahl <= 0 || !Number.isFinite(anzahl)) {
    zeigeNachricht('Bitte eine gültige Menge eingeben.', 'fehler');
    return;
  }

  const aktie = zustand.aktien[aktieId];
  const gesamtpreis = aktie.kurs * anzahl;

  if (gesamtpreis > zustand.geld) {
    zeigeNachricht('Nicht genug Guthaben!', 'fehler');
    return;
  }

  // Geld abziehen
  zustand.geld -= gesamtpreis;

  // Depot aktualisieren (Durchschnittskauf­kurs berechnen)
  if (!zustand.depot[aktieId]) {
    zustand.depot[aktieId] = { anzahl: 0, kaufkurs: 0 };
  }
  const pos = zustand.depot[aktieId];
  const alteGesamtkosten = pos.anzahl * pos.kaufkurs;
  const neueGesamtkosten = alteGesamtkosten + gesamtpreis;
  pos.anzahl += anzahl;
  pos.kaufkurs = neueGesamtkosten / pos.anzahl;

  // Transaktion loggen
  logTransaktion('kauf', aktieId, anzahl, aktie.kurs);

  speichereZustand();
  aktualisiereUI();
}

/**
 * Verkauft eine bestimmte Anzahl einer Aktie.
 * @param {string} aktieId  – ID der Aktie
 * @param {number} anzahl   – Anzahl der Anteile
 */
function verkaufeAktie(aktieId, anzahl) {
  if (anzahl <= 0 || !Number.isFinite(anzahl)) {
    zeigeNachricht('Bitte eine gültige Menge eingeben.', 'fehler');
    return;
  }

  const pos = zustand.depot[aktieId];
  if (!pos || pos.anzahl < anzahl) {
    zeigeNachricht('Nicht genug Aktien im Depot!', 'fehler');
    return;
  }

  const aktie = zustand.aktien[aktieId];
  const erloese = aktie.kurs * anzahl;

  // Geld gutschreiben
  zustand.geld += erloese;

  // Depot aktualisieren
  pos.anzahl -= anzahl;
  if (pos.anzahl === 0) {
    delete zustand.depot[aktieId];
  }

  // Transaktion loggen
  logTransaktion('verkauf', aktieId, anzahl, aktie.kurs);

  speichereZustand();
  aktualisiereUI();
}

/* ============================================================
   HILFSFUNKTIONEN
   ============================================================ */

/**
 * Formatiert einen Eurobetrag mit zwei Nachkommastellen und €-Zeichen.
 * @param {number} betrag
 * @returns {string}
 */
function formatiereBetrag(betrag) {
  return betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

/**
 * Gibt den aktuellen Gesamtwert des Portfolios zurück (Geld + Depotwert).
 * @returns {number}
 */
function berechneGesamtwert() {
  let depotwert = 0;
  Object.entries(zustand.depot).forEach(([id, pos]) => {
    depotwert += pos.anzahl * zustand.aktien[id].kurs;
  });
  return zustand.geld + depotwert;
}

/**
 * Fügt einen Eintrag zur Transaktionshistorie hinzu.
 * @param {string} typ      – 'kauf' oder 'verkauf'
 * @param {string} aktieId  – ID der Aktie
 * @param {number} anzahl
 * @param {number} kurs
 */
function logTransaktion(typ, aktieId, anzahl, kurs) {
  const def = AKTIEN_DEFINITIONEN.find(d => d.id === aktieId);
  const jetzt = new Date();
  const zeitStr = jetzt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  zustand.log.unshift({
    typ,
    name: def.name,
    symbol: def.symbol,
    anzahl,
    kurs,
    zeitStr,
    gesamt: anzahl * kurs,
  });

  // Maximal 50 Einträge behalten
  if (zustand.log.length > 50) zustand.log.pop();
}

/**
 * Zeigt eine kurze Fehlermeldung als Browser-Alert.
 * @param {string} meldung
 */
function zeigeNachricht(meldung) {
  alert(meldung);
}

/* ============================================================
   UI-UPDATE-FUNKTIONEN
   ============================================================ */

/**
 * Aktualisiert die gesamte Benutzeroberfläche.
 */
function aktualisiereUI() {
  aktualisiereHeader();
  aktualisiereAktienTabelle();
  aktualisierePortfolio();
  aktualisiereChart();
  aktualisiereLog();
}

/**
 * Aktualisiert Guthaben, Gesamtwert und Gewinn/Verlust im Header.
 */
function aktualisiereHeader() {
  const gesamtwert = berechneGesamtwert();
  const gewinnverlust = gesamtwert - STARTGELD;

  document.getElementById('guthaben').textContent = formatiereBetrag(zustand.geld);
  document.getElementById('gesamtwert').textContent = formatiereBetrag(gesamtwert);

  const gvEl = document.getElementById('gewinnverlust');
  gvEl.textContent = (gewinnverlust >= 0 ? '+' : '') + formatiereBetrag(gewinnverlust);
  gvEl.className = 'stat-value ' + (gewinnverlust >= 0 ? 'positiv' : 'negativ');
}

/**
 * Baut die Aktientabelle neu auf.
 */
function aktualisiereAktienTabelle() {
  const tbody = document.getElementById('aktien-body');
  tbody.innerHTML = '';

  AKTIEN_DEFINITIONEN.forEach(def => {
    const aktie = zustand.aktien[def.id];
    const pos = zustand.depot[def.id];
    const besitz = pos ? pos.anzahl : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="aktie-name">${def.name}</span>
        <span class="aktie-symbol">${def.symbol}</span>
      </td>
      <td class="kurs">${formatiereBetrag(aktie.kurs)}</td>
      <td class="aenderung ${aktie.aenderung >= 0 ? 'positiv' : 'negativ'}">
        ${aktie.aenderung >= 0 ? '▲' : '▼'}
        ${Math.abs(aktie.aenderungProzent).toFixed(2)} %
      </td>
      <td class="besitz">${besitz}</td>
      <td>
        <input
          type="number"
          class="menge-input"
          id="menge-${def.id}"
          value="1"
          min="1"
          step="1"
        />
      </td>
      <td>
        <div class="aktions-buttons">
          <button class="btn-kauf"    data-id="${def.id}">Kaufen</button>
          <button class="btn-verkauf" data-id="${def.id}">Verkaufen</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Event-Listener für Kauf/Verkauf-Buttons
  tbody.querySelectorAll('.btn-kauf').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const anzahl = parseInt(document.getElementById(`menge-${id}`).value, 10);
      kaufeAktie(id, anzahl);
    });
  });

  tbody.querySelectorAll('.btn-verkauf').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const anzahl = parseInt(document.getElementById(`menge-${id}`).value, 10);
      verkaufeAktie(id, anzahl);
    });
  });
}

/**
 * Aktualisiert den Portfolio-Bereich.
 */
function aktualisierePortfolio() {
  const container = document.getElementById('portfolio-inhalt');
  const eintraege = Object.entries(zustand.depot);

  if (eintraege.length === 0) {
    container.innerHTML = '<p class="leer-text">Du besitzt noch keine Aktien.</p>';
    return;
  }

  container.innerHTML = '';
  eintraege.forEach(([id, pos]) => {
    const def = AKTIEN_DEFINITIONEN.find(d => d.id === id);
    const aktuellerKurs = zustand.aktien[id].kurs;
    const aktuellerWert = pos.anzahl * aktuellerKurs;
    const gewinn = aktuellerWert - pos.anzahl * pos.kaufkurs;
    const gewinnProzent = ((aktuellerKurs - pos.kaufkurs) / pos.kaufkurs) * 100;

    const div = document.createElement('div');
    div.className = 'portfolio-item';
    div.innerHTML = `
      <div>
        <div class="portfolio-name">${def.name} <small style="color:var(--text-muted)">${def.symbol}</small></div>
        <div class="portfolio-anzahl">${pos.anzahl} Stück · Ø ${formatiereBetrag(pos.kaufkurs)}</div>
      </div>
      <div>
        <div class="portfolio-wert">${formatiereBetrag(aktuellerWert)}</div>
        <div class="portfolio-pnl ${gewinn >= 0 ? 'positiv' : 'negativ'}">
          ${gewinn >= 0 ? '+' : ''}${formatiereBetrag(gewinn)}
          (${gewinnProzent >= 0 ? '+' : ''}${gewinnProzent.toFixed(2)} %)
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

/**
 * Aktualisiert das Kursdiagramm für die ausgewählte Aktie.
 */
function aktualisiereChart() {
  const auswahl = document.getElementById('chart-auswahl').value;
  if (!auswahl) return;

  const aktie = zustand.aktien[auswahl];
  if (!aktie) return;

  const canvas = document.getElementById('kurs-chart');
  const ctx = canvas.getContext('2d');

  // Canvas-Auflösung für scharfe Darstellung (HiDPI)
  const dpr = window.devicePixelRatio || 1;
  const cssBreite = canvas.clientWidth || 600;
  const cssHoehe = canvas.clientHeight || 260;
  canvas.width  = cssBreite * dpr;
  canvas.height = cssHoehe * dpr;
  ctx.scale(dpr, dpr);

  const breite = cssBreite;
  const hoehe  = cssHoehe;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };

  ctx.clearRect(0, 0, breite, hoehe);

  const daten = aktie.historie;
  if (daten.length < 2) return;

  const min = Math.min(...daten) * 0.98;
  const max = Math.max(...daten) * 1.02;
  const xSkala = (breite - padding.left - padding.right) / (daten.length - 1);
  const ySkala = (hoehe - padding.top - padding.bottom) / (max - min);

  // Hintergrundgitter
  ctx.strokeStyle = 'rgba(48,54,61,0.8)';
  ctx.lineWidth = 1;
  const gitterLinien = 5;
  for (let i = 0; i <= gitterLinien; i++) {
    const y = padding.top + (i / gitterLinien) * (hoehe - padding.top - padding.bottom);
    const wert = max - (i / gitterLinien) * (max - min);

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(breite - padding.right, y);
    ctx.stroke();

    // Y-Achsenbeschriftung
    ctx.fillStyle = '#8b949e';
    ctx.font = `${11 * dpr / dpr}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(wert.toFixed(2), padding.left - 8, y + 4);
  }

  // Linienverlauf ermitteln
  const punkte = daten.map((wert, i) => ({
    x: padding.left + i * xSkala,
    y: hoehe - padding.bottom - (wert - min) * ySkala,
  }));

  // Füllfläche unter dem Graphen
  const verlaufFarbe = ctx.createLinearGradient(0, padding.top, 0, hoehe - padding.bottom);
  const istPositiv = daten[daten.length - 1] >= daten[0];
  verlaufFarbe.addColorStop(0, istPositiv ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)');
  verlaufFarbe.addColorStop(1, 'rgba(13,17,23,0)');

  ctx.beginPath();
  ctx.moveTo(punkte[0].x, hoehe - padding.bottom);
  punkte.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(punkte[punkte.length - 1].x, hoehe - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = verlaufFarbe;
  ctx.fill();

  // Kurslinie zeichnen
  ctx.beginPath();
  ctx.strokeStyle = istPositiv ? '#3fb950' : '#f85149';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  punkte.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else         ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // Letzten Kurs hervorheben
  const letzterPunkt = punkte[punkte.length - 1];
  ctx.beginPath();
  ctx.arc(letzterPunkt.x, letzterPunkt.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = istPositiv ? '#3fb950' : '#f85149';
  ctx.fill();

  // Aktuellen Kurs anzeigen
  ctx.fillStyle = '#e6edf3';
  ctx.font = `bold 12px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(formatiereBetrag(daten[daten.length - 1]), letzterPunkt.x + 8, letzterPunkt.y + 4);
}

/**
 * Aktualisiert die Transaktionshistorie.
 */
function aktualisiereLog() {
  const container = document.getElementById('log-inhalt');

  if (zustand.log.length === 0) {
    container.innerHTML = '<p class="leer-text">Noch keine Transaktionen.</p>';
    return;
  }

  container.innerHTML = '';
  zustand.log.forEach(eintrag => {
    const div = document.createElement('div');
    div.className = `log-eintrag ${eintrag.typ}`;
    div.innerHTML = `
      <span>
        ${eintrag.typ === 'kauf' ? '🟢 Gekauft' : '🔴 Verkauft'}:
        <strong>${eintrag.anzahl}× ${eintrag.name}</strong>
        à ${formatiereBetrag(eintrag.kurs)}
        = ${formatiereBetrag(eintrag.gesamt)}
      </span>
      <span class="log-zeit">${eintrag.zeitStr}</span>
    `;
    container.appendChild(div);
  });
}

/* ============================================================
   INITIALISIERUNG
   ============================================================ */

/**
 * Befüllt das Dropdown für die Chartauswahl.
 */
function initialisiereChartAuswahl() {
  const select = document.getElementById('chart-auswahl');
  AKTIEN_DEFINITIONEN.forEach((def, index) => {
    const option = document.createElement('option');
    option.value = def.id;
    option.textContent = `${def.name} (${def.symbol})`;
    select.appendChild(option);
    if (index === 0) select.value = def.id;
  });

  select.addEventListener('change', aktualisiereChart);
}

/**
 * Setzt das Spiel zurück und startet neu.
 */
function spielNeuStarten() {
  if (confirm('Möchtest du wirklich neu starten? Dein Fortschritt geht verloren!')) {
    zustand = startzustand();
    speichereZustand();
    aktualisiereUI();
  }
}

/**
 * Haupteinstiegspunkt – wird beim Laden der Seite ausgeführt.
 */
function init() {
  // Aktuelles Jahr im Footer
  document.getElementById('jahr').textContent = new Date().getFullYear();

  // Reset-Button
  document.getElementById('btn-reset').addEventListener('click', spielNeuStarten);

  // Chart-Auswahl initialisieren
  initialisiereChartAuswahl();

  // Initiales UI-Update
  aktualisiereUI();

  // Periodische Kursaktualisierung starten
  setInterval(aktualisiereKurse, KURS_INTERVALL_MS);

  // Canvas-Größe bei Fensteränderung neu zeichnen
  window.addEventListener('resize', aktualisiereChart);
}

// Seite vollständig geladen → Spiel starten
document.addEventListener('DOMContentLoaded', init);

# Sontag's Menu

Progressive Web App zur gemeinsamen Essensplanung für die Familie. Rezepte-Pool anlegen, per Drag & Drop auf die Wochentage verteilen, Wochenplan speichern – synchronisiert über ein gemeinsames Google Sheet.

## Nutzung auf dem iPhone

1. Seite in Safari öffnen (GitHub-Pages-URL, siehe unten).
2. Teilen-Button → "Zum Home-Bildschirm".
3. App vom Home-Bildschirm starten wie eine normale App.

## Funktionen

- **Rezepte-Pool**: Rezepte mit Titel, Quelle-URL (beliebige Website oder Cookidoo-Link), Bild-URL und Notiz anlegen, bearbeiten, löschen.
- **Automatisches Vorschaubild**: Beim Anlegen eines Rezepts kann über "Automatisch versuchen" das Vorschaubild (`og:image`) der Quell-Website automatisch geholt werden (über einen öffentlichen CORS-Proxy). Klappt das nicht (z. B. bei Cookidoo, das Inhalte per JavaScript nachlädt), einfach die Bild-URL manuell eintragen – z. B. per Rechtsklick auf ein Bild der Rezeptseite → "Bildadresse kopieren".
- **Wochenplan**: Rezepte aus dem Pool per Drag & Drop (Maus oder Touch) auf einen Wochentag ziehen, zwischen Tagen verschieben oder per ✕ wieder entfernen. Über die Pfeile lässt sich zwischen den Kalenderwochen navigieren.
- **Speichern**: Änderungen werden laufend automatisch synchronisiert; "Woche speichern" stößt zusätzlich eine sofortige Synchronisierung aller noch offenen Änderungen an. Der Button ⟳ oben lädt den aktuellen Stand aus dem Sheet (z. B. wenn ein Familienmitglied auf einem anderen Gerät etwas geändert hat).

## Google Sheet einrichten (einmalig)

1. Neues Google Sheet anlegen.
2. Menü **Erweiterungen → Apps Script** öffnen.
3. Inhalt aus [`apps-script/Code.gs`](apps-script/Code.gs) in den Editor einfügen (bestehenden Beispielcode ersetzen).
4. Speichern, dann **Bereitstellen → Neue Bereitstellung**.
5. Typ: **Web App**.
   - "Ausführen als": **Ich (dein Google-Konto)**
   - "Wer hat Zugriff": **Jeder** (nötig, damit die App ohne Google-Login lesen/schreiben kann)
6. Bereitstellen, Berechtigungen bestätigen.
7. Die angezeigte **Web-App-URL** (endet auf `/exec`) kopieren.

Die Tabellenblätter "Rezepte" und "Wochenplan" werden beim ersten Speichern automatisch angelegt.

## App mit dem Sheet verbinden

Die Web-App-URL der Familie ist bereits fest in [`app.js`](app.js) als `DEFAULT_SCRIPT_URL` hinterlegt – neue Geräte müssen nichts einstellen, alle sehen automatisch denselben Rezepte-Pool und Wochenplan.

Soll stattdessen ein anderes/eigenes Sheet verwendet werden (z. B. zum Testen), lässt sich das über das Zahnrad-Symbol (⚙) → Apps-Script-URL überschreiben; die dort eingetragene URL hat Vorrang vor dem Standardwert.

Da die URL öffentlich im Repo sichtbar ist (Zugriff über "Jeder" ist notwendig, damit die App ohne Google-Login lesen/schreiben kann), kennt theoretisch jeder mit Repo-Zugriff die URL und könnte Daten im Sheet ändern. Für ein privates Familien-Tool ist das ein bewusst in Kauf genommenes, geringes Risiko.

## Hell/Dunkel-Modus

In den Einstellungen unter "Design" lässt sich zwischen Hell, Dunkel und System (folgt der Geräte-Einstellung) wählen.

## Hosting (GitHub Pages)

Dieses Repo ist für GitHub Pages vorbereitet – kein Server nötig, alles läuft statisch im Browser.

1. Neues (leeres) GitHub-Repository anlegen und dieses Projekt dorthin pushen.
2. Im Repo unter **Settings → Pages**: Branch `main`, Ordner `/ (root)` auswählen.
3. Nach kurzer Zeit ist die App unter `https://<benutzername>.github.io/<repo-name>/` erreichbar.

## App-Icon

Das Icon (`icons/`) wurde aus der bereitgestellten Grafik "Sontag's Menu" in den benötigten PWA-Größen (192px, 512px, Apple-Touch-Icon 180px) erzeugt.

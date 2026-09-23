# We're Hungry!

Progressive Web App zur gemeinsamen Essensplanung für die Familie. Rezepte-Pool anlegen, per Drag & Drop auf die Wochentage verteilen, Wochenplan speichern – synchronisiert über ein gemeinsames Google Sheet.

## Nutzung auf dem iPhone

1. Seite in Safari öffnen (GitHub-Pages-URL, siehe unten).
2. Teilen-Button → "Zum Home-Bildschirm".
3. App vom Home-Bildschirm starten wie eine normale App.

## Funktionen

- **Rezepte-Pool**: Rezepte mit Titel, Quelle-URL (beliebige Website oder Cookidoo-Link), Bild-URL, Labels und Notiz anlegen, bearbeiten, löschen.
- **Eigene Rezepte**: Beim Anlegen eines Rezepts schaltet der Regler "Eigenes Rezept" die Quelle-URL-Abfrage aus und blendet stattdessen Felder für Zutaten und Zubereitung ein. Solche Rezepte zeigen in der Pool-/Wochenübersicht statt eines externen Links ein "📖 Eigenes Rezept"-Feld – ein Klick darauf öffnet eine Detailansicht mit Zutaten, Zubereitung, Bild und Notiz direkt in der App.
- **Bildvorschläge**: "Automatisch versuchen" sucht (wenn in den Einstellungen eine Google-Bildersuche hinterlegt ist) passende Bilder über die Google Custom Search API und zeigt mehrere Vorschläge zur Auswahl an. Ohne eingerichtete Bildersuche wird ersatzweise versucht, das Vorschaubild (`og:image`) der Quell-Website zu holen (über einen öffentlichen CORS-Proxy, nur bei Rezepten mit Quelle-URL). In beiden Fällen lässt sich die Bild-URL zusätzlich jederzeit manuell eintragen – z. B. per Rechtsklick auf ein Bild → "Bildadresse kopieren".
- **Labels & Filter**: Im Rezeptformular lassen sich beliebige, mit Komma getrennte Labels eintragen (z. B. "vegetarisch, schnell, kinderfreundlich"). Sie erscheinen als Filter-Chips über dem Rezepte-Pool und im Wochenplan – ein Klick blendet alle Rezepte ohne dieses Label aus.
- **Wochenplan**: Rezepte aus dem Pool per Drag & Drop am Griff-Symbol (⠿, Maus oder Touch) auf einen Wochentag ziehen, zwischen Tagen verschieben oder per ✕ wieder entfernen. Über die Pfeile lässt sich zwischen den Kalenderwochen navigieren.
- **Speichern**: Änderungen werden laufend automatisch synchronisiert; "Woche speichern" stößt zusätzlich eine sofortige Synchronisierung aller noch offenen Änderungen an.
- **Update-Button ⟳**: Lädt nicht nur die Rezept-/Wochenplandaten aus dem Sheet neu, sondern stößt auch einen Update-Check des Service Workers an und lädt die Seite danach neu – damit ist sichergestellt, dass immer die zuletzt veröffentlichte Version der App läuft, auch wenn vorher eine ältere Version im Cache lag. Die App-Shell (HTML/CSS/JS) wird generell per "Network-first" geladen, ein normales Neuladen der Seite reicht bei bestehender Internetverbindung also bereits aus, um aktuell zu bleiben.
- **Versionsanzeige**: Im Footer steht die aktuelle Release-Version sowie Datum/Uhrzeit der Veröffentlichung.

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

**Wichtig bei Updates von `Code.gs`** (z. B. nach dem Hinzufügen der Labels-Spalte): Ein reines Speichern im Apps-Script-Editor reicht nicht – die bereits veröffentlichte Web-App-URL bleibt sonst auf dem alten Code-Stand eingefroren. Nach jeder Änderung an `Code.gs` im Editor zusätzlich **Bereitstellen → Bereitstellungen verwalten → Stift-Symbol → Version: Neue Version → Bereitstellen** ausführen (die URL bleibt dabei gleich).

## App mit dem Sheet verbinden

Die Web-App-URL der Familie ist bereits fest in [`app.js`](app.js) als `DEFAULT_SCRIPT_URL` hinterlegt – neue Geräte müssen nichts einstellen, alle sehen automatisch denselben Rezepte-Pool und Wochenplan.

Soll stattdessen ein anderes/eigenes Sheet verwendet werden (z. B. zum Testen), lässt sich das über das Zahnrad-Symbol (⚙) → Apps-Script-URL überschreiben; die dort eingetragene URL hat Vorrang vor dem Standardwert.

Da die URL öffentlich im Repo sichtbar ist (Zugriff über "Jeder" ist notwendig, damit die App ohne Google-Login lesen/schreiben kann), kennt theoretisch jeder mit Repo-Zugriff die URL und könnte Daten im Sheet ändern. Für ein privates Familien-Tool ist das ein bewusst in Kauf genommenes, geringes Risiko.

## Google-Bildersuche einrichten (optional, für Bildvorschläge)

Ohne diese Einrichtung funktioniert die App weiterhin – "Automatisch versuchen" nutzt dann nur den einfacheren `og:image`-Fallback bzw. es muss die Bild-URL manuell eingetragen werden. Für die komfortablere Google-Bildersuche mit mehreren Vorschlägen:

1. [Google Cloud Console](https://console.cloud.google.com/) öffnen, ein (kostenloses) Projekt anlegen oder ein bestehendes verwenden.
2. Unter **APIs & Dienste → Bibliothek** nach "Custom Search API" suchen und aktivieren.
3. Unter **APIs & Dienste → Anmeldedaten** einen neuen **API-Schlüssel** erstellen. Empfohlen: den Schlüssel über "Anwendungseinschränkungen → HTTP-Verweis-URLs" auf die eigene GitHub-Pages-Domain (`https://<benutzername>.github.io/*`) einschränken.
4. Auf [Programmable Search Engine](https://programmablesearchengine.google.com/) eine neue Suchmaschine anlegen. Bei "Websites durchsuchen" die Option **"Das gesamte Web durchsuchen"** wählen, danach unter "Einstellungen → Bildsuche" die Bildersuche aktivieren.
5. Die **Suchmaschinen-ID (cx)** aus den Suchmaschinen-Einstellungen kopieren.
6. In der App unter ⚙ Einstellungen den API-Key und die cx-ID eintragen und speichern.

Der kostenlose Kontingentrahmen liegt bei 100 Suchanfragen pro Tag – für eine Familie im normalen Gebrauch üblicherweise ausreichend. Genau wie die Apps-Script-URL landet auch dieser API-Key sichtbar im Browser-Speicher des jeweiligen Geräts (nicht im Repo-Code) – dank der Domain-Einschränkung in Schritt 3 ist er außerhalb der eigenen App aber nicht nutzbar.

## Design

In den Einstellungen unter "Design" lässt sich zwischen Hell, Dunkel, System (folgt der Geräte-Einstellung), Knallbunt (verspielte Regenbogenfarben je Wochentag/Rezept) und Neon (dunkler Hintergrund mit Glow-Akzenten) wählen.

## Hosting (GitHub Pages)

Dieses Repo ist für GitHub Pages vorbereitet – kein Server nötig, alles läuft statisch im Browser.

1. Neues (leeres) GitHub-Repository anlegen und dieses Projekt dorthin pushen.
2. Im Repo unter **Settings → Pages**: Branch `main`, Ordner `/ (root)` auswählen.
3. Nach kurzer Zeit ist die App unter `https://<benutzername>.github.io/<repo-name>/` erreichbar.

## Neues Release veröffentlichen (für Entwickler)

Bei jeder inhaltlichen Änderung an `app.js`, `index.html` oder `style.css`:

1. `APP_VERSION` und `APP_RELEASED_AT` in [`app.js`](app.js) auf die neue Version/den aktuellen Zeitpunkt setzen (erscheint im Footer).
2. `CACHE_NAME` in [`sw.js`](sw.js) hochzählen.
3. Committen und pushen.

Nutzer:innen bekommen die neue Version automatisch beim nächsten Öffnen (Network-first) oder sofort per Klick auf ⟳.

## App-Icon

Das Icon (`icons/`) wurde aus der ursprünglich bereitgestellten Grafik "Sontag's Menu" in den benötigten PWA-Größen (192px, 512px, Apple-Touch-Icon 180px) erzeugt. Der Schriftzug auf dem Icon selbst zeigt weiterhin "Sontag's Menu", da er fest im Bild eingebrannt ist – für ein passendes Icon zum neuen Namen wird eine neue Grafik benötigt.

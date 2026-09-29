# Projektkontext für KI-Assistenten / neue Entwickler-Sessions

Dieses Dokument fasst zusammen, was beim Aufbau von "We're Hungry!" entschieden und gelernt wurde – gedacht als Einstieg für eine neue Claude-Code-Session (auch auf einem anderen Account/Rechner), die hier weiterarbeiten soll. Für Nutzungs- und Einrichtungs-Infos siehe [README.md](README.md).

## Was die App ist

Statische PWA (kein Build-Schritt, reines HTML/CSS/vanilla JS) zur gemeinsamen Essensplanung einer Familie:
- Rezepte-Pool mit Titel, Quelle-URL oder "eigenes Rezept" (Zutaten/Zubereitung direkt in der App), Bild, Labels, Notiz.
- Wochenplan: Rezepte per Pointer-Events-Drag&Drop (funktioniert auf Touch UND Maus) auf Wochentage ziehen.
- Sync über ein gemeinsames Google Sheet via Apps Script Web-App (`apps-script/Code.gs`), URL fest in `app.js` als `DEFAULT_SCRIPT_URL` hinterlegt.
- Hosting: GitHub Pages, Repo `josontag-git/sontags-menu` (Name historisch, App heißt jetzt "We're Hungry!" – Repo-Rename bewusst nicht gemacht, siehe unten).

## Dateien im Überblick

- `index.html`, `style.css`, `app.js` – die ganze App, keine Frameworks, kein Bundler.
- `sw.js` – Service Worker. App-Shell-Dateien (`index.html`, `app.js`, `style.css`, `manifest.json`) laufen **Network-first**, Icons **Cache-first**. `CACHE_NAME` bei jedem Release hochzählen.
- `apps-script/Code.gs` – Backend, 1:1 in den Apps-Script-Editor des Google Sheets einfügen, danach **immer neu deployen** (siehe README, eigener Abschnitt dazu – reines Speichern reicht nicht).
- `icons/` – App-Icon in mehreren Größen, generiert aus einer 1024×1024-Vorlage per `sips`.
- `.claude/launch.json` – lokaler Dev-Server (`npx serve`) für die Vorschau.

## Wichtige Design-Entscheidungen & Gotchas

1. **Schema-Änderungen am Google Sheet immer ans Ende anhängen, nie mittendrin einfügen.** Wir haben genau das einmal falsch gemacht (Labels-Spalte mittendrin eingefügt), während der Nutzer schon echte Daten im Sheet hatte → Spaltenversatz, Notiz-Feld zeigte plötzlich Zeitstempel. Musste manuell repariert werden. Seitdem: neue Spalten in `RECIPE_HEADERS` immer hinten anhängen (siehe wie `isOwn`/`ingredients`/`instructions` nach `Zuletzt aktualisiert` angehängt wurden) – alte Zeilen liefern dann einfach leere Werte für die neuen Spalten, keine Migration nötig.

2. **Apps Script Deployments frieren den Code beim Deploy ein.** Ein Speichern im Editor aktualisiert die bereits veröffentlichte Web-App-URL NICHT. Nach jeder Änderung an `Code.gs`: Bereitstellen → Bereitstellungen verwalten → Stift → Version: Neue Version → Bereitstellen.

3. **Der öffentliche CORS-Proxy `api.allorigins.win`** (Fallback für Bild-Vorschau ohne Google-Suche) ist unzuverlässig – schlägt gelegentlich mit CORS-Fehlern fehl. Das ist ein bekanntes Proxy-Problem, kein Bug in unserem Code. Die Google Custom Search API (wenn eingerichtet) ist deutlich zuverlässiger und wurde per `curl` gegen die echte GitHub-Pages-Domain auf CORS-Kompatibilität getestet – funktioniert.

4. **Service-Worker-Caching war mehrfach Ursache für "alte Version bleibt hängen".** Deshalb: App-Shell läuft Network-first (siehe `sw.js`), und der ⟳-Button ruft zusätzlich `registration.update()` auf und lädt danach per `location.reload()` neu – garantiert immer den aktuellsten Stand.

5. **`DEFAULT_SCRIPT_URL` ist absichtlich im öffentlichen Repo sichtbar.** Bewusste Risikoabwägung (siehe README) – für ein privates Familientool akzeptiert, damit kein Gerät manuell eingerichtet werden muss.

6. **Repo-Name vs. App-Name:** Die GitHub-Pages-URL lautet weiterhin `.../sontags-menu/`, obwohl die App "We're Hungry!" heißt – ein Rename würde alle bereits auf Home-Bildschirmen gespeicherten Verknüpfungen der Familie brechen. Bewusst so gelassen, bis der Nutzer explizit einen Wechsel wünscht.

## Versionierung / Release-Prozess

Bei jeder inhaltlichen Änderung an `app.js`, `index.html` oder `style.css`:
1. `APP_VERSION` und `APP_RELEASED_AT` in `app.js` aktualisieren (erscheint im Footer).
2. `CACHE_NAME` in `sw.js` hochzählen.
3. Committen, pushen – GitHub Pages deployt automatisch (ca. 20–60 Sekunden).

## Bekannter offener Punkt

- Google-Bildersuche (Custom Search API) ist als Feature fertig, aber der Nutzer hat noch keine eigenen API-Credentials hinterlegt (optional, Anleitung in README). Ohne Credentials nutzt die App automatisch den `og:image`-Fallback.

## Testing-Hinweis

Es gibt keine automatisierten Tests. Änderungen wurden bisher live im Browser verifiziert (lokaler Dev-Server + `mcp__Claude_Browser__*`-Tools), inkl. echtem Round-Trip gegen das produktive Google Sheet (mit anschließendem Aufräumen der Testdaten). Beim Testen gegen das echte Sheet: **immer** angelegte Testdaten am Ende wieder per `doPost` mit `{"deleted": true}` entfernen, um die echten Familiendaten nicht zu verunreinigen.

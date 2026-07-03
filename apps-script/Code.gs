// In das Google Sheet einfuegen unter: Erweiterungen -> Apps Script
// Danach als Web App (neu) deployen (siehe README.md im Projekt-Root).

const SHEET_RECIPES = "Rezepte";
const SHEET_WEEKPLAN = "Wochenplan";

function doGet(e) {
  const recipes = readRecipes();
  const weekplans = readWeekplans();
  return jsonOutput({ recipes, weekplans });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (data.type === "weekplan") {
    upsertWeekplanRow(data);
  } else {
    if (data.deleted) {
      deleteRecipeRow(data.id);
    } else {
      upsertRecipeRow(data);
    }
  }

  return jsonOutput({ status: "ok" });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// --- Rezepte ---

const RECIPE_HEADERS = ["ID", "Titel", "Quelle-URL", "Bild-URL", "Labels", "Notiz", "Zuletzt aktualisiert"];

function upsertRecipeRow(data) {
  const sheet = getOrCreateSheet(SHEET_RECIPES, RECIPE_HEADERS);
  upsertRow(sheet, data.id, [
    data.id,
    data.title || "",
    data.sourceUrl || "",
    data.thumbUrl || "",
    (data.labels || []).join(", "),
    data.note || "",
    new Date(),
  ]);
}

function deleteRecipeRow(id) {
  const sheet = getOrCreateSheet(SHEET_RECIPES, RECIPE_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sheet.deleteRow(i + 2);
      return;
    }
  }
}

function readRecipes() {
  const sheet = getOrCreateSheet(SHEET_RECIPES, RECIPE_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      id: String(r[0]),
      title: r[1] || "",
      sourceUrl: r[2] || "",
      thumbUrl: r[3] || "",
      labels: String(r[4] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      note: r[5] || "",
    }));
}

// --- Wochenplan ---

function upsertWeekplanRow(data) {
  const sheet = getOrCreateSheet(SHEET_WEEKPLAN, [
    "ID", "Woche", "Tag", "Rezept-ID", "Zuletzt aktualisiert",
  ]);
  const rowId = `${data.week}_${data.day}`;
  upsertRow(sheet, rowId, [
    rowId,
    data.week || "",
    data.day || "",
    data.recipeId || "",
    new Date(),
  ]);
}

function readWeekplans() {
  const sheet = getOrCreateSheet(SHEET_WEEKPLAN, [
    "ID", "Woche", "Tag", "Rezept-ID", "Zuletzt aktualisiert",
  ]);
  const lastRow = sheet.getLastRow();
  const result = {};
  if (lastRow <= 1) return result;
  const rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  rows.forEach((r) => {
    const week = r[1];
    const day = r[2];
    const recipeId = r[3];
    if (!week || !day || !recipeId) return;
    if (!result[week]) result[week] = {};
    result[week][day] = String(recipeId);
  });
  return result;
}

// --- Gemeinsame Helfer ---

function upsertRow(sheet, id, row) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sheet.appendRow(row);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    return sheet;
  }

  // Immer mindestens so viele Spalten lesen wie das neue Schema erwartet - vermeidet
  // falsche Laengen-Vergleiche, wenn irgendeine Datenzeile zufaellig mehr Spalten belegt
  // als die Kopfzeile (z. B. durch eine einzelne bereits aktualisierte Zeile).
  const width = Math.max(sheet.getLastColumn(), headers.length);
  const currentHeaders = width > 0 ? sheet.getRange(1, 1, 1, width).getValues()[0] : [];
  const headersMatch = headers.every((h, i) => currentHeaders[i] === h);
  if (headersMatch) return sheet;

  if (sheet.getLastRow() <= 1) {
    // Nur Kopfzeile oder ganz leer - gefahrlos ueberschreiben.
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  if (name === SHEET_RECIPES && currentHeaders[4] !== "Labels") {
    // Migration: bestehende Rezepte-Zeilen im alten Schema (ohne Labels-Spalte)
    // auf das neue 7-Spalten-Schema heben, ohne Daten zu verlieren.
    const numDataRows = sheet.getLastRow() - 1;
    const oldData = sheet.getRange(2, 1, numDataRows, 6).getValues();
    const newData = oldData.map((r) => [r[0], r[1], r[2], r[3], "", r[4], r[5]]);
    sheet.getRange(2, 1, numDataRows, 7).setValues(newData);
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

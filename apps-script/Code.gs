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
  } else if (sheet.getLastRow() <= 1) {
    // Sheet ist noch leer (nur Kopfzeile oder ganz leer) - Kopfzeile gefahrlos an neues Schema anpassen.
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

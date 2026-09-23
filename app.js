const STORAGE_RECIPES = "recipes";
const STORAGE_WEEKPLANS = "weekPlans";
const STORAGE_PENDING_DAYS = "pendingWeekDays";
const STORAGE_SCRIPT_URL = "scriptUrl";
const STORAGE_THEME = "themeMode";
const STORAGE_LABEL_FILTER = "activeLabelFilters";
const STORAGE_GOOGLE_API_KEY = "googleApiKey";
const STORAGE_GOOGLE_CSE_ID = "googleCseId";

// Standard-Verbindung zum gemeinsamen Familien-Sheet. In den Einstellungen ueberschreibbar.
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhZOVVg8KdMcjCF7uwjXXsK7DJH_QvxpaGGoU3RT0MtnHQumsFFIkwJtVXr0H1WTk/exec";

// Bei jedem Release von Hand hochzaehlen/aktualisieren - erscheint im Footer und
// dient dem Update-Button als sichtbarer Beleg, dass der neueste Stand geladen ist.
const APP_VERSION = "1.0.0";
const APP_RELEASED_AT = "2026-09-23T15:41:00+02:00";

const DAYS = [
  { key: "mon", label: "Mo" },
  { key: "tue", label: "Di" },
  { key: "wed", label: "Mi" },
  { key: "thu", label: "Do" },
  { key: "fri", label: "Fr" },
  { key: "sat", label: "Sa" },
  { key: "sun", label: "So" },
];

// --- DOM refs ---

const tabBtns = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".view");
const refreshBtn = document.getElementById("refreshBtn");
const appVersionInfoEl = document.getElementById("appVersionInfo");

const weekTitleEl = document.getElementById("weekTitle");
const weekRangeEl = document.getElementById("weekRange");
const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");
const weekDaysEl = document.getElementById("weekDays");
const weekPoolListEl = document.getElementById("weekPoolList");
const saveWeekBtn = document.getElementById("saveWeekBtn");
const syncStatusEl = document.getElementById("syncStatus");

const poolListEl = document.getElementById("poolList");
const poolEmptyHintEl = document.getElementById("poolEmptyHint");
const addRecipeBtn = document.getElementById("addRecipeBtn");
const poolLabelFilterEl = document.getElementById("poolLabelFilter");
const weekLabelFilterEl = document.getElementById("weekLabelFilter");

const recipeModal = document.getElementById("recipeModal");
const recipeModalTitleEl = document.getElementById("recipeModalTitle");
const recipeForm = document.getElementById("recipeForm");
const rTitleInput = document.getElementById("rTitle");
const rIsOwnInput = document.getElementById("rIsOwn");
const sourceUrlFieldEl = document.getElementById("sourceUrlField");
const ownRecipeFieldsEl = document.getElementById("ownRecipeFields");
const rSourceUrlInput = document.getElementById("rSourceUrl");
const rIngredientsInput = document.getElementById("rIngredients");
const rInstructionsInput = document.getElementById("rInstructions");
const rThumbUrlInput = document.getElementById("rThumbUrl");
const rLabelsInput = document.getElementById("rLabels");
const rNoteInput = document.getElementById("rNote");
const autoThumbBtn = document.getElementById("autoThumbBtn");
const autoThumbStatusEl = document.getElementById("autoThumbStatus");
const thumbSuggestionsEl = document.getElementById("thumbSuggestions");
const rThumbPreviewWrapEl = document.getElementById("rThumbPreviewWrap");
const rThumbPreviewEl = document.getElementById("rThumbPreview");
const deleteRecipeBtn = document.getElementById("deleteRecipeBtn");
const cancelRecipeBtn = document.getElementById("cancelRecipeBtn");

const recipeDetailModal = document.getElementById("recipeDetailModal");
const detailTitleEl = document.getElementById("detailTitle");
const detailThumbEl = document.getElementById("detailThumb");
const detailLabelsEl = document.getElementById("detailLabels");
const detailIngredientsWrapEl = document.getElementById("detailIngredientsWrap");
const detailIngredientsEl = document.getElementById("detailIngredients");
const detailInstructionsWrapEl = document.getElementById("detailInstructionsWrap");
const detailInstructionsEl = document.getElementById("detailInstructions");
const detailNoteWrapEl = document.getElementById("detailNoteWrap");
const detailNoteEl = document.getElementById("detailNote");
const editFromDetailBtn = document.getElementById("editFromDetailBtn");
const closeDetailBtn = document.getElementById("closeDetailBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const scriptUrlInput = document.getElementById("scriptUrl");
const googleApiKeyInput = document.getElementById("googleApiKey");
const googleCseIdInput = document.getElementById("googleCseId");
const themeSelect = document.getElementById("themeSelect");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

let editingRecipeId = null;
let detailRecipeId = null;
let currentMonday = getMonday(new Date());

// --- Storage helpers ---

function getRecipes() {
  return JSON.parse(localStorage.getItem(STORAGE_RECIPES) || "[]");
}
function saveRecipes(list) {
  localStorage.setItem(STORAGE_RECIPES, JSON.stringify(list));
}
function getWeekPlans() {
  return JSON.parse(localStorage.getItem(STORAGE_WEEKPLANS) || "{}");
}
function saveWeekPlans(plans) {
  localStorage.setItem(STORAGE_WEEKPLANS, JSON.stringify(plans));
}
function getPendingDays() {
  return JSON.parse(localStorage.getItem(STORAGE_PENDING_DAYS) || "[]");
}
function savePendingDays(arr) {
  localStorage.setItem(STORAGE_PENDING_DAYS, JSON.stringify(arr));
}
function markDayPending(weekKey, dayKey) {
  const key = `${weekKey}_${dayKey}`;
  const arr = getPendingDays();
  if (!arr.includes(key)) {
    arr.push(key);
    savePendingDays(arr);
  }
}
function unmarkDayPending(weekKey, dayKey) {
  const key = `${weekKey}_${dayKey}`;
  savePendingDays(getPendingDays().filter((k) => k !== key));
}
function getScriptUrl() {
  return localStorage.getItem(STORAGE_SCRIPT_URL) || DEFAULT_SCRIPT_URL;
}
function getGoogleApiKey() {
  return localStorage.getItem(STORAGE_GOOGLE_API_KEY) || "";
}
function getGoogleCseId() {
  return localStorage.getItem(STORAGE_GOOGLE_CSE_ID) || "";
}
function getActiveLabelFilters() {
  return JSON.parse(localStorage.getItem(STORAGE_LABEL_FILTER) || "[]");
}
function saveActiveLabelFilters(arr) {
  localStorage.setItem(STORAGE_LABEL_FILTER, JSON.stringify(arr));
}
function toggleLabelFilter(label) {
  const key = label.toLowerCase();
  const active = getActiveLabelFilters();
  const idx = active.indexOf(key);
  if (idx === -1) active.push(key);
  else active.splice(idx, 1);
  saveActiveLabelFilters(active);
  renderPool();
  renderWeek();
}
function parseLabelsInput(value) {
  const seen = new Set();
  const result = [];
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((label) => {
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(label);
      }
    });
  return result;
}
function getAllLabels(recipes) {
  const map = new Map();
  recipes.forEach((r) => (r.labels || []).forEach((l) => map.set(l.toLowerCase(), l)));
  return [...map.values()].sort((a, b) => a.localeCompare(b, "de"));
}
function filterByLabels(recipes) {
  const active = getActiveLabelFilters();
  if (active.length === 0) return recipes;
  return recipes.filter((r) => (r.labels || []).some((l) => active.includes(l.toLowerCase())));
}
function renderLabelFilterBar(container, recipes) {
  const labels = getAllLabels(recipes);
  const active = getActiveLabelFilters();
  container.innerHTML = "";
  if (labels.length === 0) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  labels.forEach((label) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "label-chip";
    chip.classList.toggle("active", active.includes(label.toLowerCase()));
    chip.textContent = label;
    chip.addEventListener("click", () => toggleLabelFilter(label));
    container.appendChild(chip);
  });
}

// --- Date helpers ---

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatReleaseTimestamp(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`;
}

function renderVersionInfo() {
  appVersionInfoEl.textContent = `Version ${APP_VERSION} · ${formatReleaseTimestamp(APP_RELEASED_AT)}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoWeekKey(monday) {
  const target = new Date(monday);
  target.setDate(target.getDate() + 3); // Thursday of this week
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const day = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - day + 3);
  const weekNum = 1 + Math.round((target - firstThursday) / (7 * 86400000));
  return `${target.getFullYear()}-W${pad(weekNum)}`;
}

function formatRange(monday) {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${pad(monday.getDate())}.${pad(monday.getMonth() + 1)}. – ${pad(end.getDate())}.${pad(end.getMonth() + 1)}.`;
}

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// --- Theme ---

function applyTheme() {
  const mode = localStorage.getItem(STORAGE_THEME) || "system";
  const effective =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", effective);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if ((localStorage.getItem(STORAGE_THEME) || "system") === "system") applyTheme();
});

// --- Tabs ---

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    views.forEach((v) => v.classList.toggle("active", v.id === `${btn.dataset.view}View`));
  });
});

// --- Recipe card rendering ---

function createThumbPlaceholder() {
  const div = document.createElement("div");
  div.className = "recipe-thumb-placeholder";
  div.textContent = "🍽️";
  return div;
}

function createSourceEl(recipe, asLink) {
  if (recipe.isOwn) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recipe-source recipe-source-btn";
    btn.textContent = "📖 Eigenes Rezept";
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openRecipeDetail(recipe);
    });
    return btn;
  }
  if (asLink) {
    const a = document.createElement("a");
    a.className = "recipe-source";
    a.href = recipe.sourceUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = hostnameFromUrl(recipe.sourceUrl);
    a.addEventListener("pointerdown", (e) => e.stopPropagation());
    return a;
  }
  const div = document.createElement("div");
  div.className = "recipe-source";
  div.textContent = hostnameFromUrl(recipe.sourceUrl);
  return div;
}

function createRecipeCard(recipe, { draggable = false, showActions = false } = {}) {
  const card = document.createElement("div");
  card.className = "recipe-card";
  card.dataset.recipeId = recipe.id;

  if (recipe.thumbUrl) {
    const img = document.createElement("img");
    img.className = "recipe-thumb";
    img.src = recipe.thumbUrl;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.replaceWith(createThumbPlaceholder()));
    card.appendChild(img);
  } else {
    card.appendChild(createThumbPlaceholder());
  }

  const body = document.createElement("div");
  body.className = "recipe-body";
  const title = document.createElement("div");
  title.className = "recipe-title";
  title.textContent = recipe.title;
  const source = createSourceEl(recipe, true);
  body.append(title, source);
  if (recipe.labels && recipe.labels.length) {
    const labelsEl = document.createElement("div");
    labelsEl.className = "recipe-labels";
    recipe.labels.forEach((l) => {
      const badge = document.createElement("span");
      badge.className = "recipe-label-badge";
      badge.textContent = l;
      labelsEl.appendChild(badge);
    });
    body.appendChild(labelsEl);
  }
  card.appendChild(body);

  if (showActions) {
    const actions = document.createElement("div");
    actions.className = "recipe-card-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "✎";
    editBtn.setAttribute("aria-label", "Bearbeiten");
    editBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openRecipeModal(recipe);
    });
    actions.appendChild(editBtn);
    card.appendChild(actions);
  }

  if (draggable) {
    card.classList.add("draggable-card");
    const handle = document.createElement("div");
    handle.className = "drag-handle drag-handle-corner";
    handle.textContent = "⠿";
    handle.setAttribute("aria-label", "Ziehpunkt");
    card.appendChild(handle);
    attachDragHandlers(handle, card, recipe, null);
  }

  return card;
}

function createAssignedCard(recipe, dayKey) {
  const wrap = document.createElement("div");
  wrap.className = "assigned-card draggable-card";
  wrap.dataset.recipeId = recipe.id;

  if (recipe.thumbUrl) {
    const img = document.createElement("img");
    img.src = recipe.thumbUrl;
    img.alt = "";
    img.style.cssText = "width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;";
    img.addEventListener("error", () => img.remove());
    wrap.appendChild(img);
  }

  const info = document.createElement("div");
  info.style.cssText = "min-width:0;flex:1;";
  const title = document.createElement("div");
  title.className = "recipe-title";
  title.textContent = recipe.title;
  const source = createSourceEl(recipe, false);
  info.append(title, source);
  wrap.appendChild(info);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "clear-day-btn";
  clearBtn.textContent = "✕";
  clearBtn.setAttribute("aria-label", "Entfernen");
  clearBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearDay(dayKey);
  });
  wrap.appendChild(clearBtn);

  const handle = document.createElement("div");
  handle.className = "drag-handle";
  handle.textContent = "⠿";
  handle.setAttribute("aria-label", "Ziehpunkt");
  wrap.insertBefore(handle, wrap.firstChild);

  attachDragHandlers(handle, wrap, recipe, dayKey);
  return wrap;
}

function renderPool() {
  const recipes = getRecipes();
  renderLabelFilterBar(poolLabelFilterEl, recipes);
  const filtered = filterByLabels(recipes);
  poolListEl.innerHTML = "";
  filtered.forEach((r) => poolListEl.appendChild(createRecipeCard(r, { showActions: true })));
  poolEmptyHintEl.classList.toggle("hidden", filtered.length > 0);
  poolEmptyHintEl.textContent =
    recipes.length === 0
      ? "Noch keine Rezepte im Pool. Lege dein erstes Rezept an!"
      : "Keine Rezepte mit den gewählten Labels.";
}

function renderWeekPool() {
  const recipes = getRecipes();
  renderLabelFilterBar(weekLabelFilterEl, recipes);
  const filtered = filterByLabels(recipes);
  weekPoolListEl.innerHTML = "";
  filtered.forEach((r) => weekPoolListEl.appendChild(createRecipeCard(r, { draggable: true })));
}

function renderWeek() {
  const weekKey = isoWeekKey(currentMonday);
  weekTitleEl.textContent = `KW ${weekKey.split("-W")[1]}`;
  weekRangeEl.textContent = formatRange(currentMonday);

  const plan = getWeekPlans()[weekKey] || {};
  const recipes = getRecipes();

  weekDaysEl.innerHTML = "";
  DAYS.forEach((d, i) => {
    const dateForDay = new Date(currentMonday);
    dateForDay.setDate(dateForDay.getDate() + i);

    const li = document.createElement("li");
    li.className = "day-slot";
    li.dataset.day = d.key;

    const nameEl = document.createElement("div");
    nameEl.className = "day-name";
    nameEl.textContent = `${d.label} ${pad(dateForDay.getDate())}.${pad(dateForDay.getMonth() + 1)}.`;

    const contentEl = document.createElement("div");
    contentEl.className = "day-content";

    const recipeId = plan[d.key];
    const recipe = recipeId && recipes.find((r) => r.id === recipeId);
    if (recipe) {
      contentEl.appendChild(createAssignedCard(recipe, d.key));
    } else {
      const hint = document.createElement("span");
      hint.className = "day-empty-hint";
      hint.textContent = "Rezept hierher ziehen";
      contentEl.appendChild(hint);
    }

    li.append(nameEl, contentEl);
    weekDaysEl.appendChild(li);
  });

  renderWeekPool();
  updateSyncStatus();
}

// --- Drag & drop (pointer events, works for mouse + touch) ---

function createGhost(recipe) {
  const div = document.createElement("div");
  div.className = "drag-ghost";
  if (recipe.thumbUrl) {
    const img = document.createElement("img");
    img.src = recipe.thumbUrl;
    img.style.cssText = "width:100%;display:block;border-radius:12px 12px 0 0;aspect-ratio:4/3;object-fit:cover;";
    img.addEventListener("error", () => img.remove());
    div.appendChild(img);
  }
  const titleDiv = document.createElement("div");
  titleDiv.style.cssText = "background:var(--card);padding:6px 8px;border-radius:0 0 12px 12px;font-size:0.78rem;font-weight:600;";
  titleDiv.textContent = recipe.title;
  div.appendChild(titleDiv);
  return div;
}

function highlightDropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  const day = el && el.closest(".day-slot");
  document.querySelectorAll(".day-slot.drag-over").forEach((d) => {
    if (d !== day) d.classList.remove("drag-over");
  });
  if (day) day.classList.add("drag-over");
}

function clearDropHighlight() {
  document.querySelectorAll(".day-slot.drag-over").forEach((d) => d.classList.remove("drag-over"));
}

function attachDragHandlers(handleEl, cardEl, recipe, sourceDay) {
  handleEl.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    beginDrag(e, cardEl, recipe, sourceDay);
  });
}

function beginDrag(startEvent, sourceEl, recipe, sourceDay) {
  const pointerId = startEvent.pointerId;
  const startX = startEvent.clientX;
  const startY = startEvent.clientY;
  let dragging = false;
  let ghost = null;

  function onMove(ev) {
    if (ev.pointerId !== pointerId) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!dragging) {
      if (Math.hypot(dx, dy) < 10) return;
      dragging = true;
      ghost = createGhost(recipe);
      document.body.appendChild(ghost);
      sourceEl.style.opacity = "0.35";
    }
    ev.preventDefault();
    ghost.style.left = `${ev.clientX}px`;
    ghost.style.top = `${ev.clientY}px`;
    highlightDropTarget(ev.clientX, ev.clientY);
  }

  function finish(ev, drop) {
    if (ev.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    sourceEl.style.opacity = "";
    clearDropHighlight();
    if (ghost) ghost.remove();
    if (drop && dragging) {
      const dayEl = document.elementFromPoint(ev.clientX, ev.clientY);
      const day = dayEl && dayEl.closest(".day-slot");
      if (day) assignRecipeToDay(day.dataset.day, recipe.id, sourceDay);
    }
  }

  function onUp(ev) {
    finish(ev, true);
  }
  function onCancel(ev) {
    finish(ev, false);
  }

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
}

// --- Week plan mutations ---

function assignRecipeToDay(dayKey, recipeId, sourceDay) {
  const weekKey = isoWeekKey(currentMonday);
  const plans = getWeekPlans();
  if (!plans[weekKey]) plans[weekKey] = {};

  if (sourceDay && sourceDay !== dayKey) {
    plans[weekKey][sourceDay] = null;
    markDayPending(weekKey, sourceDay);
  }
  plans[weekKey][dayKey] = recipeId;
  markDayPending(weekKey, dayKey);
  saveWeekPlans(plans);
  renderWeek();
  syncDay(weekKey, dayKey);
  if (sourceDay && sourceDay !== dayKey) syncDay(weekKey, sourceDay);
}

function clearDay(dayKey) {
  const weekKey = isoWeekKey(currentMonday);
  const plans = getWeekPlans();
  if (!plans[weekKey]) plans[weekKey] = {};
  plans[weekKey][dayKey] = null;
  markDayPending(weekKey, dayKey);
  saveWeekPlans(plans);
  renderWeek();
  syncDay(weekKey, dayKey);
}

prevWeekBtn.addEventListener("click", () => {
  currentMonday.setDate(currentMonday.getDate() - 7);
  renderWeek();
});
nextWeekBtn.addEventListener("click", () => {
  currentMonday.setDate(currentMonday.getDate() + 7);
  renderWeek();
});

// --- Sync status ---

function updateSyncStatus() {
  if (!getScriptUrl()) {
    syncStatusEl.textContent = "";
    return;
  }
  const pendingRecipes = getRecipes().filter((r) => !r.synced).length;
  const pendingDays = getPendingDays().length;
  const total = pendingRecipes + pendingDays;
  syncStatusEl.textContent = total === 0 ? "Alles synchronisiert ✓" : `${total} Änderung(en) offen`;
}

function flashSyncStatus(text) {
  syncStatusEl.textContent = text;
  setTimeout(updateSyncStatus, 2500);
}

// --- Google Sheets sync ---

async function syncRecipe(recipe) {
  const url = getScriptUrl();
  if (!url) {
    updateSyncStatus();
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        type: "recipe",
        id: recipe.id,
        title: recipe.title,
        isOwn: !!recipe.isOwn,
        sourceUrl: recipe.sourceUrl || "",
        ingredients: recipe.ingredients || "",
        instructions: recipe.instructions || "",
        thumbUrl: recipe.thumbUrl || "",
        labels: recipe.labels || [],
        note: recipe.note || "",
      }),
    });
    const recipes = getRecipes();
    const target = recipes.find((r) => r.id === recipe.id);
    if (target) {
      target.synced = true;
      saveRecipes(recipes);
      renderPool();
      renderWeekPool();
    }
  } catch (err) {
    // bleibt als "offen" markiert, wird beim naechsten Sync erneut versucht
  }
  updateSyncStatus();
}

async function syncRecipeDelete(id) {
  const url = getScriptUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "recipe", id, deleted: true }),
    });
  } catch (err) {
    // Loeschung wird beim Aktualisieren evtl. erneut noetig, akzeptabel fuer diesen Anwendungsfall
  }
}

async function syncDay(weekKey, dayKey) {
  const url = getScriptUrl();
  if (!url) {
    updateSyncStatus();
    return;
  }
  const plans = getWeekPlans();
  const recipeId = (plans[weekKey] && plans[weekKey][dayKey]) || "";
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: "weekplan", week: weekKey, day: dayKey, recipeId }),
    });
    unmarkDayPending(weekKey, dayKey);
  } catch (err) {
    // bleibt als "offen" markiert
  }
  updateSyncStatus();
}

async function syncAllPending() {
  const url = getScriptUrl();
  if (!url) {
    alert("Bitte zuerst in den Einstellungen die Apps-Script-URL hinterlegen.");
    return;
  }
  const pendingRecipes = getRecipes().filter((r) => !r.synced);
  for (const r of pendingRecipes) await syncRecipe(r);
  const pendingDays = getPendingDays();
  for (const key of pendingDays) {
    const idx = key.lastIndexOf("_");
    await syncDay(key.slice(0, idx), key.slice(idx + 1));
  }
}

saveWeekBtn.addEventListener("click", async () => {
  await syncAllPending();
  flashSyncStatus("Woche gespeichert ✓");
});

async function pullFromSheet(showStatus) {
  const url = getScriptUrl();
  if (!url) return;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("bad status");
    const data = await res.json();
    mergeRemote(data);
    if (showStatus) flashSyncStatus("Aktualisiert ✓");
  } catch (err) {
    if (showStatus) flashSyncStatus("Aktualisierung fehlgeschlagen (offline?)");
  }
}

function mergeRemote(data) {
  const localRecipes = getRecipes();
  const remoteRecipes = (data.recipes || []).map((r) => ({ ...r, synced: true }));
  const merged = remoteRecipes.slice();
  localRecipes.forEach((local) => {
    if (!local.synced && !merged.find((m) => m.id === local.id)) merged.push(local);
  });
  saveRecipes(merged);

  const pendingDays = getPendingDays();
  const localPlans = getWeekPlans();
  const remotePlans = data.weekplans || {};
  const mergedPlans = JSON.parse(JSON.stringify(remotePlans));
  pendingDays.forEach((key) => {
    const idx = key.lastIndexOf("_");
    const weekKey = key.slice(0, idx);
    const dayKey = key.slice(idx + 1);
    if (!mergedPlans[weekKey]) mergedPlans[weekKey] = {};
    mergedPlans[weekKey][dayKey] = (localPlans[weekKey] || {})[dayKey] || null;
  });
  saveWeekPlans(mergedPlans);

  renderPool();
  renderWeek();
}

refreshBtn.addEventListener("click", async () => {
  refreshBtn.disabled = true;
  flashSyncStatus("Suche nach Updates…");
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    }
  } catch (err) {
    // Update-Check fehlgeschlagen - trotzdem neu laden, die App-Shell wird dank
    // Network-first-Strategie im Service Worker ohnehin frisch vom Netz geholt.
  }
  window.location.reload();
});

// --- Recipe modal ---

function updateThumbPreview() {
  const url = rThumbUrlInput.value.trim();
  if (url) {
    rThumbPreviewEl.src = url;
    rThumbPreviewWrapEl.classList.remove("hidden");
  } else {
    rThumbPreviewWrapEl.classList.add("hidden");
  }
}
rThumbPreviewEl.addEventListener("error", () => rThumbPreviewWrapEl.classList.add("hidden"));
rThumbUrlInput.addEventListener("input", updateThumbPreview);

function updateOwnRecipeUI() {
  const isOwn = rIsOwnInput.checked;
  sourceUrlFieldEl.classList.toggle("hidden", isOwn);
  rSourceUrlInput.required = !isOwn;
  ownRecipeFieldsEl.classList.toggle("hidden", !isOwn);
}
rIsOwnInput.addEventListener("change", updateOwnRecipeUI);

function openRecipeModal(recipe) {
  editingRecipeId = recipe ? recipe.id : null;
  recipeModalTitleEl.textContent = recipe ? "Rezept bearbeiten" : "Neues Rezept";
  rTitleInput.value = recipe?.title || "";
  rIsOwnInput.checked = !!recipe?.isOwn;
  rSourceUrlInput.value = recipe?.sourceUrl || "";
  rIngredientsInput.value = recipe?.ingredients || "";
  rInstructionsInput.value = recipe?.instructions || "";
  rThumbUrlInput.value = recipe?.thumbUrl || "";
  rLabelsInput.value = (recipe?.labels || []).join(", ");
  rNoteInput.value = recipe?.note || "";
  autoThumbStatusEl.textContent = "";
  thumbSuggestionsEl.innerHTML = "";
  thumbSuggestionsEl.classList.add("hidden");
  deleteRecipeBtn.classList.toggle("hidden", !recipe);
  updateOwnRecipeUI();
  updateThumbPreview();
  recipeModal.classList.remove("hidden");
}

function closeRecipeModal() {
  recipeModal.classList.add("hidden");
}

// --- Rezept-Detailansicht (eigene Rezepte) ---

function openRecipeDetail(recipe) {
  detailRecipeId = recipe.id;
  detailTitleEl.textContent = recipe.title;
  if (recipe.thumbUrl) {
    detailThumbEl.src = recipe.thumbUrl;
    detailThumbEl.classList.remove("hidden");
  } else {
    detailThumbEl.classList.add("hidden");
  }
  detailLabelsEl.innerHTML = "";
  (recipe.labels || []).forEach((l) => {
    const badge = document.createElement("span");
    badge.className = "recipe-label-badge";
    badge.textContent = l;
    detailLabelsEl.appendChild(badge);
  });
  detailIngredientsWrapEl.classList.toggle("hidden", !recipe.ingredients);
  detailIngredientsEl.textContent = recipe.ingredients || "";
  detailInstructionsWrapEl.classList.toggle("hidden", !recipe.instructions);
  detailInstructionsEl.textContent = recipe.instructions || "";
  detailNoteWrapEl.classList.toggle("hidden", !recipe.note);
  detailNoteEl.textContent = recipe.note || "";
  recipeDetailModal.classList.remove("hidden");
}

function closeRecipeDetail() {
  recipeDetailModal.classList.add("hidden");
}

closeDetailBtn.addEventListener("click", closeRecipeDetail);
editFromDetailBtn.addEventListener("click", () => {
  const recipe = getRecipes().find((r) => r.id === detailRecipeId);
  closeRecipeDetail();
  if (recipe) openRecipeModal(recipe);
});

addRecipeBtn.addEventListener("click", () => openRecipeModal(null));
cancelRecipeBtn.addEventListener("click", closeRecipeModal);

recipeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = rTitleInput.value.trim();
  const isOwn = rIsOwnInput.checked;
  const sourceUrl = rSourceUrlInput.value.trim();
  const ingredients = rIngredientsInput.value.trim();
  const instructions = rInstructionsInput.value.trim();
  const thumbUrl = rThumbUrlInput.value.trim();
  const labels = parseLabelsInput(rLabelsInput.value);
  const note = rNoteInput.value.trim();
  if (!title) return;
  if (!isOwn && !sourceUrl) return;

  const recipes = getRecipes();
  let recipe;
  if (editingRecipeId) {
    recipe = recipes.find((r) => r.id === editingRecipeId);
    if (recipe) {
      recipe.title = title;
      recipe.isOwn = isOwn;
      recipe.sourceUrl = sourceUrl;
      recipe.ingredients = ingredients;
      recipe.instructions = instructions;
      recipe.thumbUrl = thumbUrl;
      recipe.labels = labels;
      recipe.note = note;
      recipe.synced = false;
    }
  } else {
    recipe = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      isOwn,
      sourceUrl,
      ingredients,
      instructions,
      thumbUrl,
      labels,
      note,
      synced: false,
    };
    recipes.push(recipe);
  }
  saveRecipes(recipes);
  renderPool();
  renderWeekPool();
  renderWeek();
  closeRecipeModal();
  syncRecipe(recipe);
});

deleteRecipeBtn.addEventListener("click", () => {
  if (!editingRecipeId) return;
  const recipes = getRecipes();
  const recipe = recipes.find((r) => r.id === editingRecipeId);
  if (!recipe) return;
  if (!confirm(`"${recipe.title}" wirklich aus dem Rezepte-Pool löschen?`)) return;
  saveRecipes(recipes.filter((r) => r.id !== editingRecipeId));
  renderPool();
  renderWeekPool();
  renderWeek();
  closeRecipeModal();
  syncRecipeDelete(editingRecipeId);
});

// --- Bildvorschau / -suche ---

async function searchGoogleImages(query) {
  const key = getGoogleApiKey();
  const cx = getGoogleCseId();
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&searchType=image&num=8&safe=active`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Google-Suche fehlgeschlagen");
  return (data.items || []).map((item) => ({
    url: item.link,
    thumbnail: item.image?.thumbnailLink || item.link,
  }));
}

function renderThumbSuggestions(results) {
  thumbSuggestionsEl.innerHTML = "";
  if (!results.length) {
    thumbSuggestionsEl.classList.add("hidden");
    return;
  }
  results.forEach((r) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb-suggestion";
    const img = document.createElement("img");
    img.src = r.thumbnail;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => btn.remove());
    btn.appendChild(img);
    btn.addEventListener("click", () => {
      rThumbUrlInput.value = r.url;
      updateThumbPreview();
      thumbSuggestionsEl.querySelectorAll(".thumb-suggestion").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
    thumbSuggestionsEl.appendChild(btn);
  });
  thumbSuggestionsEl.classList.remove("hidden");
}

async function tryOgImageScrape(url) {
  const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxied);
  if (!res.ok) throw new Error("fetch failed");
  const html = await res.text();
  const match =
    html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
  return match ? match[1] : null;
}

autoThumbBtn.addEventListener("click", async () => {
  const title = rTitleInput.value.trim();
  const sourceUrl = rSourceUrlInput.value.trim();
  if (!title && !sourceUrl) {
    autoThumbStatusEl.textContent = "Bitte zuerst einen Titel eintragen.";
    return;
  }
  autoThumbStatusEl.textContent = "Suche Bilder…";
  autoThumbBtn.disabled = true;
  thumbSuggestionsEl.innerHTML = "";
  thumbSuggestionsEl.classList.add("hidden");
  try {
    if (getGoogleApiKey() && getGoogleCseId()) {
      const query = title || hostnameFromUrl(sourceUrl);
      const results = await searchGoogleImages(query);
      if (results.length) {
        renderThumbSuggestions(results);
        autoThumbStatusEl.textContent = `${results.length} Vorschläge gefunden – zum Übernehmen anklicken.`;
      } else {
        autoThumbStatusEl.textContent = "Keine Bilder gefunden – bitte Bild-URL manuell eintragen.";
      }
      return;
    }
    if (!sourceUrl) {
      autoThumbStatusEl.textContent =
        "Für Bildvorschläge bei eigenen Rezepten bitte die Google-Bildersuche in den Einstellungen einrichten (siehe README), oder Bild-URL manuell eintragen.";
      return;
    }
    const found = await tryOgImageScrape(sourceUrl);
    if (found) {
      rThumbUrlInput.value = found;
      updateThumbPreview();
      autoThumbStatusEl.textContent = "Vorschaubild gefunden ✓";
    } else {
      autoThumbStatusEl.textContent =
        "Kein Vorschaubild gefunden – bitte Bild-URL manuell eintragen, oder Google-Bildersuche in den Einstellungen einrichten für mehr Auswahl.";
    }
  } catch (err) {
    autoThumbStatusEl.textContent = "Automatischer Abruf fehlgeschlagen – bitte Bild-URL manuell eintragen.";
  } finally {
    autoThumbBtn.disabled = false;
  }
});

// --- Settings ---

settingsBtn.addEventListener("click", () => {
  scriptUrlInput.value = getScriptUrl();
  googleApiKeyInput.value = getGoogleApiKey();
  googleCseIdInput.value = getGoogleCseId();
  themeSelect.value = localStorage.getItem(STORAGE_THEME) || "system";
  settingsModal.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

saveSettingsBtn.addEventListener("click", () => {
  localStorage.setItem(STORAGE_SCRIPT_URL, scriptUrlInput.value.trim());
  localStorage.setItem(STORAGE_GOOGLE_API_KEY, googleApiKeyInput.value.trim());
  localStorage.setItem(STORAGE_GOOGLE_CSE_ID, googleCseIdInput.value.trim());
  localStorage.setItem(STORAGE_THEME, themeSelect.value);
  applyTheme();
  updateSyncStatus();
  settingsModal.classList.add("hidden");
  if (getScriptUrl()) pullFromSheet(false);
});

// --- Init ---

applyTheme();
renderVersionInfo();
renderPool();
renderWeek();
if (getScriptUrl()) pullFromSheet(false);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

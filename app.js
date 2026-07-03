const STORAGE_RECIPES = "recipes";
const STORAGE_WEEKPLANS = "weekPlans";
const STORAGE_PENDING_DAYS = "pendingWeekDays";
const STORAGE_SCRIPT_URL = "scriptUrl";
const STORAGE_THEME = "themeMode";

// Standard-Verbindung zum gemeinsamen Familien-Sheet. In den Einstellungen ueberschreibbar.
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyhZOVVg8KdMcjCF7uwjXXsK7DJH_QvxpaGGoU3RT0MtnHQumsFFIkwJtVXr0H1WTk/exec";

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

const recipeModal = document.getElementById("recipeModal");
const recipeModalTitleEl = document.getElementById("recipeModalTitle");
const recipeForm = document.getElementById("recipeForm");
const rTitleInput = document.getElementById("rTitle");
const rSourceUrlInput = document.getElementById("rSourceUrl");
const rThumbUrlInput = document.getElementById("rThumbUrl");
const rNoteInput = document.getElementById("rNote");
const autoThumbBtn = document.getElementById("autoThumbBtn");
const autoThumbStatusEl = document.getElementById("autoThumbStatus");
const rThumbPreviewWrapEl = document.getElementById("rThumbPreviewWrap");
const rThumbPreviewEl = document.getElementById("rThumbPreview");
const deleteRecipeBtn = document.getElementById("deleteRecipeBtn");
const cancelRecipeBtn = document.getElementById("cancelRecipeBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const scriptUrlInput = document.getElementById("scriptUrl");
const themeSelect = document.getElementById("themeSelect");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

let editingRecipeId = null;
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

// --- Date helpers ---

function pad(n) {
  return String(n).padStart(2, "0");
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
  const source = document.createElement("a");
  source.className = "recipe-source";
  source.href = recipe.sourceUrl;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = hostnameFromUrl(recipe.sourceUrl);
  source.addEventListener("pointerdown", (e) => e.stopPropagation());
  body.append(title, source);
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
    attachDragHandlers(card, recipe, null);
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
  const source = document.createElement("div");
  source.className = "recipe-source";
  source.textContent = hostnameFromUrl(recipe.sourceUrl);
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

  attachDragHandlers(wrap, recipe, dayKey);
  return wrap;
}

function renderPool() {
  const recipes = getRecipes();
  poolListEl.innerHTML = "";
  recipes.forEach((r) => poolListEl.appendChild(createRecipeCard(r, { showActions: true })));
  poolEmptyHintEl.classList.toggle("hidden", recipes.length > 0);
}

function renderWeekPool() {
  const recipes = getRecipes();
  weekPoolListEl.innerHTML = "";
  recipes.forEach((r) => weekPoolListEl.appendChild(createRecipeCard(r, { draggable: true })));
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

function attachDragHandlers(el, recipe, sourceDay) {
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    beginDrag(e, el, recipe, sourceDay);
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
        sourceUrl: recipe.sourceUrl,
        thumbUrl: recipe.thumbUrl || "",
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

refreshBtn.addEventListener("click", () => pullFromSheet(true));

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

function openRecipeModal(recipe) {
  editingRecipeId = recipe ? recipe.id : null;
  recipeModalTitleEl.textContent = recipe ? "Rezept bearbeiten" : "Neues Rezept";
  rTitleInput.value = recipe?.title || "";
  rSourceUrlInput.value = recipe?.sourceUrl || "";
  rThumbUrlInput.value = recipe?.thumbUrl || "";
  rNoteInput.value = recipe?.note || "";
  autoThumbStatusEl.textContent = "";
  deleteRecipeBtn.classList.toggle("hidden", !recipe);
  updateThumbPreview();
  recipeModal.classList.remove("hidden");
}

function closeRecipeModal() {
  recipeModal.classList.add("hidden");
}

addRecipeBtn.addEventListener("click", () => openRecipeModal(null));
cancelRecipeBtn.addEventListener("click", closeRecipeModal);

recipeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = rTitleInput.value.trim();
  const sourceUrl = rSourceUrlInput.value.trim();
  const thumbUrl = rThumbUrlInput.value.trim();
  const note = rNoteInput.value.trim();
  if (!title || !sourceUrl) return;

  const recipes = getRecipes();
  let recipe;
  if (editingRecipeId) {
    recipe = recipes.find((r) => r.id === editingRecipeId);
    if (recipe) {
      recipe.title = title;
      recipe.sourceUrl = sourceUrl;
      recipe.thumbUrl = thumbUrl;
      recipe.note = note;
      recipe.synced = false;
    }
  } else {
    recipe = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      sourceUrl,
      thumbUrl,
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

// --- Auto-thumbnail lookup ---

autoThumbBtn.addEventListener("click", async () => {
  const url = rSourceUrlInput.value.trim();
  if (!url) {
    autoThumbStatusEl.textContent = "Bitte zuerst eine Quelle-URL eintragen.";
    return;
  }
  autoThumbStatusEl.textContent = "Suche Vorschaubild…";
  autoThumbBtn.disabled = true;
  try {
    const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxied);
    if (!res.ok) throw new Error("fetch failed");
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    if (match && match[1]) {
      rThumbUrlInput.value = match[1];
      updateThumbPreview();
      autoThumbStatusEl.textContent = "Vorschaubild gefunden ✓";
    } else {
      autoThumbStatusEl.textContent =
        "Kein Vorschaubild gefunden – bitte Bild-URL manuell eintragen (Rechtsklick auf ein Bild der Rezeptseite → „Bildadresse kopieren“).";
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
  themeSelect.value = localStorage.getItem(STORAGE_THEME) || "system";
  settingsModal.classList.remove("hidden");
});

closeSettingsBtn.addEventListener("click", () => settingsModal.classList.add("hidden"));

saveSettingsBtn.addEventListener("click", () => {
  localStorage.setItem(STORAGE_SCRIPT_URL, scriptUrlInput.value.trim());
  localStorage.setItem(STORAGE_THEME, themeSelect.value);
  applyTheme();
  updateSyncStatus();
  settingsModal.classList.add("hidden");
  if (getScriptUrl()) pullFromSheet(false);
});

// --- Init ---

applyTheme();
renderPool();
renderWeek();
if (getScriptUrl()) pullFromSheet(false);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

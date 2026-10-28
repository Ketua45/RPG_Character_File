// Logique de l'application Atelier de Fiches JDR

const ROSTER_STORAGE_KEY = "rpg-studio-roster-v1";
const ACTIVE_ID_KEY = "rpg-studio-active-id-v1";

let roster = [];
let currentChar = null;
let previewTimer = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function showToast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

function loadRoster() {
  try {
    const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        roster = parsed;
      }
    }
  } catch (e) {
    console.warn("Erreur lecture roster local :", e);
  }

  if (roster.length === 0) {
    roster = [
      structuredClone(CHARACTER_TEMPLATES.elara),
      structuredClone(CHARACTER_TEMPLATES.guerrier),
      structuredClone(CHARACTER_TEMPLATES.mage)
    ];
    saveRoster();
  }

  // Normaliser les contraintes (XP >= 350, caractéristiques 30-70 + bonus, charges d'objets magiques)
  roster.forEach(ch => {
    (ch.vitals || []).forEach(v => {
      if (v.key === "xp" && (Number(v.value) || 0) < 350) v.value = 350;
    });
    (ch.stats || []).forEach(st => {
      if (st.bonus === undefined) {
        if (st.value > 70) {
          st.bonus = st.value - 70;
          st.value = 70;
        } else if (st.value < 30) {
          st.bonus = st.value - 30;
          st.value = 30;
        } else {
          st.bonus = 0;
        }
      }
      st.value = Math.max(30, Math.min(70, Number(st.value) || 50));
    });
    if (Array.isArray(ch.magicItems)) {
      ch.magicItems.forEach(m => {
        if (m.maxCharges === undefined) m.maxCharges = 0;
        if (m.charges === undefined) m.charges = m.maxCharges;
        if (m.rechargeOnScenario === undefined) m.rechargeOnScenario = m.maxCharges > 0;
      });
    }
    if (!Array.isArray(ch.skills)) {
      if (ch.id === "elara-lorens") ch.skills = structuredClone(CHARACTER_TEMPLATES.elara.skills);
      else if (ch.id === "garrick-vane") ch.skills = structuredClone(CHARACTER_TEMPLATES.guerrier.skills);
      else if (ch.id === "lyra-valen") ch.skills = structuredClone(CHARACTER_TEMPLATES.mage.skills);
      else ch.skills = [];
    }
    if (!Array.isArray(ch.gear)) {
      if (ch.id === "elara-lorens") ch.gear = structuredClone(CHARACTER_TEMPLATES.elara.gear);
      else if (ch.id === "garrick-vane") ch.gear = structuredClone(CHARACTER_TEMPLATES.guerrier.gear);
      else if (ch.id === "lyra-valen") ch.gear = structuredClone(CHARACTER_TEMPLATES.mage.gear);
      else ch.gear = [];
    }
  });

  const savedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
  currentChar = roster.find(c => c.id === savedActiveId) || roster[0];
}

function saveRoster() {
  try {
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
    if (currentChar) {
      localStorage.setItem(ACTIVE_ID_KEY, currentChar.id);
    }
  } catch (e) {
    console.warn("Erreur sauvegarde roster local :", e);
  }
}

function renderRosterSelect() {
  const sel = $("#roster-select");
  sel.innerHTML = roster
    .map(c => `<option value="${escapeHtml(c.id)}" ${c.id === currentChar.id ? "selected" : ""}>${escapeHtml(c.name || "Sans nom")} (${escapeHtml(c.subtitle?.split("·")[0]?.trim() || "Perso")})</option>`)
    .join("");
}

function selectCharacter(id) {
  const found = roster.find(c => c.id === id);
  if (!found) return;
  currentChar = found;
  saveRoster();
  renderRosterSelect();
  renderEditor();
  updatePreview(true);
}

function createFromTemplate(tplKey) {
  const tpl = CHARACTER_TEMPLATES[tplKey] || CHARACTER_TEMPLATES.vierge;
  const copy = structuredClone(tpl);
  const suffix = Date.now().toString(36).slice(-4);
  if (tplKey === "vierge") {
    copy.name = "NOUVEAU PERSONNAGE";
  } else {
    copy.name = tpl.name;
  }
  copy.id = slugify(copy.name) + "-" + suffix;
  copy.storageKey = slugify(copy.name) + "-" + suffix + "-v1";
  roster.unshift(copy);
  currentChar = copy;
  saveRoster();
  renderRosterSelect();
  renderEditor();
  updatePreview(true);
  $("#new-char-modal").classList.remove("open");
  showToast(`Personnage "${copy.name}" créé !`);
}

function duplicateCurrentCharacter() {
  if (!currentChar) return;
  const copy = structuredClone(currentChar);
  const suffix = Date.now().toString(36).slice(-4);
  copy.name = (currentChar.name || "Personnage") + " (Copie)";
  copy.id = slugify(copy.name) + "-" + suffix;
  copy.storageKey = slugify(copy.name) + "-" + suffix + "-v1";
  roster.unshift(copy);
  currentChar = copy;
  saveRoster();
  renderRosterSelect();
  renderEditor();
  updatePreview(true);
  showToast("Personnage dupliqué !");
}

function deleteCurrentCharacter() {
  if (roster.length <= 1) {
    alert("Vous devez conserver au moins un personnage dans l'atelier.");
    return;
  }
  if (!confirm(`Supprimer "${currentChar.name}" de la bibliothèque de l'atelier ?`)) return;
  roster = roster.filter(c => c.id !== currentChar.id);
  currentChar = roster[0];
  saveRoster();
  renderRosterSelect();
  renderEditor();
  updatePreview(true);
  showToast("Personnage supprimé.");
}

// ---- Rendu des onglets de l'éditeur
function renderEditor() {
  if (!currentChar) return;

  // Onglet 1 : Identité & Thème
  $("#char-name").value = currentChar.name || "";
  $("#char-subtitle").value = currentChar.subtitle || "";
  $("#char-storage-key").value = currentChar.storageKey || "";
  $("#portrait-img").src = currentChar.portrait || DEFAULT_AVATARS.ranger;
  $("#theme-preset").value = currentChar.theme?.preset || "forest";
  $("#theme-mode").value = currentChar.theme?.defaultMode || "auto";

  renderColorPickers();
  renderVitalsList();
  renderStatsList();
  renderWeaponsList();
  renderSkillsList();
  renderResourcesList();

  $("#scenar-btn-label").value = currentChar.scenarioBtnLabel || "⟳ Nouveau scénario (recharge pouvoirs)";
  $("#rest-btn-label").value = currentChar.restBtnLabel || "☾ Repos : PV au max";

  $("#inv-section-title").value = currentChar.inventoryTitle || "Inventaire & Équipement";
  $("#items-card-title").value = currentChar.itemsCardTitle || "Inventaire consommable";
  $("#gear-card-title").value = currentChar.gearCardTitle || "Inventaire non consommable";
  $("#show-secondary-card").checked = currentChar.showSecondaryCard !== false;
  $("#secondary-card-title").value = currentChar.secondaryCardTitle || "Tableau de chasse";

  renderItemsList();
  renderGearList();
  renderChasseList();
  renderMagicItemsList();
  renderSessionsList();

  if (!currentChar.lore) {
    currentChar.lore = { backstory: "", appearance: "", relations: "" };
  }
  $("#lore-backstory").value = currentChar.lore.backstory || "";
  $("#lore-appearance").value = currentChar.lore.appearance || "";
  $("#lore-relations").value = currentChar.lore.relations || "";

  $("#char-cond").value = currentChar.cond || "";
  $("#char-notes").value = currentChar.notes || "";
}

const COLOR_FIELDS = [
  { key: "band", label: "Bannière" },
  { key: "acc", label: "Titres / Accent" },
  { key: "gold", label: "Dorures / Bordures" },
  { key: "bg", label: "Fond (Clair)" },
  { key: "card", label: "Cartes (Clair)" },
  { key: "red", label: "Jauge PV / Rouge" },
  { key: "pur", label: "Jauge Corruption" },
  { key: "darkBg", label: "Fond (Sombre)" },
  { key: "darkCard", label: "Cartes (Sombre)" },
  { key: "darkBand", label: "Bannière (Sombre)" }
];

function renderColorPickers() {
  const container = $("#color-pickers");
  const colors = currentChar.theme?.colors || THEME_PRESETS.forest.colors;
  container.innerHTML = COLOR_FIELDS.map(f => `
    <label class="color-item">
      <input type="color" data-color-key="${f.key}" value="${colors[f.key] || "#000000"}">
      <span>${f.label}</span>
    </label>
  `).join("");

  container.querySelectorAll("input[type='color']").forEach(inp => {
    inp.addEventListener("input", e => {
      const k = e.target.dataset.colorKey;
      currentChar.theme.preset = "custom";
      $("#theme-preset").value = "custom";
      currentChar.theme.colors[k] = e.target.value;
      onCharUpdated();
    });
  });
}

function renderVitalsList() {
  const container = $("#vitals-list");
  const colorOptions = [
    { val: "--red", label: "Rouge (PV)" },
    { val: "--pur", label: "Pourpre (Folie/Corr.)" },
    { val: "--acc", label: "Accent (XP/Chance)" },
    { val: "--gold", label: "Or (Monnaie)" },
    { val: "--mid", label: "Émeraude" }
  ];

  container.innerHTML = currentChar.vitals.map((v, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" class="grow" data-field="label" value="${escapeHtml(v.label)}" placeholder="Nom du compteur (ex: Points de vie)">
      <label style="font-size:11px;color:var(--mute)">${v.key === "xp" ? "Val. (min 350)" : "Val."}
        <input type="number" class="num-input" data-field="value" value="${v.key === "xp" ? Math.max(350, v.value) : v.value}" ${v.key === "xp" ? 'min="350"' : ""}>
      </label>
      <label style="font-size:11px;color:var(--mute)">Max (0=aucun)
        <input type="number" class="num-input" data-field="max" value="${v.max || 0}">
      </label>
      <select data-field="color">
        ${colorOptions.map(o => `<option value="${o.val}" ${v.color === o.val ? "selected" : ""}>${o.label}</option>`).join("")}
      </select>
      <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer" title="Afficher une barre de progression">
        <input type="checkbox" data-field="showBar" ${v.showBar ? "checked" : ""}> Barre
      </label>
      ${v.isHp ? `<span style="font-size:11px;color:var(--gold);font-weight:700;padding:0 4px" title="Compteur de Points de vie principal">★ PV</span>` : `
        <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
      `}
    </div>
  `).join("");

  bindListEvents(container, currentChar.vitals, renderVitalsList, (item, field, val) => {
    if (field === "value" && item.key === "xp" && val < 350) {
      return 350;
    }
  });
}

function renderStatsList() {
  const container = $("#stats-list");
  container.innerHTML = currentChar.stats.map((st, idx) => {
    const base = Math.max(30, Math.min(70, Number(st.value) || 50));
    const bonus = Number(st.bonus) || 0;
    const tot = base + bonus;
    return `
    <div class="list-row" data-idx="${idx}">
      <input type="text" class="grow" data-field="label" value="${escapeHtml(st.label)}" placeholder="Libellé affiché (ex: Consti.)">
      <label style="font-size:11px;color:var(--mute)">Base (30–70)
        <input type="number" class="num-input" data-field="value" value="${base}" min="30" max="70">
      </label>
      <label style="font-size:11px;color:var(--mute)" title="Bonus ponctuel lié à un objet ou consommable">Bonus (+/-)
        <input type="number" class="num-input" data-field="bonus" value="${bonus}" min="-50" max="50" style="color:var(--gold)">
      </label>
      <span class="stat-tot-badge" style="min-width:68px;text-align:center;font-size:12px;color:var(--mute)">Total : <b style="color:var(--ink);font-size:14px">${tot}</b></span>
      <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.stats.length - 1 ? "disabled" : ""}>↓</button>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `}).join("");

  bindListEvents(container, currentChar.stats, renderStatsList, (item, field, val, row) => {
    if (field === "label") {
      item.label = val;
      item.key = val.replace(/\./g, "").trim() || ("Stat" + Date.now());
    }
    if (field === "value") {
      val = Math.max(30, Math.min(70, val));
    }
    const nextBase = field === "value" ? val : (Number(item.value) || 50);
    const nextBon = field === "bonus" ? val : (Number(item.bonus) || 0);
    const badge = row?.querySelector(".stat-tot-badge b");
    if (badge) badge.textContent = nextBase + nextBon;
    return val;
  });
}

function renderWeaponsList() {
  const container = $("#weapons-list");
  container.innerHTML = currentChar.weapons.map((w, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" class="grow" data-field="name" value="${escapeHtml(w.name)}" placeholder="Nom de l'arme ou du jet (ex: Arc d'Aric)">
      <input type="text" style="width:110px;text-align:center;font-weight:700" data-field="expr" value="${escapeHtml(w.expr)}" placeholder="Ex: 1d10+1">
      <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.weapons.length - 1 ? "disabled" : ""}>↓</button>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `).join("");

  bindListEvents(container, currentChar.weapons, renderWeaponsList);
}

function renderSkillsList() {
  const container = $("#skills-list");
  if (!container) return;
  if (!Array.isArray(currentChar.skills)) {
    currentChar.skills = [];
  }
  const statOptions = [
    { key: "", label: "(Passif / Sans jet)" },
    ...(currentChar.stats || []).map(st => ({ key: st.key, label: st.label || st.key }))
  ];

  container.innerHTML = currentChar.skills.map((sk, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" style="width:170px;font-weight:700" data-field="name" value="${escapeHtml(sk.name || "")}" placeholder="Nom (ex: Pistage)">
      <select data-field="stat" title="Caractéristique associée">
        ${statOptions.map(o => `<option value="${escapeHtml(o.key)}" ${sk.stat === o.key ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}
      </select>
      <label style="font-size:11px;color:var(--mute)" title="Bonus ou malus au jet de compétence">Bonus (+/-)
        <input type="number" class="num-input" data-field="bonus" value="${Number(sk.bonus) || 0}" min="-50" max="50" style="color:var(--gold)">
      </label>
      <input type="text" class="grow" data-field="desc" value="${escapeHtml(sk.desc || "")}" placeholder="Description / effets de la compétence…">
      <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.skills.length - 1 ? "disabled" : ""}>↓</button>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `).join("");

  bindListEvents(container, currentChar.skills, renderSkillsList, null, "play");
}

function renderResourcesList() {
  const container = $("#resources-list");
  container.innerHTML = currentChar.resources.map((r, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" style="width:170px;font-weight:700" data-field="name" value="${escapeHtml(r.name)}" placeholder="Nom (ex: Anneau de foudre)">
      <input type="text" class="grow" data-field="desc" value="${escapeHtml(r.desc || "")}" placeholder="Description ou effet…">
      <label style="font-size:11px;color:var(--mute)">Actuel
        <input type="number" style="width:56px;text-align:center" data-field="value" value="${r.value}" min="0" max="20">
      </label>
      <label style="font-size:11px;color:var(--mute)">Max
        <input type="number" style="width:56px;text-align:center" data-field="max" value="${r.max}" min="1" max="20">
      </label>
      <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer" title="Se recharge automatiquement quand on clique sur Nouveau scénario">
        <input type="checkbox" data-field="rechargeOnScenario" ${r.rechargeOnScenario !== false ? "checked" : ""}> Recharge scénar.
      </label>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `).join("");

  bindListEvents(container, currentChar.resources, renderResourcesList);
}

function renderItemsList() {
  const container = $("#items-list");
  container.innerHTML = currentChar.items.map((it, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" class="grow" data-field="label" value="${escapeHtml(it.label)}" placeholder="Nom du consommable (ex: Rations)">
      <label style="font-size:11px;color:var(--mute)">Qté
        <input type="number" class="num-input" data-field="value" value="${it.value}" min="0">
      </label>
      <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.items.length - 1 ? "disabled" : ""}>↓</button>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `).join("");

  bindListEvents(container, currentChar.items, renderItemsList, null, "play");
}

function renderGearList() {
  const container = $("#gear-list");
  if (!container) return;
  if (!Array.isArray(currentChar.gear)) {
    currentChar.gear = [];
  }
  container.innerHTML = currentChar.gear.map((g, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" class="grow" data-field="label" value="${escapeHtml(g.label)}" placeholder="Nom de l'objet classique (ex: Corde 10m)">
      <label style="font-size:11px;color:var(--mute)">Qté
        <input type="number" class="num-input" data-field="value" value="${g.value}" min="0">
      </label>
      <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.gear.length - 1 ? "disabled" : ""}>↓</button>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `).join("");

  bindListEvents(container, currentChar.gear, renderGearList, null, "play");
}

function renderChasseList() {
  const container = $("#chasse-list");
  container.innerHTML = (currentChar.chasse || []).map((ch, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" class="grow" data-field="label" value="${escapeHtml(ch.label)}" placeholder="Entrée (ex: Gobelins)">
      <label style="font-size:11px;color:var(--mute)">Score
        <input type="number" class="num-input" data-field="value" value="${ch.value}" min="0">
      </label>
      <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.chasse.length - 1 ? "disabled" : ""}>↓</button>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `).join("");

  bindListEvents(container, currentChar.chasse, renderChasseList, (item, field, val) => {
    if (field === "label") {
      item.label = val;
      item.key = val || ("Entree_" + Date.now());
    }
  }, "lore");
}

function renderMagicItemsList() {
  const container = $("#magic-items-list");
  if (!container) return;
  if (!Array.isArray(currentChar.magicItems)) {
    currentChar.magicItems = currentChar.id === "elara-lorens"
      ? structuredClone(CHARACTER_TEMPLATES.elara.magicItems)
      : [];
  }
  container.innerHTML = currentChar.magicItems.map((m, idx) => `
    <div class="list-row" data-idx="${idx}">
      <input type="text" style="width:155px;font-weight:700" data-field="name" value="${escapeHtml(m.name || "")}" placeholder="Nom (ex: Arc d'Aric)">
      <input type="text" style="width:105px" data-field="slot" value="${escapeHtml(m.slot || "")}" placeholder="Type (Anneau…)">
      <input type="text" class="grow" data-field="desc" value="${escapeHtml(m.desc || "")}" placeholder="Effets / propriétés magiques…">
      <label style="font-size:11px;color:var(--mute)" title="Charges actuelles">Act.
        <input type="number" style="width:50px;text-align:center" data-field="charges" value="${m.charges ?? m.maxCharges ?? 0}" min="0" max="20">
      </label>
      <label style="font-size:11px;color:var(--mute)" title="Charges max par scénario (0 = objet passif sans charges)">Max
        <input type="number" style="width:50px;text-align:center" data-field="maxCharges" value="${m.maxCharges || 0}" min="0" max="20">
      </label>
      <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer" title="Se recharge au clic sur Nouveau scénario">
        <input type="checkbox" data-field="rechargeOnScenario" ${m.rechargeOnScenario !== false ? "checked" : ""}> ⟳ scénar.
      </label>
      <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer" title="Objet équipé">
        <input type="checkbox" data-field="equipped" ${m.equipped !== false ? "checked" : ""}> Équipé
      </label>
      <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.magicItems.length - 1 ? "disabled" : ""}>↓</button>
      <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
    </div>
  `).join("");

  bindListEvents(container, currentChar.magicItems, renderMagicItemsList, (item, field, val) => {
    if (field === "maxCharges" && (item.charges === undefined || item.charges > val || item.maxCharges === 0)) {
      item.charges = val;
    }
    return val;
  }, "play");
}

function renderSessionsList() {
  const container = $("#sessions-list");
  if (!container) return;
  if (!Array.isArray(currentChar.sessions)) {
    currentChar.sessions = [];
  }
  container.innerHTML = currentChar.sessions.map((s, idx) => `
    <div class="list-row" data-idx="${idx}" style="flex-direction:column;align-items:stretch;gap:6px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="text" class="grow" style="font-weight:700" data-field="title" value="${escapeHtml(s.title || "")}" placeholder="Nom du scénario (ex: Les Ombres de Bois-Maudit)">
        <input type="text" style="width:140px" data-field="date" value="${escapeHtml(s.date || "")}" placeholder="Date / Scénario #">
        <input type="text" style="width:160px" data-field="rewards" value="${escapeHtml(s.rewards || "")}" placeholder="Gains (+XP, +PO…)">
        <button class="icon-btn" data-action="up" title="Monter" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-btn" data-action="down" title="Descendre" ${idx === currentChar.sessions.length - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-btn del" data-action="del" title="Supprimer">×</button>
      </div>
      <textarea rows="2" data-field="summary" placeholder="Résumé du scénario, faits marquants, PNJ rencontrés…" style="width:100%;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 8px;resize:vertical">${escapeHtml(s.summary || "")}</textarea>
    </div>
  `).join("");

  bindListEvents(container, currentChar.sessions, renderSessionsList, null, "sessions");
}

function bindListEvents(container, arr, rerenderFn, customSetter, previewTabHint = null) {
  container.querySelectorAll(".list-row").forEach(row => {
    const idx = Number(row.dataset.idx);
    row.querySelectorAll("input, select, textarea").forEach(inp => {
      inp.addEventListener("input", e => {
        const field = e.target.dataset.field;
        if (!field) return;
        let val = e.target.type === "checkbox" ? e.target.checked : e.target.type === "number" ? Number(e.target.value) : e.target.value;
        if (customSetter) {
          const maybeVal = customSetter(arr[idx], field, val, row);
          if (maybeVal !== undefined) val = maybeVal;
        }
        arr[idx][field] = val;
        onCharUpdated(false, previewTabHint);
      });
    });

    row.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.dataset.action;
        if (act === "del") {
          arr.splice(idx, 1);
        } else if (act === "up" && idx > 0) {
          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        } else if (act === "down" && idx < arr.length - 1) {
          [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
        }
        rerenderFn();
        onCharUpdated(true, previewTabHint);
      });
    });
  });
}

// ---- Mise à jour & Aperçu en direct
function onCharUpdated(immediate = false, forceSheetTab = null) {
  saveRoster();
  renderRosterSelect();
  updatePreview(immediate, forceSheetTab);
}

function updatePreview(immediate = false, forceSheetTab = null) {
  clearTimeout(previewTimer);
  const run = () => {
    if (!currentChar) return;
    try {
      localStorage.removeItem(currentChar.storageKey);
    } catch (e) {}
    const frame = $("#preview-frame");
    let prevScrollY = 0;
    let activeSheetTab = forceSheetTab || "play";
    try {
      if (frame.contentWindow) {
        prevScrollY = frame.contentWindow.scrollY || 0;
      }
      if (!forceSheetTab && frame.contentDocument) {
        const activeBtn = frame.contentDocument.querySelector(".sheet-tab.active");
        if (activeBtn && activeBtn.dataset.sheetTab) {
          activeSheetTab = activeBtn.dataset.sheetTab;
        }
      }
    } catch (e) {}
    const html = generateStandaloneHTML(currentChar, true, activeSheetTab);
    frame.onload = () => {
      try {
        if (prevScrollY > 0 && frame.contentWindow) {
          frame.contentWindow.scrollTo(0, prevScrollY);
        }
      } catch (e) {}
    };
    frame.srcdoc = html;
  };
  if (immediate) run();
  else previewTimer = setTimeout(run, 120);
}

// ---- Redimensionnement & Compression du Portrait en Base64 autonome
function processPortraitFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const targetW = 304;
      const targetH = 456;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      // Recadrage centré (cover) au format 2:3
      const srcRatio = img.width / img.height;
      const dstRatio = targetW / targetH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcRatio > dstRatio) {
        sw = img.height * dstRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / dstRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
      currentChar.portrait = dataUrl;
      $("#portrait-img").src = dataUrl;
      onCharUpdated(true);
      showToast("Portrait optimisé et intégré à la fiche !");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ---- Exports & Imports
function exportStandaloneHTML() {
  if (!currentChar) return;
  const html = generateStandaloneHTML(currentChar);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const cleanName = (currentChar.name || "Personnage").trim();
  a.download = `${cleanName} – Suivi de fiche.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Fiche "${cleanName} – Suivi de fiche.html" téléchargée !`);
}

function exportCharacterJSON() {
  if (!currentChar) return;
  const blob = new Blob([JSON.stringify(currentChar, null, 2)], { type: "application/json;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slugify(currentChar.name)}-modele.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Modèle JSON exporté !");
}

async function copyHTMLToClipboard() {
  if (!currentChar) return;
  const html = generateStandaloneHTML(currentChar);
  try {
    await navigator.clipboard.writeText(html);
    showToast("Code HTML copié dans le presse-papiers !");
  } catch (e) {
    alert("Impossible de copier automatiquement. Utilisez le bouton Télécharger (.html).");
  }
}

function openPreviewInNewTab() {
  if (!currentChar) return;
  const html = generateStandaloneHTML(currentChar);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = parseCharacterFromFile(reader.result);
      imported.id = slugify(imported.name) + "-" + Date.now().toString(36).slice(-4);
      if (!imported.storageKey) {
        imported.storageKey = slugify(imported.name) + "-v1";
      }
      roster.unshift(imported);
      currentChar = imported;
      saveRoster();
      renderRosterSelect();
      renderEditor();
      updatePreview(true);
      showToast(`Fiche "${imported.name}" importée avec succès !`);
    } catch (err) {
      alert("Erreur lors de l'importation : " + err.message);
    }
  };
  reader.readAsText(file);
}

// ---- Initialisation des événements DOM
document.addEventListener("DOMContentLoaded", () => {
  loadRoster();
  renderRosterSelect();
  renderEditor();
  updatePreview(true);

  // Navigation par onglets
  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach(b => b.classList.remove("active"));
      $$(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      $("#" + btn.dataset.tab).classList.add("active");
      // Basculer automatiquement l'onglet de la fiche dans l'aperçu
      const frame = $("#preview-frame");
      try {
        if (frame.contentWindow && frame.contentWindow.switchSheetTab) {
          frame.contentWindow.switchSheetTab(btn.dataset.tab === "tab-lore" ? "lore" : "play");
        }
      } catch (e) {}
    });
  });

  // Changement de personnage dans le roster
  $("#roster-select").addEventListener("change", e => selectCharacter(e.target.value));

  // Modal nouveau personnage
  $("#btn-new-char").addEventListener("click", () => $("#new-char-modal").classList.add("open"));
  $("#close-modal").addEventListener("click", () => $("#new-char-modal").classList.remove("open"));
  $$(".tpl-card").forEach(card => {
    card.addEventListener("click", () => createFromTemplate(card.dataset.tpl));
  });

  $("#btn-dup-char").addEventListener("click", duplicateCurrentCharacter);
  $("#btn-del-char").addEventListener("click", deleteCurrentCharacter);

  // Champs Identité & Thème
  $("#char-name").addEventListener("input", e => {
    currentChar.name = e.target.value;
    currentChar.storageKey = slugify(currentChar.name) + "-v1";
    $("#char-storage-key").value = currentChar.storageKey;
    onCharUpdated();
  });

  $("#char-subtitle").addEventListener("input", e => {
    currentChar.subtitle = e.target.value;
    onCharUpdated();
  });

  $("#char-storage-key").addEventListener("input", e => {
    currentChar.storageKey = e.target.value.trim() || (slugify(currentChar.name) + "-v1");
    onCharUpdated();
  });

  $("#portrait-file").addEventListener("change", e => processPortraitFile(e.target.files[0]));

  $$("[data-avatar]").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.avatar;
      if (k === "elara") currentChar.portrait = ELARA_PORTRAIT;
      else if (k === "none") currentChar.portrait = "";
      else currentChar.portrait = DEFAULT_AVATARS[k];
      $("#portrait-img").src = currentChar.portrait || DEFAULT_AVATARS.ranger;
      onCharUpdated(true);
    });
  });

  $("#theme-preset").addEventListener("change", e => {
    const key = e.target.value;
    if (THEME_PRESETS[key]) {
      currentChar.theme.preset = key;
      currentChar.theme.colors = { ...THEME_PRESETS[key].colors };
      renderColorPickers();
      onCharUpdated(true);
    }
  });

  $("#theme-mode").addEventListener("change", e => {
    currentChar.theme.defaultMode = e.target.value;
    onCharUpdated(true);
  });

  // Boutons d'ajout dans les listes
  $("#add-vital-btn").addEventListener("click", () => {
    const k = "statut_" + Date.now().toString(36).slice(-4);
    currentChar.vitals.push({ key: k, label: "Nouveau compteur", value: 0, max: 0, color: "--acc", isHp: false, showBar: false });
    renderVitalsList();
    onCharUpdated();
  });

  $("#add-stat-btn").addEventListener("click", () => {
    currentChar.stats.push({ key: "Nouvelle", label: "Nouvelle", value: 50, bonus: 0 });
    renderStatsList();
    onCharUpdated();
  });

  $("#roll-all-stats-btn").addEventListener("click", () => {
    currentChar.stats.forEach(st => {
      st.value = 30 + Math.floor(Math.random() * 41); // Entre 30 et 70
    });
    renderStatsList();
    onCharUpdated(true);
    showToast("Caractéristiques générées aléatoirement (30–70) !");
  });

  $("#add-weapon-btn").addEventListener("click", () => {
    currentChar.weapons.push({ name: "Nouvelle arme", expr: "1d8" });
    renderWeaponsList();
    onCharUpdated();
  });

  $("#add-skill-btn").addEventListener("click", () => {
    currentChar.skills = currentChar.skills || [];
    const defaultStat = currentChar.stats?.[0]?.key || "";
    currentChar.skills.push({
      name: "Nouvelle compétence",
      stat: defaultStat,
      bonus: 10,
      desc: "Description de la compétence…"
    });
    renderSkillsList();
    onCharUpdated(true, "play");
  });

  $("#add-resource-btn").addEventListener("click", () => {
    const k = "res_" + Date.now().toString(36).slice(-4);
    currentChar.resources.push({ key: k, name: "Nouveau pouvoir", desc: "Description de l'effet", value: 3, max: 3, rechargeOnScenario: true });
    renderResourcesList();
    onCharUpdated();
  });

  $("#scenar-btn-label").addEventListener("input", e => {
    currentChar.scenarioBtnLabel = e.target.value;
    onCharUpdated();
  });

  $("#rest-btn-label").addEventListener("input", e => {
    currentChar.restBtnLabel = e.target.value;
    onCharUpdated();
  });

  $("#inv-section-title").addEventListener("input", e => {
    currentChar.inventoryTitle = e.target.value;
    onCharUpdated();
  });

  $("#items-card-title").addEventListener("input", e => {
    currentChar.itemsCardTitle = e.target.value;
    onCharUpdated(false, "play");
  });

  $("#gear-card-title").addEventListener("input", e => {
    currentChar.gearCardTitle = e.target.value;
    onCharUpdated(false, "play");
  });

  $("#show-secondary-card").addEventListener("change", e => {
    currentChar.showSecondaryCard = e.target.checked;
    onCharUpdated(true, "lore");
  });

  $("#secondary-card-title").addEventListener("input", e => {
    currentChar.secondaryCardTitle = e.target.value;
    onCharUpdated(false, "lore");
  });

  $("#add-item-btn").addEventListener("click", () => {
    const k = "item_" + Date.now().toString(36).slice(-4);
    currentChar.items.push({ key: k, label: "Nouvel objet consommable", value: 1 });
    renderItemsList();
    onCharUpdated(true, "play");
  });

  $("#add-gear-btn").addEventListener("click", () => {
    currentChar.gear = currentChar.gear || [];
    const k = "gear_" + Date.now().toString(36).slice(-4);
    currentChar.gear.push({ key: k, label: "Nouvel objet classique", value: 1 });
    renderGearList();
    onCharUpdated(true, "play");
  });

  $("#add-chasse-btn").addEventListener("click", () => {
    const k = "Trophee_" + Date.now().toString(36).slice(-4);
    currentChar.chasse.push({ key: k, label: "Nouvelle entrée", value: 1 });
    renderChasseList();
    onCharUpdated(true, "lore");
  });

  $("#add-magic-btn").addEventListener("click", () => {
    currentChar.magicItems = currentChar.magicItems || [];
    currentChar.magicItems.push({
      name: "Nouvel objet magique",
      slot: "Relique",
      desc: "Effets et propriétés…",
      charges: 3,
      maxCharges: 3,
      rechargeOnScenario: true,
      equipped: true
    });
    renderMagicItemsList();
    onCharUpdated(true, "play");
  });

  // Champs Historique & Sessions
  $("#lore-backstory").addEventListener("input", e => {
    currentChar.lore = currentChar.lore || {};
    currentChar.lore.backstory = e.target.value;
    onCharUpdated(false, "lore");
  });

  $("#lore-appearance").addEventListener("input", e => {
    currentChar.lore = currentChar.lore || {};
    currentChar.lore.appearance = e.target.value;
    onCharUpdated(false, "lore");
  });

  $("#lore-relations").addEventListener("input", e => {
    currentChar.lore = currentChar.lore || {};
    currentChar.lore.relations = e.target.value;
    onCharUpdated(false, "lore");
  });

  $("#add-session-btn").addEventListener("click", () => {
    currentChar.sessions = currentChar.sessions || [];
    const num = currentChar.sessions.length + 1;
    currentChar.sessions.unshift({
      id: "scen_" + Date.now().toString(36).slice(-4),
      title: `Scénario ${num} : Titre de l'aventure`,
      date: `Scénario ${num}`,
      rewards: "+50 XP · +100 PO",
      summary: "Résumé de la session, événements marquants et rencontres…"
    });
    renderSessionsList();
    onCharUpdated(true, "sessions");
  });

  $("#char-cond").addEventListener("input", e => {
    currentChar.cond = e.target.value;
    onCharUpdated();
  });

  $("#char-notes").addEventListener("input", e => {
    currentChar.notes = e.target.value;
    onCharUpdated();
  });

  // Actions d'export / import
  $$(".trigger-export-html").forEach(b => b.addEventListener("click", exportStandaloneHTML));
  $$(".trigger-export-json").forEach(b => b.addEventListener("click", exportCharacterJSON));
  $("#btn-copy-html").addEventListener("click", copyHTMLToClipboard);
  $("#btn-open-tab").addEventListener("click", openPreviewInNewTab);

  $("#btn-import").addEventListener("click", () => $("#import-file-input").click());
  $("#import-file-input").addEventListener("change", e => {
    handleImportFile(e.target.files[0]);
    e.target.value = "";
  });

  // Barre d'aperçu
  $("#toggle-mobile-preview").addEventListener("click", e => {
    const cont = $("#preview-container");
    cont.classList.toggle("mobile-view");
    e.currentTarget.classList.toggle("btn-gold");
  });

  $("#refresh-preview").addEventListener("click", () => {
    updatePreview(true);
    showToast("Aperçu réinitialisé aux valeurs de l'éditeur.");
  });
});


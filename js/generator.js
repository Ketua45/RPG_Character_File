// Moteur de génération de fiche HTML autonome et d'importation (HTML / JSON)

function slugify(str) {
  return (str || "personnage")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "personnage";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateStandaloneHTML(char, isPreview = false, initialTab = "play") {
  const c = char.theme?.colors || THEME_PRESETS.forest.colors;
  const defaultMode = char.theme?.defaultMode || "auto";
  const htmlThemeAttr = defaultMode === "light" ? ' data-theme="light"' : defaultMode === "dark" ? ' data-theme="dark"' : "";

  const storageKey = char.storageKey || (slugify(char.name) + "-v1");
  const title = `${char.name || "Personnage"} – Suivi de fiche`;

  const hpVital = char.vitals.find(v => v.isHp) || char.vitals[0] || { key: "pv", label: "Points de vie", value: 15, max: 15, color: "--red", isHp: true, showBar: true };

  const defObj = {
    pv: Number(hpVital.value) || 0,
    pvMax: Number(hpVital.max) || Number(hpVital.value) || 15,
    cond: char.cond || "",
    notes: char.notes || "",
    lore: {
      backstory: char.lore?.backstory || "",
      appearance: char.lore?.appearance || "",
      relations: char.lore?.relations || ""
    },
    sessions: Array.isArray(char.sessions) ? structuredClone(char.sessions) : [],
    magicItems: Array.isArray(char.magicItems) ? structuredClone(char.magicItems) : [],
    stats: {},
    statBonus: {},
    res: {},
    items: {},
    chasse: {},
    t: 0,
    log: []
  };

  const vitArr = [];
  char.vitals.forEach(v => {
    const k = v.key;
    if (v.isHp) {
      defObj.pv = Number(v.value) || 0;
      defObj.pvMax = Number(v.max) || Number(v.value) || 1;
      vitArr.push([v.label, "pv", "pvMax", v.color || "--red", 1, v.showBar ? 1 : 0]);
    } else {
      const rawVal = Number(v.value) || 0;
      defObj[k] = k === "xp" ? Math.max(350, rawVal) : rawVal;
      const maxVal = Number(v.max) || 0;
      vitArr.push([v.label, k, maxVal, v.color || "--acc", 0, v.showBar ? 1 : 0]);
    }
  });

  const labObj = {};
  char.stats.forEach(st => {
    const rawBase = Number(st.value) || 50;
    defObj.stats[st.key] = Math.max(30, Math.min(70, rawBase));
    defObj.statBonus[st.key] = Number(st.bonus) || 0;
    if (st.label && st.label !== st.key) {
      labObj[st.key] = st.label;
    }
  });

  const resArr = [];
  char.resources.forEach(r => {
    defObj.res[r.key] = Number(r.value) ?? Number(r.max) ?? 0;
    resArr.push([r.key, r.name, r.desc || "", Number(r.max) || 1, r.rechargeOnScenario !== false ? 1 : 0]);
  });

  const itemsObj = {};
  char.items.forEach(it => {
    defObj.items[it.key] = Number(it.value) || 0;
    itemsObj[it.key] = it.label;
  });

  const chasseLabels = {};
  (char.chasse || []).forEach(ch => {
    defObj.chasse[ch.key] = Number(ch.value) || 0;
    chasseLabels[ch.key] = ch.label || ch.key;
  });

  const weapArr = (char.weapons || []).map(w => [w.name, w.expr]);

  // Configuration complète embarquée pour permettre la réimportation dans le générateur (sans dupliquer le portrait base64)
  const lightConfig = { ...char, portrait: char.portrait ? "__FROM_HERO_IMG__" : "" };
  const embeddedConfig = JSON.stringify(lightConfig).replace(/<\/script>/gi, "<\\/script>");

  return `<!DOCTYPE html>
<html lang="fr"${htmlThemeAttr}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<style>
:root{--bg:${c.bg};--card:${c.card};--ink:${c.ink};--mute:${c.mute};--line:${c.line};--acc:${c.acc};--band:${c.band};--mid:${c.mid};--gold:${c.gold};--red:${c.red};--pur:${c.pur};--soft:${c.soft};--on:${c.on};
box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
:root:not([data-theme="light"]){}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:${c.darkBg};--card:${c.darkCard};--ink:${c.darkInk};--mute:${c.darkMute};--line:${c.darkLine};--acc:${c.darkAcc};--band:${c.darkBand};--mid:${c.darkMid};--gold:${c.darkGold};--red:${c.darkRed};--pur:${c.darkPur};--soft:${c.darkSoft}}}
:root[data-theme="dark"]{--bg:${c.darkBg};--card:${c.darkCard};--ink:${c.darkInk};--mute:${c.darkMute};--line:${c.darkLine};--acc:${c.darkAcc};--band:${c.darkBand};--mid:${c.darkMid};--gold:${c.darkGold};--red:${c.darkRed};--pur:${c.darkPur};--soft:${c.darkSoft}}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 Calibri,Carlito,system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:0 14px 40px}
h1,h2,h3{font-family:Georgia,serif;margin:0}
h2{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);border-bottom:2px solid var(--gold);padding-bottom:4px;margin:22px 0 10px}
.hero{background:var(--band);color:var(--on);border:2px solid var(--gold);border-radius:12px;padding:14px;display:flex;gap:14px;align-items:center;margin-top:14px}
.hero img{width:76px;height:114px;object-fit:cover;border-radius:8px;border:2px solid var(--gold);flex-shrink:0}
.hero h1{font-size:clamp(22px,6vw,34px);letter-spacing:.1em}
.hero p{margin:4px 0 0;color:var(--gold);letter-spacing:.18em;font-size:11px;font-weight:700;text-transform:uppercase}
.tools{margin-left:auto;display:flex;flex-direction:column;gap:6px}
button{font:inherit;cursor:pointer;color:inherit}
.btn{background:var(--card);color:var(--acc);border:1px solid var(--gold);border-radius:8px;padding:6px 10px;font-size:13px;font-weight:600}
.btn:hover{filter:brightness(1.04)}
.btn.on{background:var(--gold);color:#1b1b1b}
.bar{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--card);border:1px solid var(--gold);border-radius:10px;margin-top:10px;padding:8px 12px;display:flex;gap:12px;align-items:center;box-shadow:0 2px 8px #0002}
.bar b{color:var(--red);font-family:Georgia,serif;white-space:nowrap}
#last{flex:1;font-size:14px}
/* Onglets de navigation de la fiche */
.sheet-tabs{display:flex;gap:8px;margin-top:14px;border-bottom:2px solid var(--line);padding-bottom:8px;overflow-x:auto}
.sheet-tab{background:var(--card);color:var(--mute);border:1px solid var(--line);border-radius:8px;padding:8px 14px;font-family:Georgia,serif;font-size:14px;font-weight:700;letter-spacing:.04em;white-space:nowrap;transition:all .15s}
.sheet-tab:hover{border-color:var(--gold);color:var(--ink)}
.sheet-tab.active{background:var(--band);color:var(--on);border-color:var(--gold)}
.sheet-tab .cnt{display:inline-block;background:var(--gold);color:#1b1b1b;border-radius:99px;padding:1px 7px;font-size:11px;margin-left:5px;font-family:Calibri,sans-serif}
.sheet-pane{display:none}
.sheet-pane.active{display:block}
.ok{color:var(--mid);font-weight:700}.ko{color:var(--red);font-weight:700}
.grid{display:grid;gap:10px}
.g2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.g7{grid-template-columns:repeat(auto-fit,minmax(104px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);font-weight:700;margin-bottom:4px}
.big{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px}
.big input{width:4.2ch;font:700 30px Georgia,serif;text-align:center;background:none;border:none;color:var(--c,var(--acc));-moz-appearance:textfield;padding:0}
input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.sub{text-align:center;font-size:12px;color:var(--mute)}
.sub b{font:700 16px Georgia,serif;color:var(--ink)}
.st{width:34px;height:34px;border-radius:50%;border:1px solid var(--gold);background:var(--soft);font-size:18px;line-height:1;color:var(--acc)}
.st:active{transform:scale(.92)}
.meter{height:8px;border-radius:5px;background:var(--line);overflow:hidden;margin-top:6px}
.meter i{display:block;height:100%;background:var(--c,var(--red));transition:width .25s}
.stat{width:100%;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 4px;text-align:center}
.stat:hover{border-color:var(--gold)}
.stat span{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);font-weight:700}
.stat b{font:700 26px Georgia,serif;color:var(--acc)}
.stat small{display:block;font-size:11px;color:var(--mute);margin-top:2px;font-weight:600}
.stat small em{font-style:normal;color:var(--gold);font-weight:700}
.bon-row{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:4px;font-size:11px;color:var(--mute)}
.bon-row .st{width:22px;height:22px;font-size:13px}
.bon-row input{width:3.2ch;text-align:center;font:700 13px Georgia,serif;background:var(--card);border:1px solid var(--line);border-radius:5px;color:var(--gold);padding:1px 0}
.ed{display:none;width:100%;margin-top:4px;text-align:center;background:var(--soft);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:3px}
body.edit .ed{display:block}body.edit .stat b{opacity:.35}
.row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dashed var(--line)}
.row:last-child{border:0}.row span{flex:1}
.row input{width:3.4ch;text-align:center;font:700 16px Georgia,serif;background:none;border:none;color:var(--ink);padding:0}
.row .st{width:28px;height:28px;font-size:15px}
.del-row{display:none;background:none;border:none;color:var(--red);font-weight:700;padding:0 4px;font-size:16px}
body.edit .del-row{display:inline-block}
.add-box{display:none;gap:6px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}
body.edit .add-box{display:flex}
.add-box input{flex:1;padding:5px 8px;border-radius:6px;border:1px solid var(--line);background:var(--soft);color:var(--ink);font-size:13px}
.dots{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.dots button{width:24px;height:24px;border-radius:50%;border:2px solid var(--gold);background:none}
.dots button.f{background:var(--gold)}
.res{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line)}
.res:last-child{border:0}.res small{display:block;color:var(--mute);font-size:12px}
.dice{display:flex;flex-wrap:wrap;gap:8px}
.dice button{min-width:52px}
.exp{display:flex;gap:8px;margin-top:10px}
.exp input{flex:1;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
#log{margin:10px 0 0;padding:0;list-style:none;font-size:13px;color:var(--mute)}
#log li{padding:2px 0;border-bottom:1px dotted var(--line)}
textarea,.txt{width:100%;min-height:90px;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;resize:vertical}
.txt{min-height:0}
.lore-area{min-height:130px;line-height:1.5}
/* Journal des sessions */
.sess-list{display:flex;flex-direction:column;gap:12px;margin-top:12px}
.sess-card{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:10px;padding:12px 14px}
.sess-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px dashed var(--line);padding-bottom:6px;margin-bottom:8px}
.sess-head h3{font-size:17px;color:var(--acc)}
.sess-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px}
.badge{background:var(--soft);color:var(--acc);border:1px solid var(--line);border-radius:6px;padding:2px 8px;font-weight:700}
.badge.gold{background:var(--band);color:var(--on);border-color:var(--gold)}
.sess-body{white-space:pre-wrap;font-size:14px;line-height:1.5;color:var(--ink)}
.sess-form{background:var(--card);border:1px solid var(--gold);border-radius:10px;padding:12px;margin-bottom:14px;display:none}
.sess-form.open{display:block}
.sess-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:8px}
.empty-msg{text-align:center;padding:24px;color:var(--mute);font-style:italic;background:var(--card);border:1px dashed var(--line);border-radius:10px;margin-top:10px}
.foot{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.mini{font-size:12px;color:var(--mute);margin-top:6px}
@media print{
  .tools,.foot,.exp,#quick,#saved,.sheet-tabs{display:none!important}
  .sheet-pane{display:block!important;margin-bottom:20px}
  .bar{position:static;box-shadow:none}
  body{background:#fff;color:#000}
}
</style>
</head>
<body>
<main>
<div class="hero">
  ${char.portrait ? `<img src="${escapeHtml(char.portrait)}" alt="Portrait de ${escapeHtml(char.name)}">` : ""}
  <div><h1>${escapeHtml(char.name || "PERSONNAGE")}</h1><p>${escapeHtml(char.subtitle || "")}</p></div>
  <div class="tools"><button class="btn" id="edit">✎ Éditer</button><button class="btn" id="theme">◐ Thème</button></div>
</div>

<div class="bar"><span>PV <b id="barpv"></b></span><div id="last">Cliquez sur une caractéristique ou une arme pour lancer les dés.</div></div>

<nav class="sheet-tabs" aria-label="Sections de la fiche">
  <button class="sheet-tab ${initialTab === "play" ? "active" : ""}" data-sheet-tab="play">⚔ Fiche de jeu</button>
  <button class="sheet-tab ${initialTab === "lore" ? "active" : ""}" data-sheet-tab="lore">📜 Historique &amp; Lore</button>
  <button class="sheet-tab ${initialTab === "sessions" ? "active" : ""}" data-sheet-tab="sessions">📖 Sessions <span class="cnt" id="sess-count">0</span></button>
</nav>

<!-- ONGLET 1 : FICHE DE JEU -->
<section class="sheet-pane ${initialTab === "play" ? "active" : ""}" id="pane-play">
  <h2>Statut</h2>
  <div class="grid g3" id="vitals"></div>

  <h2>Caractéristiques <span style="font-size:11px;letter-spacing:0;text-transform:none;color:var(--mute)">· base 30–70 + bonus ponctuel · clic = jet d100 (réussite si ≤ total)</span></h2>
  <div class="grid g7" id="stats"></div>

  <h2>Dés &amp; armes</h2>
  <div class="card">
    <div class="dice" id="weapons"></div>
    <div class="dice" id="quick" style="margin-top:10px"></div>
    <div class="exp"><input id="expr" placeholder="Jet libre : 2d6+3" aria-label="Jet libre"><button class="btn" id="go">Lancer</button></div>
    <ul id="log"></ul>
  </div>

  <h2>Charges &amp; pouvoirs</h2>
  <div class="card" id="res"></div>
  <div class="foot"><button class="btn" id="scenar">${escapeHtml(char.scenarioBtnLabel || "⟳ Nouveau scénario (recharge pouvoirs)")}</button><button class="btn" id="rest">${escapeHtml(char.restBtnLabel || "☾ Repos : PV au max")}</button></div>

  <h2>Objets magiques &amp; reliques</h2>
  <div class="card">
    <div id="magic-items"></div>
    <div class="add-box" style="flex-wrap:wrap;align-items:center">
      <input id="new-magic-name" placeholder="Nom de l'objet magique…" style="min-width:140px">
      <input id="new-magic-slot" placeholder="Type (Anneau, Arme…)" style="max-width:140px">
      <input id="new-magic-desc" placeholder="Effet / propriétés…" style="min-width:180px;flex:2">
      <input id="new-magic-max" type="number" min="0" max="20" value="0" title="Charges max (0 = sans charges)" style="max-width:70px;text-align:center" placeholder="Charges">
      <label style="font-size:12px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap">
        <input type="checkbox" id="new-magic-rech" checked> ⟳ scénar.
      </label>
      <button class="btn" id="add-magic">+ Ajouter</button>
    </div>
  </div>

  <h2>${escapeHtml(char.inventoryTitle || "Inventaire consommable")}</h2>
  <div class="grid g3">
    <div class="card">
      <div class="lbl">${escapeHtml(char.itemsCardTitle || "Consommables")}</div>
      <div id="items"></div>
      <div class="add-box"><input id="new-item" placeholder="Nouvel objet…"><button class="btn" id="add-item">+ Ajouter</button></div>
    </div>
    ${char.showSecondaryCard !== false ? `<div class="card">
      <div class="lbl">${escapeHtml(char.secondaryCardTitle || "Tableau de chasse")}</div>
      <div id="chasse"></div>
      <div class="add-box"><input id="new-chasse" placeholder="Nouvelle entrée…"><button class="btn" id="add-chasse">+ Ajouter</button></div>
    </div>` : ""}
  </div>

  <h2>Conditions &amp; notes de session</h2>
  <input class="txt" data-k="cond" placeholder="Conditions spéciales (poison, saignement…)" style="margin-bottom:8px">
  <textarea data-k="notes" placeholder="Notes de la session en cours, PNJ rencontrés, indices…"></textarea>
  <div style="margin-top:6px;display:flex;justify-content:flex-end">
    <button class="btn" id="archive-notes-btn">📖 Archiver ces notes dans le journal des sessions</button>
  </div>
</section>

<!-- ONGLET 2 : HISTORIQUE & LORE -->
<section class="sheet-pane ${initialTab === "lore" ? "active" : ""}" id="pane-lore">
  <h2>Origines &amp; Histoire du personnage</h2>
  <textarea class="lore-area" data-k="lore.backstory" style="min-height:160px" placeholder="Racontez l'histoire, le passé, l'origine et les événements fondateurs de votre personnage…"></textarea>

  <div class="grid g2" style="margin-top:6px">
    <div>
      <h2>Apparence, Personnalité &amp; Objectifs</h2>
      <textarea class="lore-area" data-k="lore.appearance" placeholder="Signes particuliers, caractère, motivations, secrets…"></textarea>
    </div>
    <div>
      <h2>Alliés, Contacts &amp; Relations</h2>
      <textarea class="lore-area" data-k="lore.relations" placeholder="Compagnons de route, mentors, factions, ennemis jurés…"></textarea>
    </div>
  </div>
</section>

<!-- ONGLET 3 : JOURNAL DES SESSIONS / SCÉNARIOS -->
<section class="sheet-pane ${initialTab === "sessions" ? "active" : ""}" id="pane-sessions">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:22px 0 10px;border-bottom:2px solid var(--gold);padding-bottom:6px">
    <h2 style="margin:0;border:0;padding:0">Journal des scénarios &amp; sessions</h2>
    <button class="btn" id="toggle-sess-form">+ Ajouter un scénario / une session</button>
  </div>

  <div class="sess-form" id="sess-form">
    <div class="lbl" id="sess-form-title">Nouvelle entrée de scénario</div>
    <input type="hidden" id="sess-edit-id" value="">
    <div class="sess-form-grid">
      <input class="txt" id="sess-title" placeholder="Nom du scénario (ex : Les Ombres de Bois-Maudit)">
      <input class="txt" id="sess-date" placeholder="Session / Date (ex : Scénario 2 · Oct. 2026)">
      <input class="txt" id="sess-rewards" placeholder="Gains (ex : +60 XP, +150 PO, Anneau…)">
    </div>
    <textarea id="sess-summary" placeholder="Résumé de l'aventure, boss vaincus, choix importants, PNJ rencontrés…"></textarea>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
      <button class="btn" id="cancel-sess-btn">Annuler</button>
      <button class="btn on" id="save-sess-btn">✓ Enregistrer la session</button>
    </div>
  </div>

  <div id="sessions-container" class="sess-list"></div>
</section>

<div class="foot">
  <button class="btn" id="reset">Réinitialiser le scénario</button>
  <button class="btn" id="export-save">⬇ Sauvegarder état (.json)</button>
  <button class="btn" id="import-save-btn">⬆ Charger état (.json)</button>
  <input type="file" id="import-save-file" accept=".json" style="display:none">
</div>
<div class="mini" id="saved">Sauvegarde automatique dans ce navigateur.</div>
</main>
<script id="rpg-char-config" type="application/json">${embeddedConfig}</script>
<script>
const IS_PREVIEW=${JSON.stringify(!!isPreview)};
const STORAGE_KEY=${JSON.stringify(storageKey)};
const DEF=${JSON.stringify(defObj)};
const LAB=${JSON.stringify(labObj)};
const VIT=${JSON.stringify(vitArr)};
const RES=${JSON.stringify(resArr)};
const ITEMS=${JSON.stringify(itemsObj)};
const CHASSE_LAB=${JSON.stringify(chasseLabels)};
const WEAP=${JSON.stringify(weapArr)};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const get=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);
const put=(o,p,v)=>{const k=p.split('.'),l=k.pop();k.reduce((a,x)=>a[x]||(a[x]={}),o)[l]=v};
const merge=(a,b)=>{for(const k in b){a[k]=b[k]&&typeof b[k]=='object'&&!Array.isArray(b[k])&&a[k]?merge(a[k],b[k]):b[k]}return a};
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let S=structuredClone(DEF);
if(!IS_PREVIEW){try{const t=localStorage.getItem(STORAGE_KEY);if(t)merge(S,JSON.parse(t))}catch(e){}}
if(!S.itemLabels)S.itemLabels={...ITEMS};
if(!S.chasseLabels)S.chasseLabels={...CHASSE_LAB};
if(!S.lore)S.lore={backstory:'',appearance:'',relations:''};
if(!Array.isArray(S.sessions))S.sessions=[];
if(!Array.isArray(S.magicItems))S.magicItems=[];
if(!S.statBonus)S.statBonus={};
if((S.xp||0)<350)S.xp=350;
const clean=()=>{for(const k in S.stats){if(!(k in DEF.stats))delete S.stats[k];else S.stats[k]=Math.max(30,Math.min(70,S.stats[k]))}};clean();

// ---- navigation onglets fiche
function switchSheetTab(tab){
  $$('.sheet-tab').forEach(b=>b.classList.toggle('active',b.dataset.sheetTab===tab));
  $$('.sheet-pane').forEach(p=>p.classList.toggle('active',p.id==='pane-'+tab));
}
$$('.sheet-tab').forEach(b=>b.onclick=()=>switchSheetTab(b.dataset.sheetTab));

// ---- construction
$('#vitals').innerHTML=VIT.map(([n,k,m,c,hp,bar])=>\`<div class="card" style="--c:var(\${c})"><div class="lbl">\${n}</div><div class="big"><button class="st" data-k="\${k}" data-d="-1" aria-label="moins">−</button><input type="number" data-k="\${k}" aria-label="\${n}" \${k=='xp'?'min="350"':''}><button class="st" data-k="\${k}" data-d="1" aria-label="plus">+</button></div>\${hp?\`<div class="sub">PV de base / max : <b data-v="pvMax"></b></div><input class="ed" type="number" data-k="pvMax" aria-label="PV max"><div class="meter"><i id="pvbar"></i></div>\`:m?\`<div class="sub">/ <b>\${m}</b></div>\`+(bar?\`<div class="meter"><i data-meter="\${k}" data-max="\${m}"></i></div>\`:''):k=='xp'?'<div class="sub">Min. 350</div>':'<div class="sub">&nbsp;</div>'}</div>\`).join('');
$('#stats').innerHTML=Object.keys(DEF.stats).map(k=>\`<div><button class="stat" data-roll="\${k}"><span>\${LAB[k]||k}</span><b data-stat-tot="\${k}"></b><small data-stat-sub="\${k}"></small></button><div class="bon-row" title="Bonus ponctuel (objet magique ou consommable)"><span>Boost</span><button class="st" data-k="statBonus.\${k}" data-d="-1">−</button><input type="number" data-k="statBonus.\${k}" aria-label="Bonus \${LAB[k]||k}"><button class="st" data-k="statBonus.\${k}" data-d="1">+</button></div><input class="ed" type="number" min="30" max="70" data-k="stats.\${k}" title="Valeur de base (30 à 70)" aria-label="Base \${LAB[k]||k}"></div>\`).join('');
$('#weapons').innerHTML=WEAP.map(([n,e])=>\`<button class="btn" data-expr="\${e}" data-name="\${n}">\${n} <small>\${e}</small></button>\`).join('');
$('#quick').innerHTML=[4,6,8,10,20,100].map(d=>\`<button class="btn" data-expr="1d\${d}" data-name="d\${d}">d\${d}</button>\`).join('');
$('#res').innerHTML=RES.map(([k,n,d,m])=>\`<div class="res"><div><b>\${n}</b><small>\${d}</small></div><div class="dots" data-dots="res.\${k}" data-max="\${m}">\${Array.from({length:m},(_,i)=>\`<button data-i="\${i}" aria-label="charge \${i+1}"></button>\`).join('')}</div></div>\`).join('');

const stepRow=(k,n,grp)=>\`<div class="row"><button class="del-row" data-del="\${k}" data-grp="\${grp}" title="Supprimer">×</button><span>\${n}</span><button class="st" data-k="\${k}" data-d="-1">−</button><input type="number" data-k="\${k}"><button class="st" data-k="\${k}" data-d="1">+</button></div>\`;
function renderLists(){
  if($('#items'))$('#items').innerHTML=Object.keys(S.items).map(k=>stepRow('items.'+k,S.itemLabels?.[k]||ITEMS[k]||k,'items')).join('');
  if($('#chasse'))$('#chasse').innerHTML=Object.keys(S.chasse).map(k=>stepRow('chasse.'+k,S.chasseLabels?.[k]||CHASSE_LAB[k]||k,'chasse')).join('');
  if($('#magic-items')){
    if(!S.magicItems.length){
      $('#magic-items').innerHTML='<div style="color:var(--mute);font-size:13px;font-style:italic;padding:4px 0">Aucun objet magique enregistré (cliquez sur ✎ Éditer pour en ajouter).</div>';
    }else{
      $('#magic-items').innerHTML=S.magicItems.map((m,idx)=>{
        const maxC=+(m.maxCharges||0),curC=+(m.charges??maxC);
        return \`<div class="res" style="flex-wrap:wrap">
          <div style="display:flex;align-items:flex-start;gap:8px;flex:1;min-width:200px">
            <button class="del-row" data-del-magic="\${idx}" title="Supprimer">×</button>
            <div>
              <b>\${esc(m.name||'Objet magique')}</b>
              \${m.slot?\`<span class="badge" style="margin-left:4px;font-size:11px">\${esc(m.slot)}</span>\`:''}
              \${maxC>0&&m.rechargeOnScenario!==false?\`<span class="badge" style="margin-left:4px;font-size:10px" title="Se recharge à chaque nouveau scénario">⟳ / scénar</span>\`:''}
              <small>\${esc(m.desc||'')}</small>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            \${maxC>0?\`<div class="dots" style="margin-top:0" data-magic-dots="\${idx}" data-max="\${maxC}">\${Array.from({length:maxC},(_,i)=>\`<button class="\${i<curC?'f':''}" data-i="\${i}" aria-label="charge \${i+1}"></button>\`).join('')}</div>\`:''}
            <button class="btn \${m.equipped!==false?'on':''}" style="padding:4px 10px;font-size:12px;white-space:nowrap" data-toggle-magic="\${idx}">\${m.equipped!==false?'✦ Équipé':'En sac'}</button>
          </div>
        </div>\`;
      }).join('');
    }
  }
}
renderLists();

function renderSessions(){
  $('#sess-count').textContent=S.sessions.length;
  const cont=$('#sessions-container');
  if(!S.sessions.length){
    cont.innerHTML='<div class="empty-msg">Aucun scénario enregistré pour le moment. Cliquez sur « + Ajouter un scénario » pour garder la trace de vos aventures !</div>';
    return;
  }
  cont.innerHTML=S.sessions.map((s,idx)=>\`<article class="sess-card">
    <div class="sess-head">
      <h3>\${esc(s.title||'Scénario sans titre')}</h3>
      <div class="sess-meta">
        \${s.date?\`<span class="badge">\${esc(s.date)}</span>\`:''}
        \${s.rewards?\`<span class="badge gold">\${esc(s.rewards)}</span>\`:''}
        <button class="btn" style="padding:2px 7px;font-size:12px" data-edit-sess="\${idx}" title="Modifier">✎</button>
        <button class="btn" style="padding:2px 7px;font-size:12px;color:var(--red)" data-del-sess="\${idx}" title="Supprimer">×</button>
      </div>
    </div>
    <div class="sess-body">\${esc(s.summary||'')}</div>
  </article>\`).join('');
}
renderSessions();

// ---- synchro
function sync(){
  $$('[data-k]').forEach(el=>{if(el.tagName=='BUTTON'||el===document.activeElement)return;const v=get(S,el.dataset.k);el.value=v??''});
  $$('[data-v]').forEach(el=>el.textContent=get(S,el.dataset.v));
  $$('[data-stat-tot]').forEach(el=>{
    const k=el.dataset.statTot,base=+(S.stats[k]||50),bon=+(S.statBonus?.[k]||0);
    el.textContent=base+bon;
  });
  $$('[data-stat-sub]').forEach(el=>{
    const k=el.dataset.statSub,base=+(S.stats[k]||50),bon=+(S.statBonus?.[k]||0);
    el.innerHTML=bon?(\`Base \${base} <em>\${bon>0?'+'+bon:bon}</em>\`):\`Base \${base}\`;
  });
  $$('[data-dots]').forEach(d=>{const v=get(S,d.dataset.dots);[...d.children].forEach((b,i)=>b.classList.toggle('f',i<v))});
  if($('#pvbar'))$('#pvbar').style.width=Math.max(0,Math.min(100,S.pv/(S.pvMax||1)*100))+'%';
  $$('[data-meter]').forEach(m=>{const max=+(m.dataset.max||100);m.style.width=Math.min(100,(S[m.dataset.meter]||0)/max*100)+'%'});
  $('#barpv').textContent=S.pv+' / '+S.pvMax;
  $('#log').innerHTML=(S.log||[]).map(t=>\`<li>\${t}</li>\`).join('');
}
let lsOk=true;
function persist(){if(IS_PREVIEW)return;S.t=Date.now();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));lsOk=true}catch(e){lsOk=false}}
function status(){const h=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  $('#saved').textContent=lsOk?'✓ Sauvegardé à '+h+' · dans ce navigateur':'⚠ Sauvegarde locale indisponible : utilisez le bouton Sauvegarder (.json).'}
function save(){persist();status()}
addEventListener('pagehide',persist);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='hidden')persist()});
function change(){sync();save()}
const clamp=(k,v)=>{
  if(k.startsWith('statBonus.'))return Math.max(-50,Math.min(50,v));
  if(k.startsWith('stats.'))return Math.max(30,Math.min(70,v));
  if(k=='xp')return Math.max(350,v);
  v=Math.max(0,v);
  if(k=='pv')v=Math.min(v,S.pvMax);
  const vf=VIT.find(x=>x[1]==k);if(vf&&vf[2]&&vf[2]!=='pvMax')v=Math.min(v,vf[2]);
  return v;
};

// ---- dés
function say(html){$('#last').innerHTML=html;S.log.unshift(html);S.log=S.log.slice(0,10);change()}
const rnd=n=>1+Math.floor(Math.random()*n);
function rollExpr(e,name){const m=e.replace(/\\s/g,'').match(/^(\\d*)d(\\d+)([+-]\\d+)?$/i);if(!m)return say('<span class="ko">Format invalide</span> : essayez 1d10+2');
  const n=Math.min(+(m[1]||1),50),f=+m[2],b=+(m[3]||0);if(f<2)return;const r=Array.from({length:n},()=>rnd(f));
  say(\`<b>\${name||e}</b> \${e} → [\${r.join(', ')}]\${b?(b>0?'+':'')+b:''} = <b>\${r.reduce((a,c)=>a+c,0)+b}</b>\`)}
function rollStat(k){
  const base=+(S.stats[k]||50),bon=+(S.statBonus?.[k]||0),v=base+bon,r=rnd(100),ok=r<=v;
  const detail=bon?\`\${base}\${bon>0?'+'+bon:bon}=\${v}\`:\`\${v}\`;
  say(\`<b>\${LAB[k]||k}</b> (\${detail}) → \${r} · <span class="\${ok?'ok':'ko'}">\${ok?'Réussite':'Échec'}</span> (écart \${Math.abs(v-r)})\`);
}

// ---- événements
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.del){
    const grp=b.dataset.grp,rawKey=b.dataset.del.split('.').slice(1).join('.');
    if(grp=='items'){delete S.items[rawKey];if(S.itemLabels)delete S.itemLabels[rawKey]}
    if(grp=='chasse'){delete S.chasse[rawKey];if(S.chasseLabels)delete S.chasseLabels[rawKey]}
    renderLists();return change();
  }
  if(b.dataset.toggleMagic!==undefined){
    const idx=+b.dataset.toggleMagic;
    if(S.magicItems[idx]){S.magicItems[idx].equipped=S.magicItems[idx].equipped===false;renderLists();change()}
    return;
  }
  if(b.dataset.delMagic!==undefined){
    const idx=+b.dataset.delMagic;
    S.magicItems.splice(idx,1);renderLists();return change();
  }
  if(b.dataset.editSess!==undefined){
    const idx=+b.dataset.editSess,s=S.sessions[idx];if(!s)return;
    $('#sess-edit-id').value=String(idx);
    $('#sess-form-title').textContent='Modifier le scénario';
    $('#sess-title').value=s.title||'';
    $('#sess-date').value=s.date||'';
    $('#sess-rewards').value=s.rewards||'';
    $('#sess-summary').value=s.summary||'';
    $('#sess-form').classList.add('open');
    return;
  }
  if(b.dataset.delSess!==undefined){
    const idx=+b.dataset.delSess;
    if(confirm('Supprimer cette entrée du journal des sessions ?')){
      S.sessions.splice(idx,1);renderSessions();change();
    }
    return;
  }
  if(b.dataset.d){const k=b.dataset.k;put(S,k,clamp(k,(+get(S,k)||0)+ +b.dataset.d));return change()}
  if(b.dataset.roll)return rollStat(b.dataset.roll);
  if(b.dataset.expr)return rollExpr(b.dataset.expr,b.dataset.name);
  const mdots=b.closest('[data-magic-dots]');
  if(mdots){
    const idx=+mdots.dataset.magicDots,i=+b.dataset.i,m=S.magicItems[idx];
    if(m){const cur=+(m.charges??m.maxCharges??0);m.charges=cur==i+1?i:i+1;renderLists();change()}
    return;
  }
  const dots=b.closest('[data-dots]');
  if(dots){const k=dots.dataset.dots,i=+b.dataset.i;put(S,k,get(S,k)==i+1?i:i+1);return change()}
});
document.addEventListener('input',e=>{const el=e.target,k=el.dataset.k;if(!k)return;
  put(S,k,el.type=='number'?clamp(k,+el.value||0):el.value);
  if(el.type=='number'){sync()}save()});
$('#go').onclick=()=>rollExpr($('#expr').value,'Jet libre');
$('#expr').onkeydown=e=>{if(e.key=='Enter')$('#go').click()};
$('#edit').onclick=e=>{document.body.classList.toggle('edit');e.target.classList.toggle('on')};
$('#theme').onclick=()=>{const r=document.documentElement,d=getComputedStyle(r).getPropertyValue('--bg').trim()==${JSON.stringify(c.darkBg)};r.dataset.theme=d?'light':'dark'};
function rechargeScenario(){
  RES.forEach(([k,n,d,m,rech])=>{if(rech)S.res[k]=m});
  S.magicItems.forEach(m=>{if((m.maxCharges||0)>0&&m.rechargeOnScenario!==false)m.charges=m.maxCharges});
  renderLists();
}
$('#scenar').onclick=()=>{rechargeScenario();say('<b>Nouveau scénario</b> : pouvoirs et objets magiques rechargés.')};
$('#rest').onclick=()=>{S.pv=S.pvMax;say('<b>Repos</b> : PV au maximum.')};

// ---- gestion journal des sessions
function openNewSessionForm(prefillSummary=''){
  $('#sess-edit-id').value='';
  $('#sess-form-title').textContent='Nouvelle entrée de scénario';
  $('#sess-title').value='';
  $('#sess-date').value='Scénario '+(S.sessions.length+1);
  $('#sess-rewards').value='';
  $('#sess-summary').value=prefillSummary;
  $('#sess-form').classList.add('open');
  $('#sess-title').focus();
}
$('#toggle-sess-form').onclick=()=>{
  if($('#sess-form').classList.contains('open'))$('#sess-form').classList.remove('open');
  else openNewSessionForm();
};
$('#cancel-sess-btn').onclick=()=>$('#sess-form').classList.remove('open');
$('#save-sess-btn').onclick=()=>{
  const title=$('#sess-title').value.trim()||('Scénario '+(S.sessions.length+1));
  const date=$('#sess-date').value.trim();
  const rewards=$('#sess-rewards').value.trim();
  const summary=$('#sess-summary').value.trim();
  const editIdx=$('#sess-edit-id').value;
  if(editIdx!==''){
    S.sessions[+editIdx]={...S.sessions[+editIdx],title,date,rewards,summary};
  }else{
    S.sessions.unshift({id:'s_'+Date.now().toString(36),title,date,rewards,summary});
  }
  $('#sess-form').classList.remove('open');
  renderSessions();
  change();
};
$('#archive-notes-btn').onclick=()=>{
  const currentNotes=(S.notes||'').trim();
  switchSheetTab('sessions');
  openNewSessionForm(currentNotes);
};

if($('#add-item'))$('#add-item').onclick=()=>{
  const inp=$('#new-item'),name=inp.value.trim();if(!name)return;
  const k=name.replace(/[^a-zA-Z0-9_]/g,'_')+'_'+Date.now().toString(36).slice(-3);
  S.items[k]=1;S.itemLabels=S.itemLabels||{};S.itemLabels[k]=name;inp.value='';renderLists();change();
};
if($('#add-chasse'))$('#add-chasse').onclick=()=>{
  const inp=$('#new-chasse'),name=inp.value.trim();if(!name)return;
  const k=name.replace(/[^a-zA-Z0-9_]/g,'_')+'_'+Date.now().toString(36).slice(-3);
  S.chasse[k]=1;S.chasseLabels=S.chasseLabels||{};S.chasseLabels[k]=name;inp.value='';renderLists();change();
};
if($('#add-magic'))$('#add-magic').onclick=()=>{
  const nInp=$('#new-magic-name'),sInp=$('#new-magic-slot'),dInp=$('#new-magic-desc'),mInp=$('#new-magic-max'),rInp=$('#new-magic-rech');
  const name=nInp.value.trim();if(!name)return;
  const maxC=Math.max(0,+(mInp?.value||0));
  S.magicItems.push({name,slot:sInp.value.trim(),desc:dInp.value.trim(),charges:maxC,maxCharges:maxC,rechargeOnScenario:rInp?rInp.checked:true,equipped:true});
  nInp.value='';sInp.value='';dInp.value='';if(mInp)mInp.value='0';renderLists();change();
};

$('#export-save').onclick=()=>{
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=STORAGE_KEY+'-sauvegarde.json';a.click();URL.revokeObjectURL(a.href);
};
$('#import-save-btn').onclick=()=>$('#import-save-file').click();
$('#import-save-file').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{const d=JSON.parse(rd.result);merge(S,d);renderLists();renderSessions();change();say('<b>Sauvegarde chargée</b> avec succès.')}catch(err){alert('Fichier JSON invalide.')}};
  rd.readAsText(f);e.target.value='';
};

let armed=false;const RL='Réinitialiser le scénario';
$('#reset').onclick=e=>{if(!armed){armed=true;e.target.textContent='Confirmer ? (PV, pouvoirs/objets, conditions, notes)';setTimeout(()=>{armed=false;e.target.textContent=RL},5000);return}
  S.pv=S.pvMax;rechargeScenario();S.cond='';S.notes='';S.log=[];
  $('#last').textContent='Scénario réinitialisé : stats, caractéristiques, historique et consommables conservés.';
  armed=false;e.target.textContent=RL;change()};
sync();
</script>
</body>
</html>`;
}

// Parse un fichier HTML (nouvelle fiche ou fiche legacy d'Elara) ou JSON
function parseCharacterFromFile(content) {
  const trimmed = content.trim();

  // 1. Cas JSON
  if (trimmed.startsWith("{")) {
    const data = JSON.parse(trimmed);
    if (data.vitals && Array.isArray(data.vitals) && data.stats && Array.isArray(data.stats)) {
      return data;
    }
    throw new Error("Ce fichier JSON est une sauvegarde d'état de session, pas un modèle complet de personnage.");
  }

  // 2. Cas HTML généré avec <script id="rpg-char-config" type="application/json">
  const configMatch = content.match(/<script id="rpg-char-config" type="application\/json">([\s\S]*?)<\/script>/i);
  if (configMatch) {
    const parsed = JSON.parse(configMatch[1]);
    if (parsed.portrait === "__FROM_HERO_IMG__") {
      const heroImg = content.match(/<div class="hero">\s*<img src="([^"]+)"/i);
      parsed.portrait = heroImg ? heroImg[1] : "";
    }
    return parsed;
  }

  // 3. Cas HTML legacy (ex: Elara Lorens – Suivi de fiche.html)
  const nameMatch = content.match(/<h1>([\s\S]*?)<\/h1>/i);
  const subMatch = content.match(/<div class="hero">[\s\S]*?<p>([\s\S]*?)<\/p>/i);
  const imgMatch = content.match(/<div class="hero">\s*<img src="([^"]+)"/i);

  const base = structuredClone(CHARACTER_TEMPLATES.elara);
  if (nameMatch) base.name = nameMatch[1].trim();
  if (subMatch) base.subtitle = subMatch[1].trim();
  base.portrait = imgMatch ? imgMatch[1] : "";
  base.id = slugify(base.name) + "-" + Date.now().toString(36).slice(-4);
  base.storageKey = slugify(base.name) + "-v1";

  try {
    const defMatch = content.match(/const DEF=(\{[\s\S]*?\});\n/);
    const labMatch = content.match(/const LAB=(\{[\s\S]*?\});\n/);
    const vitMatch = content.match(/const VIT=(\[[\s\S]*?\]);\n/);
    const resMatch = content.match(/const RES=(\[[\s\S]*?\]);\n/);
    const itemsMatch = content.match(/const ITEMS=(\{[\s\S]*?\});\n/);
    const weapMatch = content.match(/const WEAP=(\[[\s\S]*?\]);\n/);

    const evalSafe = str => Function('"use strict";return (' + str + ')')();

    const DEF = defMatch ? evalSafe(defMatch[1]) : null;
    const LAB = labMatch ? evalSafe(labMatch[1]) : {};
    const VIT = vitMatch ? evalSafe(vitMatch[1]) : null;
    const RES = resMatch ? evalSafe(resMatch[1]) : null;
    const ITEMS = itemsMatch ? evalSafe(itemsMatch[1]) : null;
    const WEAP = weapMatch ? evalSafe(weapMatch[1]) : null;

    if (DEF && VIT) {
      base.vitals = VIT.map(([label, key, maxOrRef, color, isHp]) => ({
        key,
        label,
        value: DEF[key] ?? 0,
        max: isHp ? (DEF.pvMax ?? DEF[key] ?? 15) : (typeof maxOrRef === "number" ? maxOrRef : 0),
        color: color || "--acc",
        isHp: !!isHp,
        showBar: !!isHp || maxOrRef === 100
      }));
    }
    if (DEF?.stats) {
      base.stats = Object.keys(DEF.stats).map(k => ({
        key: k,
        label: LAB[k] || k,
        value: DEF.stats[k]
      }));
    }
    if (WEAP) {
      base.weapons = WEAP.map(([name, expr]) => ({ name, expr }));
    }
    if (RES && DEF?.res) {
      base.resources = RES.map(([key, name, desc, max]) => ({
        key,
        name,
        desc,
        value: DEF.res[key] ?? max,
        max,
        rechargeOnScenario: (DEF.res[key] ?? max) > 0
      }));
    }
    if (ITEMS && DEF?.items) {
      base.items = Object.keys(ITEMS).map(key => ({
        key,
        label: ITEMS[key],
        value: DEF.items[key] ?? 0
      }));
    }
    if (DEF?.chasse) {
      base.chasse = Object.keys(DEF.chasse).map(key => ({
        key,
        label: key,
        value: DEF.chasse[key] ?? 0
      }));
    }
  } catch (e) {
    console.warn("Import partiel depuis HTML legacy :", e);
  }

  return base;
}

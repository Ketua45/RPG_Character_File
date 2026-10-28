# ⚔️ RPG Character Sheet Studio (`Atelier de Fiches JDR`)

A zero-dependency, browser-based studio for designing, customizing, previewing, and exporting **100% standalone HTML RPG character sheets**.

Developed by **Compagnie Française de Systèmes et Algorithmes**.

---

## ✨ Key Features

### 🎨 Interactive Studio (`index.html`)
- **Live Split-Screen Preview**: Edit identity, stats, skills, inventory, lore, and session logs on the left while testing the interactive character sheet in real time on the right (Desktop & Mobile views).
- **Character Roster & Templates**: Manage multiple characters in browser `localStorage` and start quickly from 4 built-in templates:
  - **Elara Lorens** *(Half-Elf · Ranger · Scout)*
  - **Garrick Vane** *(Human · Warrior · Shieldbreaker)*
  - **Lyra Valen** *(High-Elf · Mage · Arcane Scholar)*
  - **Blank Standard Sheet** *(Customizable starter template)*
- **Theme & Portrait Engine**:
  - 5 built-in color palettes (*Forest & Gold*, *Blood & Steel*, *Arcane Purple*, *Royal Parchment*, *Abyss & Silver*) + full 10-color custom picker and Light/Dark/Auto mode.
  - Built-in client-side portrait cropper & JPEG compressor (`304×456` 2:3 cover aspect ratio) embedded directly as Base64 data URLs.
- **Import & Re-Edit**: Import any previously exported `.html` sheet (including legacy sheets) or `.json` model back into the studio.

### 📜 Standalone Character Sheet (`.html` Export)
Each exported character sheet is a **single, self-contained `.html` file** that works offline on desktop, tablet, or mobile with automatic `localStorage` persistence:
- **Hero Banner & Identity**: Portrait, name, class/career subtitle, and physical/military metadata (*Gender, Age, Height, Weight, Rank*).
- **3 Organized Sheet Tabs**:
  1. **⚔ Play Sheet (`Fiche de jeu`)**: Vitals, Characteristics, Dice & Weapons/Armor roller, Categorized Skills, Scenario Powers, Magic Items, Consumable & Non-Consumable Inventories, and Active Session Notes.
  2. **📜 Lore & History (`Historique & Lore`)**: Backstory, Appearance & Objectives, Allies & Relations, and Hunting / Achievements Tracker (`Tableau de chasse`).
  3. **📖 Session Log (`Journal des Sessions`)**: Scenario history with date, rewards (`+XP`, `+Gold`), and summary, plus one-click archiving from active session notes.
- **Built-in Rules & Validation**:
  - **Experience & Characteristics Budget**: Minimum `350 XP`; base characteristics clamped between `30` and `70`, with automatic validation ensuring the sum of base characteristics never exceeds total `XP`.
  - **Edit-Mode Protection (`✎ Éditer`)**: Critical progression counters (*Corruption, Insanity, Experience, Luck*), base characteristics, and temporary characteristic *Boosts* are locked during normal play and only editable when Edit Mode (`✎ Éditer`) is active.
- **Dynamic Equipment & Dice Roller**:
  - **Linked Weapons & Armors**: Equipping (`✓ Équipé` / `✦ Équipé`) or unequipping (`En sac`) a weapon or armor in the Non-Consumable Inventory or Magic Items automatically adds or removes its roll button (`⚔` / `🛡` / `✦`) in the **Dice & Weapons** section.
  - **Categorized Skills (`🗣 Social`, `💪 Corporel`, `🛠 Utilitaire`)**: Click any characteristic or skill to roll a `d100` against `Base + Boost + Skill Bonus` with automatic margin calculation.
  - **Session Roll History**: Full scrollable session dice log with `[HH:MM:SS]` timestamps and roll counter.
- **Multi-Page PDF Export (`📄 PDF`)**:
  - Dedicated `@media print` stylesheet and print trigger that formats all 3 tabs with automatic page breaks (`1 tab = 1 PDF page`), auto-expanded textareas, and header/footer branding.

---

## 📁 Repository Structure

```text
RPG_Character_File/
├── index.html                  # Main Studio application (5-tab editor + live preview)
├── README.md                   # Project documentation (English)
├── .gitignore                  # Git ignore rules
├── css/
│   └── style.css               # Studio layout, dark gold theme, and responsive styles
├── js/
│   ├── templates.js            # SVG avatars, color presets, and 4 character templates
│   ├── generator.js            # Standalone HTML/CSS/JS sheet compiler & HTML/JSON parser
│   └── app.js                  # Studio state management, DOM bindings, and validation
└── tests/
    └── verify.js               # Automated Node.js verification suite
```

---

## 🚀 Getting Started

### 1. Run the Studio Locally
No build step or server is required. Simply open [`index.html`](./index.html) in any modern web browser (Chrome, Edge, Firefox, Safari):

```powershell
# Windows PowerShell
Start-Process .\index.html
```

Or serve the folder with any static HTTP server:

```bash
npx serve .
```

### 2. Run the Verification Suite
If you have [Node.js](https://nodejs.org/) installed, you can verify syntax, standalone HTML generation, embedded script compilation, and round-trip import/export:

```bash
node tests/verify.js
```

---

## 🛠️ Architecture Overview

| Module | Responsibility |
| :--- | :--- |
| [`js/templates.js`](./js/templates.js) | Defines `DEFAULT_AVATARS`, `ELARA_PORTRAIT`, `THEME_PRESETS`, and `CHARACTER_TEMPLATES` (`elara`, `vierge`, `guerrier`, `mage`). |
| [`js/generator.js`](./js/generator.js) | Exports `generateStandaloneHTML(char, isPreview, initialTab)` which compiles a character object into a self-contained HTML document, and `parseCharacterFromFile(content)` which reconstructs a character model from exported `.html`, legacy `.html`, or `.json` files. |
| [`js/app.js`](./js/app.js) | Manages the Studio UI, `localStorage` roster persistence, XP/Characteristic budget enforcement, portrait canvas resizing, and live `<iframe>` preview synchronization. |

---

## 📄 License & Credits

© **Compagnie Française de Systèmes et Algorithmes** — All rights reserved.


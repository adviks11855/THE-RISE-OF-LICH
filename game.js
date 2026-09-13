// game.js

const canvas = document.getElementById("creatureCanvas");
const ctx = canvas.getContext("2d");

const UI = {
  hud: document.getElementById("hud"),
  startMenu: document.getElementById("startMenu"),
  pauseMenu: document.getElementById("pauseMenu"),
  deathScreen: document.getElementById("deathScreen"),
  achievementsMenu: document.getElementById("achievementsMenu"),

  pauseButton: document.getElementById("pauseButton"),

  pauseMain: document.getElementById("pauseMain"),
  audioPanel: document.getElementById("audioPanel"),
  graphicsPanel: document.getElementById("graphicsPanel"),
  controlsPanel: document.getElementById("controlsPanel"),

  resumeBtn: document.getElementById("resumeBtn"),
  audioBtn: document.getElementById("audioBtn"),
  graphicsBtn: document.getElementById("graphicsBtn"),
  controlsBtn: document.getElementById("controlsBtn"),
  quitBtn: document.getElementById("quitBtn"),

  audioBackBtn: document.getElementById("audioBackBtn"),
  graphicsBackBtn: document.getElementById("graphicsBackBtn"),
  controlsBackBtn: document.getElementById("controlsBackBtn"),

  sanityBar: document.getElementById("sanityBar"),
  staminaBar: document.getElementById("staminaBar"),
  ritualProgressBar: document.getElementById("ritualProgressBar"),
  interactionPrompt: document.getElementById("interactionPrompt"),

  timer: document.getElementById("timerDisplay"),
  ritual: document.getElementById("ritualDisplay"),
  score: document.getElementById("scoreDisplay"),
  combo: document.getElementById("comboDisplay"),

  finalTime: document.getElementById("finalTimeDisplay"),
  finalScore: document.getElementById("finalScoreDisplay"),
  finalRituals: document.getElementById("finalRitualsDisplay"),
  newRecordTag: document.getElementById("newRecordTag"),

  video: document.getElementById("jumpscareVideo"),
  bgAudio: document.getElementById("bgAudio"),
  screamAudio: document.getElementById("screamAudio"),
  menuAudio: document.getElementById("menuAudio")
};

/* ---------------------------------------------------------
   AUDIO SYNTHESIS FOR ACHIEVEMENTS (No External File Reliance)
--------------------------------------------------------- */

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playHorrorSynth(type) {
  try {
    const ctx = getAudioContext();
    const masterGain = ctx.createGain();
    const masterVol = (Settings.audio.master / 100) * (Settings.audio.sfx / 100);
    masterGain.gain.value = masterVol;
    masterGain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "normal") {
      // Soft dark chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.2);
    } else if (type === "rare") {
      // Deep impact + screech
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.6);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 1.5);
    } else if (type === "secret") {
      // Whisper + distorted pitch drop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 1.0);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 2.0);
    }
  } catch (e) {
    console.warn("WebAudio sound synthesis error:", e);
  }
}

/* ---------------------------------------------------------
   ACHIEVEMENT SYSTEM & PERSISTENT PROGRESSION DEFINITION
--------------------------------------------------------- */

const ACHIEVEMENTS_DEFINITIONS = [
  { id: "firstNight", name: "THE FIRST NIGHT", desc: "Survive for 60 seconds.", category: "SURVIVAL", rarity: "COMMON", icon: "☠", maxProgress: 60, scoreBonus: 250 },
  { id: "survivor", name: "SURVIVOR", desc: "Survive the first 30 seconds.", category: "SURVIVAL", rarity: "COMMON", icon: "☠", maxProgress: 30, scoreBonus: 100 },
  { id: "longNight", name: "THE LONG NIGHT", desc: "Survive 5 minutes. The Lich remembers you.", category: "SURVIVAL", rarity: "UNCOMMON", icon: "☠", maxProgress: 300, scoreBonus: 500 },
  { id: "eternalNight", name: "ETERNAL NIGHT", desc: "Survive 10 minutes. You should not still be alive.", category: "SURVIVAL", rarity: "EPIC", icon: "☠", maxProgress: 600, scoreBonus: 1000 },
  { id: "untouchable", name: "UNTOUCHABLE", desc: "Complete a run without taking a single hit.", category: "SURVIVAL", rarity: "RARE", icon: "☠", maxProgress: 1, scoreBonus: 750 },
  { id: "closeCall", name: "CLOSE CALL", desc: "Survive 10 near misses in one run.", category: "COMBAT / EVASION", rarity: "UNCOMMON", icon: "☠", maxProgress: 10, scoreBonus: 300 },
  { id: "deathsDoor", name: "DEATH'S DOOR", desc: "Survive an attack while below 10% sanity.", category: "SANITY", rarity: "RARE", icon: "☠", maxProgress: 1, scoreBonus: 500 },
  { id: "madness", name: "MADNESS", desc: "Remain below 10% sanity for 60 continuous seconds.", category: "SANITY", rarity: "RARE", icon: "☠", maxProgress: 60, scoreBonus: 600 },
  { id: "emptyMind", name: "EMPTY MIND", desc: "Reach 0% sanity without dying immediately.", category: "SANITY", rarity: "EPIC", icon: "☠", isSecret: true, maxProgress: 1, scoreBonus: 800 },
  { id: "ritualist", name: "RITUALIST", desc: "Complete every ritual in one run.", category: "RITUAL", rarity: "UNCOMMON", icon: "☠", maxProgress: 5, scoreBonus: 400 },
  { id: "speedRitual", name: "SPEED RITUAL", desc: "Complete a ritual in under 10 seconds.", category: "RITUAL", rarity: "UNCOMMON", icon: "☠", maxProgress: 1, scoreBonus: 350 },
  { id: "perfectRitual", name: "PERFECT RITUAL", desc: "Complete a ritual without being interrupted.", category: "RITUAL", rarity: "COMMON", icon: "☠", maxProgress: 1, scoreBonus: 200 },
  { id: "noCursor", name: "NO CURSOR", desc: "Survive an entire run with Invisible Cursor mode enabled.", category: "MASTERY", rarity: "EPIC", icon: "☠", maxProgress: 1, scoreBonus: 1000 },
  { id: "blindFaith", name: "BLIND FAITH", desc: "Complete a ritual while Invisible Cursor mode is enabled.", category: "RITUAL", rarity: "RARE", icon: "☠", maxProgress: 1, scoreBonus: 500 },
  { id: "possessed", name: "POSSESSED", desc: "Reach Phase 4 — Possession.", category: "SURVIVAL", rarity: "RARE", icon: "☠", maxProgress: 1, scoreBonus: 500 },
  { id: "survivedPossession", name: "SURVIVED POSSESSION", desc: "Enter Phase 4 and survive for 30 seconds.", category: "SURVIVAL", rarity: "EPIC", icon: "☠", maxProgress: 30, scoreBonus: 1000 },
  { id: "exorcist", name: "EXORCIST", desc: "Complete the final ritual.", category: "RITUAL", rarity: "LEGENDARY", icon: "☠", maxProgress: 1, scoreBonus: 1500 },
  { id: "lastSecond", name: "LAST SECOND", desc: "Complete the final ritual when sanity is below 10%.", category: "RITUAL", rarity: "EPIC", icon: "☠", maxProgress: 1, scoreBonus: 850 },
  { id: "impossible", name: "INSANE", desc: "Survive 3 minutes on Impossible difficulty.", category: "DIFFICULTY", rarity: "LEGENDARY", icon: "☠", maxProgress: 180, scoreBonus: 1500 },
  { id: "nightmare", name: "NIGHTMARE", desc: "Complete an entire run on Impossible difficulty.", category: "DIFFICULTY", rarity: "LEGENDARY", icon: "☠", maxProgress: 1, scoreBonus: 2000 },
  { id: "perfectRun", name: "PERFECT RUN", desc: "Complete every ritual without damage, low sanity, or interruptions.", category: "MASTERY", rarity: "LEGENDARY", icon: "☠", maxProgress: 1, scoreBonus: 2500 },
  { id: "lichBait", name: "LICH BAIT", desc: "Successfully bait the Lich into a failed lunge.", category: "COMBAT / EVASION", rarity: "UNCOMMON", icon: "☠", isSecret: true, maxProgress: 1, scoreBonus: 300 },
  { id: "predator", name: "PREDATOR", desc: "Trigger 5 successful near-miss evasions during Frenzy phase.", category: "COMBAT / EVASION", rarity: "EPIC", icon: "☠", maxProgress: 5, scoreBonus: 800 },
  { id: "unfazed", name: "UNFAZED", desc: "Survive 60 continuous seconds while sanity is below 25%.", category: "SANITY", rarity: "RARE", icon: "☠", maxProgress: 60, scoreBonus: 600 },
  { id: "heartOfDarkness", name: "HEART OF DARKNESS", desc: "Survive for 20 continuous seconds while Sanity < 20% and Stamina < 20%.", category: "SANITY", rarity: "EPIC", icon: "☠", maxProgress: 20, scoreBonus: 900 },
  { id: "noPlaceToHide", name: "NO PLACE TO HIDE", desc: "Survive a Lich attack immediately after leaving a safe zone.", category: "COMBAT / EVASION", rarity: "RARE", icon: "☠", maxProgress: 1, scoreBonus: 500 },
  { id: "forbidden", name: "FORBIDDEN", desc: "Enter every cursed zone in a single run.", category: "EXPLORATION", rarity: "RARE", icon: "☠", isSecret: true, maxProgress: 3, scoreBonus: 500 },
  { id: "lost", name: "LOST", desc: "Discover every cursed zone.", category: "EXPLORATION", rarity: "RARE", icon: "☠", maxProgress: 3, scoreBonus: 400 },
  { id: "greed", name: "GREED", desc: "Complete 3 rituals consecutively without using a safe zone.", category: "RITUAL", rarity: "RARE", icon: "☠", maxProgress: 3, scoreBonus: 600 },
  { id: "pacifist", name: "PACIFIST", desc: "Complete an entire run without baiting or near-missing the Lich.", category: "MASTERY", rarity: "EPIC", icon: "☠", maxProgress: 1, scoreBonus: 1000 },
  { id: "speedrunner", name: "SPEEDRUNNER", desc: "Complete all rituals in under 2 minutes.", category: "RITUAL", rarity: "LEGENDARY", icon: "☠", maxProgress: 120, scoreBonus: 1500 },
  { id: "staminaMaster", name: "STAMINA MASTER", desc: "Complete an entire run without reaching critical stamina.", category: "STAMINA", rarity: "RARE", icon: "☠", maxProgress: 1, scoreBonus: 500 },
  { id: "slowAndSteady", name: "SLOW AND STEADY", desc: "Survive a near-miss while moving at very low speed.", category: "COMBAT / EVASION", rarity: "UNCOMMON", icon: "☠", maxProgress: 1, scoreBonus: 350 },
  { id: "theLastRitual", name: "THE LAST RITUAL", desc: "Reach the final ritual.", category: "RITUAL", rarity: "UNCOMMON", icon: "☠", maxProgress: 1, scoreBonus: 300 },
  { id: "again", name: "AGAIN", desc: "Immediately restart a run after dying.", category: "MASTERY", rarity: "COMMON", icon: "☠", isSecret: true, maxProgress: 1, scoreBonus: 100 },
  { id: "obsession", name: "OBSESSION", desc: "Play 10 total runs.", category: "MASTERY", rarity: "COMMON", icon: "☠", maxProgress: 10, scoreBonus: 300 },
  { id: "addictedToDeath", name: "ADDICTED TO DEATH", desc: "Complete 25 total runs.", category: "MASTERY", rarity: "UNCOMMON", icon: "☠", maxProgress: 25, scoreBonus: 750 },
  { id: "noFear", name: "NO FEAR", desc: "Survive an entire run without entering a safe zone.", category: "MASTERY", rarity: "EPIC", icon: "☠", maxProgress: 1, scoreBonus: 1000 },
  { id: "sanctuary", name: "SANCTUARY", desc: "Use every safe zone created in a single run.", category: "EXPLORATION", rarity: "UNCOMMON", icon: "☠", maxProgress: 3, scoreBonus: 400 },
  { id: "theHunter", name: "THE HUNTER", desc: "Dodge 10 Lich lunge attacks during the same run.", category: "COMBAT / EVASION", rarity: "EPIC", icon: "☠", maxProgress: 10, scoreBonus: 1000 }
];

const AchievementSystem = {
  data: {
    achievements: {},
    stats: {
      totalRuns: 0,
      totalDeaths: 0,
      longestSurvival: 0,
      totalSurvivalTime: 0,
      totalRituals: 0,
      totalNearMisses: 0,
      highestScore: 0,
      bestCombo: 1,
      highestPhase: 1
    }
  },

  // Run-specific temporary tracker
  runStats: {
    nearMisses: 0,
    frenzyNearMisses: 0,
    lungeDodges: 0,
    damageTaken: 0,
    ritualsCompleted: 0,
    consecutiveRitualsNoSafe: 0,
    safeZonesEntered: new Set(),
    cursedZonesEntered: new Set(),
    criticalStaminaReached: false,
    lowestSanity: 100,
    interruptedRituals: 0,
    madnessContinuousMs: 0,
    unfazedContinuousMs: 0,
    heartOfDarknessMs: 0,
    possessionTimeMs: 0,
    leftSafeZoneTime: 0,
    currentRitualStartTime: 0,
    currentRitualInterrupted: false
  },

  queue: [],
  isDisplayingNotification: false,
  deathTime: 0,

  init() {
    this.loadFromStorage();
    this.bindMenuUI();
  },

  loadFromStorage() {
    try {
      const saved = localStorage.getItem("LICH_PROGRESSION_DATA");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.achievements) this.data.achievements = parsed.achievements;
        if (parsed.stats) this.data.stats = { ...this.data.stats, ...parsed.stats };
      }
    } catch (e) {
      console.warn("Could not load achievement data from localStorage:", e);
    }

    // Ensure all registered achievements exist in state
    ACHIEVEMENTS_DEFINITIONS.forEach((def) => {
      if (!this.data.achievements[def.id]) {
        this.data.achievements[def.id] = { unlocked: false, unlockedAt: null, progress: 0, attempts: 0 };
      }
    });
  },

  saveToStorage() {
    try {
      localStorage.setItem("LICH_PROGRESSION_DATA", JSON.stringify(this.data));
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
    }
  },

  resetRunStats() {
    this.runStats = {
      nearMisses: 0,
      frenzyNearMisses: 0,
      lungeDodges: 0,
      damageTaken: 0,
      ritualsCompleted: 0,
      consecutiveRitualsNoSafe: 0,
      safeZonesEntered: new Set(),
      cursedZonesEntered: new Set(),
      criticalStaminaReached: false,
      lowestSanity: 100,
      interruptedRituals: 0,
      madnessContinuousMs: 0,
      unfazedContinuousMs: 0,
      heartOfDarknessMs: 0,
      possessionTimeMs: 0,
      leftSafeZoneTime: 0,
      currentRitualStartTime: 0,
      currentRitualInterrupted: false
    };
  },

  unlock(id) {
    const achState = this.data.achievements[id];
    const def = ACHIEVEMENTS_DEFINITIONS.find((a) => a.id === id);

    if (!achState || !def) return;
    if (achState.unlocked) return; // NEVER UNLOCK TWICE

    achState.unlocked = true;
    achState.unlockedAt = Date.now();
    achState.progress = def.maxProgress;

    Player.score += def.scoreBonus || 0;

    this.saveToStorage();
    this.enqueueNotification(def);
    this.renderMenu();
  },

  updateProgress(id, progressValue) {
    const achState = this.data.achievements[id];
    const def = ACHIEVEMENTS_DEFINITIONS.find((a) => a.id === id);
    if (!achState || !def || achState.unlocked) return;

    achState.progress = Math.min(def.maxProgress, Math.max(achState.progress, progressValue));
    this.saveToStorage();

    if (achState.progress >= def.maxProgress) {
      this.unlock(id);
    }
  },

  enqueueNotification(def) {
    this.queue.push(def);
    this.processQueue();
  },

  processQueue() {
    if (this.isDisplayingNotification || this.queue.length === 0) return;

    this.isDisplayingNotification = true;
    const def = this.queue.shift();

    const popup = document.createElement("div");
    popup.className = "ach-popup";

    // Rarity sound event
    if (def.isSecret) playHorrorSynth("secret");
    else if (def.rarity === "LEGENDARY" || def.rarity === "EPIC") playHorrorSynth("rare");
    else playHorrorSynth("normal");

    popup.innerHTML = `
      <div class="ach-popup-header">
        <span>☠ ACHIEVEMENT UNLOCKED</span>
        <span class="ach-card-rarity rarity-${def.rarity}">${def.rarity}</span>
      </div>
      <div class="ach-popup-title">${def.name}</div>
      <div class="ach-popup-desc">${def.desc}</div>
      ${def.scoreBonus ? `<div class="ach-popup-bonus">+${def.scoreBonus} SCORE</div>` : ""}
    `;

    const container = document.getElementById("achievementNotificationContainer");
    container.appendChild(popup);

    setTimeout(() => popup.classList.add("show"), 20);

    setTimeout(() => {
      popup.classList.remove("show");
      popup.classList.add("hide");
      setTimeout(() => {
        popup.remove();
        this.isDisplayingNotification = false;
        this.processQueue();
      }, 400);
    }, 4000);
  },

  bindMenuUI() {
    const achBtn = document.getElementById("achievementsBtn");
    const pauseAchBtn = document.getElementById("pauseAchBtn");
    const closeBtn = document.getElementById("achievementsCloseBtn");

    const openUI = () => {
      this.renderMenu();
      UI.achievementsMenu.classList.remove("hidden");
    };

    if (achBtn) achBtn.addEventListener("click", openUI);
    if (pauseAchBtn) pauseAchBtn.addEventListener("click", openUI);
    if (closeBtn) closeBtn.addEventListener("click", () => UI.achievementsMenu.classList.add("hidden"));

    document.querySelectorAll(".ach-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".ach-tab-btn").forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");

        const tab = e.target.dataset.tab;
        document.getElementById("achievementsListPanel").classList.toggle("hidden", tab !== "achievements");
        document.getElementById("statsPanel").classList.toggle("hidden", tab !== "stats");
        document.getElementById("categoryFilterContainer").classList.toggle("hidden", tab !== "achievements");
      });
    });

    document.querySelectorAll(".ach-cat-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".ach-cat-btn").forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.renderMenu(e.target.dataset.cat);
      });
    });
  },

  renderMenu(filterCategory = "ALL") {
    let unlockedCount = 0;
    const total = ACHIEVEMENTS_DEFINITIONS.length;

    ACHIEVEMENTS_DEFINITIONS.forEach((def) => {
      if (this.data.achievements[def.id] && this.data.achievements[def.id].unlocked) {
        unlockedCount++;
      }
    });

    const percent = Math.floor((unlockedCount / total) * 100);

    document.getElementById("achUnlockedCount").textContent = `${unlockedCount} / ${total} UNLOCKED`;
    document.getElementById("achMainProgressBar").style.width = `${percent}%`;
    document.getElementById("achCompletionPercent").textContent = `${percent}% COMPLETE`;

    const grid = document.getElementById("achievementsListPanel");
    grid.innerHTML = "";

    ACHIEVEMENTS_DEFINITIONS.forEach((def) => {
      if (filterCategory !== "ALL") {
        if (filterCategory === "SECRET" && !def.isSecret) return;
        if (filterCategory !== "SECRET" && def.category !== filterCategory) return;
      }

      const achState = this.data.achievements[def.id] || { unlocked: false, progress: 0 };
      const card = document.createElement("div");
      card.className = `ach-card ${achState.unlocked ? "unlocked" : "locked"}`;

      let displayTitle = def.name;
      let displayDesc = def.desc;

      if (!achState.unlocked && def.isSecret) {
        displayTitle = "☠ ????????";
        displayDesc = "Some doors should remain closed.";
      }

      let progressText = "";
      if (!achState.unlocked && def.maxProgress > 1) {
        progressText = `<div class="ach-card-progress">PROGRESS: ${Math.floor(achState.progress)} / ${def.maxProgress}</div>`;
      }

      card.innerHTML = `
        <span class="ach-card-rarity rarity-${def.rarity}">${def.rarity}</span>
        <div class="ach-card-icon">${def.icon}</div>
        <div class="ach-card-title">${displayTitle}</div>
        <div class="ach-card-desc">${displayDesc}</div>
        ${progressText}
        <div class="ach-card-status ${achState.unlocked ? "unlocked" : "locked"}">
          ${achState.unlocked ? "UNLOCKED ✓" : "[ LOCKED ]"}
        </div>
      `;

      grid.appendChild(card);
    });

    // Render Lifetime Statistics Screen
    const s = this.data.stats;
    document.getElementById("statTotalRuns").textContent = s.totalRuns;
    document.getElementById("statTotalDeaths").textContent = s.totalDeaths;
    document.getElementById("statLongestSurvival").textContent = formatTime(s.longestSurvival);
    document.getElementById("statTotalSurvival").textContent = formatTimeHours(s.totalSurvivalTime);
    document.getElementById("statTotalRituals").textContent = s.totalRituals;
    document.getElementById("statTotalNearMisses").textContent = s.totalNearMisses;
    document.getElementById("statHighestScore").textContent = Math.floor(s.highestScore);
    document.getElementById("statBestCombo").textContent = `x${s.bestCombo}`;
    document.getElementById("statHighestPhase").textContent = s.highestPhase;
  }
};

/* ---------------------------------------------------------
   RITUAL IMAGE
--------------------------------------------------------- */

const ritualImage = new Image();
ritualImage.src = "ritual zones.png";

/* ---------------------------------------------------------
   GAME STATE & ENTITY DATA
--------------------------------------------------------- */

const GameState = {
  current: "MENU",
  paused: false
};

const Player = {
  sanity: 100,
  stamina: 100,
  score: 0,
  combo: 1,
  lastMoveTime: 0
};

const Rules = {
  maxRituals: 5,
  difficulty: "EASY"
};

const numSegments = 30;
const segmentLength = 15;
const spine = [];
for (let i = 0; i < numSegments; i++) {
  spine.push({ x: -1000, y: -1000, angle: 0 });
}

let gameStartTime = 0;
let lastTime = performance.now();
let survivalMs = 0;
let gameClock = 0;

/* ---------------------------------------------------------
   SETTINGS
--------------------------------------------------------- */

const Settings = {
  audio: {
    master: 80,
    music: 70,
    sfx: 100,
    ambience: 80
  },

  graphics: {
    screenShake: true,
    glitchEffects: true,
    flashEffects: true,
    particles: "HIGH",
    distortion: true,

    reducedShake: false,
    reducedFlashes: false,
    reducedDistortion: false,
    simplifiedEffects: false,

    cursorVisible: true
  }
};

/* ---------------------------------------------------------
   AUDIO
--------------------------------------------------------- */

function applyAudioSettings() {
  const master = Settings.audio.master / 100;
  const music = Settings.audio.music / 100;
  const sfx = Settings.audio.sfx / 100;
  const ambience = Settings.audio.ambience / 100;

  UI.bgAudio.volume = Math.max(0, Math.min(1, master * music));
  UI.menuAudio.volume = Math.max(0, Math.min(1, master * music));
  UI.screamAudio.volume = Math.max(0, Math.min(1, master * sfx));

  window.gameAmbienceVolume = master * ambience;
}

/* ---------------------------------------------------------
   CURSOR SYSTEM
--------------------------------------------------------- */

const cursorSVG = {
  bone: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M16 4 L16 12 M16 20 L16 28 M4 16 L12 16 M20 16 L28 16' stroke='%23d1d5db' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%23ff0033'/%3E%3C/svg%3E") 16 16, crosshair`,
  blood: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' stroke='%23ff0033' stroke-width='2' fill='none'/%3E%3Cpolygon points='16,3 27,24 5,11 27,11 5,24' stroke='%23ff0033' stroke-width='1.5' fill='none'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%23ff0033'/%3E%3C/svg%3E") 16 16, crosshair`,
  blind: "none"
};

let currentCursorStyle = cursorSVG.bone;

/* ---------------------------------------------------------
   SETTINGS HELPERS
--------------------------------------------------------- */

function setHidden(element, hidden) {
  element.classList.toggle("hidden", hidden);
}

function showPauseMain() {
  setHidden(UI.pauseMain, false);
  setHidden(UI.audioPanel, true);
  setHidden(UI.graphicsPanel, true);
  setHidden(UI.controlsPanel, true);
}

function showPausePanel(panel) {
  setHidden(UI.pauseMain, true);
  setHidden(UI.audioPanel, panel !== UI.audioPanel);
  setHidden(UI.graphicsPanel, panel !== UI.graphicsPanel);
  setHidden(UI.controlsPanel, panel !== UI.controlsPanel);
}

function updateToggle(button, enabled) {
  button.dataset.value = enabled ? "ON" : "OFF";
  button.textContent = enabled ? "ON" : "OFF";
  button.classList.toggle("active", enabled);
}

function bindToggle(id, key) {
  const button = document.getElementById(id);
  button.addEventListener("click", () => {
    Settings.graphics[key] = !Settings.graphics[key];
    updateToggle(button, Settings.graphics[key]);
    applyGraphicsSettings();
  });
}

function applyGraphicsSettings() {
  document.body.classList.toggle("accessibility-reduced-shake", Settings.graphics.reducedShake);
  document.body.classList.toggle("accessibility-reduced-flash", Settings.graphics.reducedFlashes);
  document.body.classList.toggle("accessibility-reduced-distortion", Settings.graphics.reducedDistortion);
  document.body.classList.toggle("accessibility-simple-effects", Settings.graphics.simplifiedEffects);

  if (!Settings.graphics.glitchEffects || Settings.graphics.reducedDistortion || Settings.graphics.simplifiedEffects) {
    document.body.classList.remove("glitch-heavy", "ui-flicker");
  }

  updateToggle(document.getElementById("screenShakeToggle"), Settings.graphics.screenShake);
  updateToggle(document.getElementById("glitchEffectsToggle"), Settings.graphics.glitchEffects);
  updateToggle(document.getElementById("flashEffectsToggle"), Settings.graphics.flashEffects);
  updateToggle(document.getElementById("distortionToggle"), Settings.graphics.distortion);
  updateToggle(document.getElementById("reducedShakeToggle"), Settings.graphics.reducedShake);
  updateToggle(document.getElementById("reducedFlashToggle"), Settings.graphics.reducedFlashes);
  updateToggle(document.getElementById("reducedDistortionToggle"), Settings.graphics.reducedDistortion);
  updateToggle(document.getElementById("simplifiedEffectsToggle"), Settings.graphics.simplifiedEffects);
  updateToggle(document.getElementById("cursorVisibilityToggle"), Settings.graphics.cursorVisible);

  document.body.style.cursor = Settings.graphics.cursorVisible ? currentCursorStyle : "none";
}

/* ---------------------------------------------------------
   VOLUMES
--------------------------------------------------------- */

function bindVolume(id, outputId, setting) {
  const input = document.getElementById(id);
  const output = document.getElementById(outputId);

  input.value = Settings.audio[setting];
  output.textContent = `${Settings.audio[setting]}%`;

  input.addEventListener("input", () => {
    Settings.audio[setting] = Number(input.value);
    output.textContent = `${input.value}%`;
    applyAudioSettings();
  });
}

bindVolume("masterVolume", "masterVolumeValue", "master");
bindVolume("musicVolume", "musicVolumeValue", "music");
bindVolume("sfxVolume", "sfxVolumeValue", "sfx");
bindVolume("ambienceVolume", "ambienceVolumeValue", "ambience");

bindToggle("screenShakeToggle", "screenShake");
bindToggle("glitchEffectsToggle", "glitchEffects");
bindToggle("flashEffectsToggle", "flashEffects");
bindToggle("distortionToggle", "distortion");
bindToggle("reducedShakeToggle", "reducedShake");
bindToggle("reducedFlashToggle", "reducedFlashes");
bindToggle("reducedDistortionToggle", "reducedDistortion");
bindToggle("simplifiedEffectsToggle", "simplifiedEffects");
bindToggle("cursorVisibilityToggle", "cursorVisible");

document.querySelectorAll(".graphics-choice").forEach((button) => {
  button.addEventListener("click", () => {
    const setting = button.dataset.setting;
    const value = button.dataset.value;

    Settings.graphics[setting] = value;
    document.querySelectorAll(`.graphics-choice[data-setting="${setting}"]`).forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
  });
});

applyAudioSettings();
applyGraphicsSettings();

/* ---------------------------------------------------------
   MOUSE
--------------------------------------------------------- */

const mouse = {
  x: -1000,
  y: -1000,
  vx: 0,
  vy: 0,
  lastX: -1000,
  lastY: -1000
};

window.addEventListener("mousemove", (e) => {
  mouse.vx = e.clientX - mouse.lastX;
  mouse.vy = e.clientY - mouse.lastY;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.lastX = e.clientX;
  mouse.lastY = e.clientY;
  Player.lastMoveTime = performance.now();
});

/* ---------------------------------------------------------
   DIFFICULTY
--------------------------------------------------------- */

const DIFFICULTY_PRESETS = {
  EASY: { baseDelay: 0.018, speedScaling: 0.0005, maxDelay: 0.08, lungeMin: 10000, leadFactor: 0, hitRadius: 12 },
  NORMAL: { baseDelay: 0.03, speedScaling: 0.001, maxDelay: 0.12, lungeMin: 7000, leadFactor: 1.5, hitRadius: 16 },
  HARD: { baseDelay: 0.05, speedScaling: 0.0025, maxDelay: 0.20, lungeMin: 4500, leadFactor: 4, hitRadius: 20 },
  IMPOSSIBLE: { baseDelay: 0.12, speedScaling: 0.012, maxDelay: 0.48, lungeMin: 1200, leadFactor: 12, hitRadius: 32 }
};

let activePreset = DIFFICULTY_PRESETS.EASY;

/* ---------------------------------------------------------
   WORLD
--------------------------------------------------------- */

let objectives = [];
let safeZones = [];
let completedRituals = 0;
let currentRitualProgress = 0;

function spawnObjective() {
  objectives.push({
    x: 100 + Math.random() * Math.max(1, canvas.width - 200),
    y: 100 + Math.random() * Math.max(1, canvas.height - 200),
    radius: 40,
    active: true
  });
}

function spawnSafeZone() {
  safeZones.push({
    id: safeZones.length + 1,
    x: 100 + Math.random() * Math.max(1, canvas.width - 200),
    y: 100 + Math.random() * Math.max(1, canvas.height - 200),
    radius: 60,
    stability: 100
  });
}

/* ---------------------------------------------------------
   AI
--------------------------------------------------------- */

const AI = {
  phase: "HUNTING",
  isLunging: false,
  isFeinting: false,
  nextLungeTime: 0,
  lungeRemaining: 0
};

function updateAI(dt) {
  let prevPhase = AI.phase;

  if (completedRituals >= 1 && completedRituals < 3) AI.phase = "STALKING";
  if (completedRituals >= 3 && completedRituals < Rules.maxRituals) AI.phase = "FRENZY";
  if (completedRituals === Rules.maxRituals) AI.phase = "POSSESSION";

  // Phase 4 Possession Achievement trigger
  if (AI.phase === "POSSESSION") {
    AchievementSystem.unlock("possessed");
    AchievementSystem.runStats.possessionTimeMs += dt;
    AchievementSystem.updateProgress("survivedPossession", Math.floor(AchievementSystem.runStats.possessionTimeMs / 1000));
  }

  // Track highest phase reached in persistent stats
  let phaseNum = 1;
  if (AI.phase === "STALKING") phaseNum = 2;
  if (AI.phase === "FRENZY") phaseNum = 3;
  if (AI.phase === "POSSESSION") phaseNum = 4;
  AchievementSystem.data.stats.highestPhase = Math.max(AchievementSystem.data.stats.highestPhase, phaseNum);

  if (gameClock >= AI.nextLungeTime && !AI.isLunging) {
    AI.isLunging = true;
    AI.lungeRemaining = 400;
    AI.nextLungeTime = gameClock + activePreset.lungeMin + Math.random() * 2000;
  }

  if (AI.isLunging) {
    AI.lungeRemaining -= dt;
    if (AI.lungeRemaining <= 0) {
      AI.lungeRemaining = 0;
      AI.isLunging = false;

      // Lich Bait check: player moved away fast during lunge
      const distToLich = Math.hypot(spine[0].x - mouse.x, spine[0].y - mouse.y);
      if (distToLich > 120) {
        AchievementSystem.unlock("lichBait");
        AchievementSystem.runStats.lungeDodges++;
        AchievementSystem.updateProgress("theHunter", AchievementSystem.runStats.lungeDodges);
      }
    }
  }
}

/* ---------------------------------------------------------
   RESOURCES & REAL-TIME ACHIEVEMENT EVALUATION
--------------------------------------------------------- */

function updateResources(dt) {
  const velocity = Math.hypot(mouse.vx, mouse.vy);

  if (velocity > 10) {
    Player.stamina = Math.max(0, Player.stamina - velocity * 0.05 * (dt / 16.67));
  } else if (performance.now() - Player.lastMoveTime > 300) {
    Player.stamina = Math.min(100, Player.stamina + 0.5 * (dt / 16.67));
  }

  if (Player.stamina < 15) {
    AchievementSystem.runStats.criticalStaminaReached = true;
  }

  const lichDist = Math.hypot(spine[0].x - mouse.x, spine[0].y - mouse.y);
  let inSafeZone = false;

  safeZones.forEach((sz) => {
    if (Math.hypot(sz.x - mouse.x, sz.y - mouse.y) < sz.radius) {
      inSafeZone = true;
      sz.stability = Math.max(0, sz.stability - 0.1 * (dt / 16.67));

      // Tracking safe zone visits
      AchievementSystem.runStats.safeZonesEntered.add(sz.id);
      AchievementSystem.runStats.cursedZonesEntered.add(sz.id);
      AchievementSystem.runStats.consecutiveRitualsNoSafe = 0; // Reset greed counter
    }
  });

  if (!inSafeZone && AchievementSystem.runStats.safeZonesEntered.size > 0) {
    AchievementSystem.runStats.leftSafeZoneTime = gameClock;
  }

  if (inSafeZone) {
    Player.sanity = Math.min(100, Player.sanity + 0.2 * (dt / 16.67));
  } else if (lichDist < 300) {
    Player.sanity = Math.max(0, Player.sanity - (300 - lichDist) * 0.0005 * (dt / 16.67));
  }

  AchievementSystem.runStats.lowestSanity = Math.min(AchievementSystem.runStats.lowestSanity, Player.sanity);

  /* --- REAL-TIME CONTINUOUS TIMERS & ACHIEVEMENTS --- */

  // 1. Survival time achievements
  const survSecs = Math.floor(survivalMs / 1000);
  AchievementSystem.updateProgress("survivor", survSecs);
  AchievementSystem.updateProgress("firstNight", survSecs);
  AchievementSystem.updateProgress("longNight", survSecs);
  AchievementSystem.updateProgress("eternalNight", survSecs);

  if (Rules.difficulty === "IMPOSSIBLE") {
    AchievementSystem.updateProgress("impossible", survSecs);
  }

  // 2. Continuous Sanity below 10% (Madness Achievement)
  const madnessTrackerUI = document.getElementById("madnessTracker");
  const madnessTimerDisplay = document.getElementById("madnessTimerDisplay");

  if (Player.sanity < 10) {
    AchievementSystem.runStats.madnessContinuousMs += dt;
    const madSecs = AchievementSystem.runStats.madnessContinuousMs / 1000;
    madnessTrackerUI.classList.remove("hidden");
    madnessTimerDisplay.textContent = `00:${Math.floor(madSecs).toString().padStart(2, "0")}`;

    AchievementSystem.updateProgress("madness", Math.floor(madSecs));
  } else {
    AchievementSystem.runStats.madnessContinuousMs = 0;
    madnessTrackerUI.classList.add("hidden");
  }

  // 3. Continuous Sanity below 25% (Unfazed)
  if (Player.sanity < 25) {
    AchievementSystem.runStats.unfazedContinuousMs += dt;
    AchievementSystem.updateProgress("unfazed", Math.floor(AchievementSystem.runStats.unfazedContinuousMs / 1000));
  } else {
    AchievementSystem.runStats.unfazedContinuousMs = 0;
  }

  // 4. Heart of Darkness (Sanity < 20% AND Stamina < 20%)
  if (Player.sanity < 20 && Player.stamina < 20) {
    AchievementSystem.runStats.heartOfDarknessMs += dt;
    AchievementSystem.updateProgress("heartOfDarkness", Math.floor(AchievementSystem.runStats.heartOfDarknessMs / 1000));
  } else {
    AchievementSystem.runStats.heartOfDarknessMs = 0;
  }

  // 5. Empty Mind (Sanity == 0% and survived)
  if (Player.sanity <= 0) {
    AchievementSystem.unlock("emptyMind");
  }

  // Exploration progress
  AchievementSystem.updateProgress("forbidden", AchievementSystem.runStats.cursedZonesEntered.size);
  AchievementSystem.updateProgress("lost", AchievementSystem.runStats.cursedZonesEntered.size);
  AchievementSystem.updateProgress("sanctuary", AchievementSystem.runStats.safeZonesEntered.size);

  if (Player.sanity < 30 && Settings.graphics.glitchEffects && !Settings.graphics.reducedDistortion && !Settings.graphics.simplifiedEffects) {
    document.body.classList.add("ui-flicker");
  } else {
    document.body.classList.remove("ui-flicker");
  }

  if (Player.stamina < 15 && Settings.graphics.glitchEffects && Settings.graphics.distortion && !Settings.graphics.reducedDistortion && !Settings.graphics.simplifiedEffects) {
    document.body.classList.add("glitch-heavy");
  } else {
    document.body.classList.remove("glitch-heavy");
  }

  UI.sanityBar.style.width = `${Math.max(0, Player.sanity)}%`;
  UI.staminaBar.style.width = `${Math.max(0, Player.stamina)}%`;
  UI.ritual.textContent = `${completedRituals} / ${Rules.maxRituals}`;
  UI.score.textContent = Math.floor(Player.score);
  UI.combo.textContent = `x${Player.combo}`;
}

/* ---------------------------------------------------------
   RITUALS
--------------------------------------------------------- */

function handleRituals(dt) {
  let interacting = false;

  objectives.forEach((obj) => {
    if (obj.active && Math.hypot(obj.x - mouse.x, obj.y - mouse.y) < obj.radius) {
      interacting = true;

      if (currentRitualProgress === 0) {
        AchievementSystem.runStats.currentRitualStartTime = gameClock;
        AchievementSystem.runStats.currentRitualInterrupted = false;
      }

      currentRitualProgress += dt * 0.05;
      UI.ritualProgressBar.style.width = `${Math.min(100, currentRitualProgress)}%`;

      if (currentRitualProgress >= 100) {
        obj.active = false;
        completedRituals++;
        AchievementSystem.runStats.ritualsCompleted++;

        const ritualTime = (gameClock - AchievementSystem.runStats.currentRitualStartTime) / 1000;

        // Speed Ritual Check
        if (ritualTime <= 10) {
          AchievementSystem.unlock("speedRitual");
        }

        // Perfect Ritual Check
        if (!AchievementSystem.runStats.currentRitualInterrupted) {
          AchievementSystem.unlock("perfectRitual");
        }

        // Blind Faith Check
        if (currentCursorStyle === cursorSVG.blind) {
          AchievementSystem.unlock("blindFaith");
        }

        // Greed Achievement Track
        AchievementSystem.runStats.consecutiveRitualsNoSafe++;
        AchievementSystem.updateProgress("greed", AchievementSystem.runStats.consecutiveRitualsNoSafe);

        // Ritualist achievement update
        AchievementSystem.updateProgress("ritualist", completedRituals);

        // The Last Ritual check
        if (completedRituals === Rules.maxRituals - 1) {
          AchievementSystem.unlock("theLastRitual");
        }

        // Exorcist & Last Second Checks
        if (completedRituals === Rules.maxRituals) {
          AchievementSystem.unlock("exorcist");
          if (Player.sanity < 10) {
            AchievementSystem.unlock("lastSecond");
          }
        }

        Player.score += 1000 * Player.combo;
        currentRitualProgress = 0;

        if (completedRituals < Rules.maxRituals) {
          spawnObjective();
        }
        if (completedRituals % 2 === 0) {
          spawnSafeZone();
        }
      }
    }
  });

  if (interacting) {
    UI.interactionPrompt.classList.remove("hidden");
    Player.sanity = Math.max(0, Player.sanity - 0.1 * (dt / 16.67));
  } else {
    if (currentRitualProgress > 0) {
      AchievementSystem.runStats.currentRitualInterrupted = true;
      AchievementSystem.runStats.interruptedRituals++;
    }
    UI.interactionPrompt.classList.add("hidden");
    currentRitualProgress = Math.max(0, currentRitualProgress - dt * 0.1);
  }
}

/* ---------------------------------------------------------
   RESIZE
--------------------------------------------------------- */

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

/* ---------------------------------------------------------
   RENDER OBJECTIVES
--------------------------------------------------------- */

function renderObjectives(time) {
  objectives.forEach((obj) => {
    if (!obj.active) return;
    if (ritualImage.complete) {
      ctx.drawImage(ritualImage, obj.x - obj.radius, obj.y - obj.radius, obj.radius * 2, obj.radius * 2);
    }
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#ff0033";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (Settings.graphics.glitchEffects && !Settings.graphics.simplifiedEffects) {
      const pulseAlpha = 0.1 + Math.sin(time * 0.005) * 0.05;
      ctx.fillStyle = `rgba(255, 0, 51, ${pulseAlpha})`;
      ctx.fill();
    }
  });

  safeZones.forEach((sz) => {
    if (sz.stability <= 0) return;
    ctx.beginPath();
    ctx.arc(sz.x, sz.y, sz.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${sz.stability / 100})`;
    ctx.setLineDash([5, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

/* ---------------------------------------------------------
   BLOOD PARTICLES
--------------------------------------------------------- */

const bloodParticles = [];

function addBloodTrail(x, y) {
  if (Settings.graphics.simplifiedEffects) return;

  let count = 8;
  if (Settings.graphics.particles === "LOW") count = 2;
  else if (Settings.graphics.particles === "MEDIUM") count = 5;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = Math.random() * 2.5 + 0.5;
    bloodParticles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      size: Math.random() * 3.5 + 1.5,
      alpha: 0.95,
      decay: Math.random() * 0.006 + 0.003
    });
  }
}

/* ---------------------------------------------------------
   LIMBS
--------------------------------------------------------- */

class Limb {
  constructor(spineIndex, side, upperLen, lowerLen, offsetAngle, stepDist) {
    this.spineIndex = spineIndex;
    this.side = side;
    this.upperLen = upperLen;
    this.lowerLen = lowerLen;
    this.offsetAngle = offsetAngle;
    this.stepDist = stepDist;
    this.footX = 0;
    this.footY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.isStepping = false;
    this.stepProgress = 1;
    this.stepStartX = 0;
    this.stepStartY = 0;
    this.kneeX = 0;
    this.kneeY = 0;
  }

  update(spine, currentSpeed, dt) {
    const hip = spine[this.spineIndex];
    const spineAngle = hip.angle;
    const hipX = hip.x + Math.cos(spineAngle + this.side * Math.PI / 2) * 14;
    const hipY = hip.y + Math.sin(spineAngle + this.side * Math.PI / 2) * 14;
    const idealAngle = spineAngle + this.side * this.offsetAngle;
    const reach = (this.upperLen + this.lowerLen) * 0.72;
    const idealX = hipX + Math.cos(idealAngle) * reach;
    const idealY = hipY + Math.sin(idealAngle) * reach;

    if (this.footX === 0) {
      this.footX = idealX;
      this.footY = idealY;
    }

    const dist = Math.hypot(this.footX - idealX, this.footY - idealY);

    if (dist > this.stepDist && !this.isStepping) {
      this.isStepping = true;
      this.stepProgress = 0;
      this.stepStartX = this.footX;
      this.stepStartY = this.footY;
      this.targetX = idealX + Math.cos(spineAngle) * 45;
      this.targetY = idealY + Math.sin(spineAngle) * 45;
    }

    if (this.isStepping) {
      const frameScale = dt / 16.67;
      this.stepProgress += (0.18 + Math.min(0.3, currentSpeed * 0.015)) * frameScale;

      if (this.stepProgress >= 1) {
        this.stepProgress = 1;
        this.isStepping = false;
        addBloodTrail(this.footX, this.footY);
      }

      this.footX = this.stepStartX + (this.targetX - this.stepStartX) * this.stepProgress;
      this.footY = this.stepStartY + (this.targetY - this.stepStartY) * this.stepProgress;
    }

    return { hipX, hipY, footX: this.footX, footY: this.footY, kneeX: this.kneeX, kneeY: this.kneeY };
  }

  draw(ctx, hipX, hipY) {
    const fx = this.footX;
    const fy = this.footY;
    const dx = fx - hipX;
    const dy = fy - hipY;
    const dist = Math.min(Math.hypot(dx, dy), this.upperLen + this.lowerLen - 2);
    const angleToFoot = Math.atan2(dy, dx);
    const l1 = this.upperLen;
    const l2 = this.lowerLen;
    const cosAngle = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * Math.max(dist, 0.001));
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const kneeOffset = Math.acos(clampedCos);
    const kneeAngle = angleToFoot + this.side * kneeOffset;

    this.kneeX = hipX + Math.cos(kneeAngle) * l1;
    this.kneeY = hipY + Math.sin(kneeAngle) * l1;

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(this.kneeX, this.kneeY);
    ctx.lineTo(fx, fy);
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(this.kneeX, this.kneeY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const toeBaseAngle = Math.atan2(fy - this.kneeY, fx - this.kneeX);
    const toeLen = 22;
    const angles = [-0.7, -0.25, 0.25, 0.7];

    for (const a of angles) {
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(toeBaseAngle + a) * toeLen, fy + Math.sin(toeBaseAngle + a) * toeLen);
      ctx.stroke();
    }
  }
}

const limbs = [
  new Limb(4, -1, 60, 70, 0.85, 60),
  new Limb(4, 1, 60, 70, 0.85, 60),
  new Limb(11, -1, 65, 75, 1.0, 65),
  new Limb(11, 1, 65, 75, 1.0, 65),
  new Limb(18, -1, 75, 85, 1.15, 75),
  new Limb(18, 1, 75, 85, 1.15, 75),
  new Limb(25, -1, 85, 95, 1.3, 85),
  new Limb(25, 1, 85, 95, 1.3, 85)
];

/* ---------------------------------------------------------
   LICH
--------------------------------------------------------- */

function drawCreepySkull(ctx, headSeg, scale = 1, openMandibles = false, time = 0) {
  const { x, y, angle } = headSeg;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#f1f5f9";
  ctx.fillStyle = "#070709";
  ctx.lineWidth = 1.8 / scale;

  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(10, -9);
  ctx.lineTo(-2, -14);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-22, -20);
  ctx.lineTo(-15, -4);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-15, 4);
  ctx.lineTo(-22, 20);
  ctx.lineTo(-12, 11);
  ctx.lineTo(-2, 14);
  ctx.lineTo(10, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!Settings.graphics.simplifiedEffects) {
    const mandibleOffset = openMandibles ? 16 : 0;
    ctx.beginPath();
    ctx.moveTo(18, -4 - mandibleOffset);
    ctx.lineTo(26 + mandibleOffset * 1.5, -7 - mandibleOffset * 1.5);
    ctx.moveTo(14, -6 - mandibleOffset);
    ctx.lineTo(20 + mandibleOffset * 1.5, -9 - mandibleOffset * 1.5);
    ctx.moveTo(18, 4 + mandibleOffset);
    ctx.lineTo(26 + mandibleOffset * 1.5, 7 + mandibleOffset * 1.5);
    ctx.moveTo(14, 6 + mandibleOffset);
    ctx.lineTo(20 + mandibleOffset * 1.5, 9 + mandibleOffset * 1.5);
    ctx.stroke();
  }

  if (Settings.graphics.glitchEffects && !Settings.graphics.simplifiedEffects) {
    const eyePulse = Math.sin(time * 0.015) * 2.5 + 6;
    const eyeGradLeft = ctx.createRadialGradient(4, -5, 0, 4, -5, eyePulse);
    eyeGradLeft.addColorStop(0, "#ffffff");
    eyeGradLeft.addColorStop(0.35, "#ff0022");
    eyeGradLeft.addColorStop(1, "rgba(255,0,34,0)");
    ctx.fillStyle = eyeGradLeft;
    ctx.beginPath();
    ctx.arc(4, -5, eyePulse, 0, Math.PI * 2);
    ctx.fill();

    const eyeGradRight = ctx.createRadialGradient(4, 5, 0, 4, 5, eyePulse);
    eyeGradRight.addColorStop(0, "#ffffff");
    eyeGradRight.addColorStop(0.35, "#ff0022");
    eyeGradRight.addColorStop(1, "rgba(255,0,34,0)");
    ctx.fillStyle = eyeGradRight;
    ctx.beginPath();
    ctx.arc(4, 5, eyePulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

let lastHeadX = -1000;
let lastHeadY = -1000;
let creatureSpeed = 0;

function renderLich(dt, time) {
  const currentDelay = AI.isLunging ? activePreset.baseDelay * 3 : activePreset.baseDelay;
  const lead = Player.stamina < 20 ? activePreset.leadFactor * 1.5 : activePreset.leadFactor;
  const targetX = mouse.x + mouse.vx * lead;
  const targetY = mouse.y + mouse.vy * lead;
  const dxHead = spine[0].x - lastHeadX;
  const dyHead = spine[0].y - lastHeadY;

  creatureSpeed = Math.hypot(dxHead, dyHead);
  lastHeadX = spine[0].x;
  lastHeadY = spine[0].y;

  let jitterX = 0;
  let jitterY = 0;

  if (Settings.graphics.glitchEffects && !Settings.graphics.simplifiedEffects) {
    jitterX = (Math.random() - 0.5) * (creatureSpeed * 0.4 + 1.5);
    jitterY = (Math.random() - 0.5) * (creatureSpeed * 0.4 + 1.5);
  }

  spine[0].x += (targetX - spine[0].x) * currentDelay + jitterX;
  spine[0].y += (targetY - spine[0].y) * currentDelay + jitterY;

  for (let i = 1; i < numSegments; i++) {
    const dx = spine[i - 1].x - spine[i].x;
    const dy = spine[i - 1].y - spine[i].y;
    const angle = Math.atan2(dy, dx);
    spine[i - 1].angle = angle;
    spine[i].x = spine[i - 1].x - Math.cos(angle) * segmentLength;
    spine[i].y = spine[i - 1].y - Math.sin(angle) * segmentLength;
  }
  spine[numSegments - 1].angle = spine[numSegments - 2].angle;

  /* Shadow Aura */
  if (Settings.graphics.distortion && !Settings.graphics.reducedDistortion && !Settings.graphics.simplifiedEffects) {
    for (let i = 2; i < numSegments - 10; i += 3) {
      const seg = spine[i];
      const auraGrad = ctx.createRadialGradient(seg.x, seg.y, 2, seg.x, seg.y, 42);
      auraGrad.addColorStop(0, "rgba(0,0,0,0.45)");
      auraGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, 42, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Spine */
  ctx.beginPath();
  ctx.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i < numSegments; i++) {
    ctx.lineTo(spine[i].x, spine[i].y);
  }
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Rib Cage */
  for (let i = 2; i < numSegments - 1; i++) {
    const seg = spine[i];
    const angle = seg.angle;
    const ribProgress = Math.sin((i / (numSegments - 1)) * Math.PI);
    const ribWidth = ribProgress * 34 + 8;
    const curveOffset = 18;

    const pLeftX = seg.x + Math.cos(angle - Math.PI / 2) * ribWidth;
    const pLeftY = seg.y + Math.sin(angle - Math.PI / 2) * ribWidth;
    const pRightX = seg.x + Math.cos(angle + Math.PI / 2) * ribWidth;
    const pRightY = seg.y + Math.sin(angle + Math.PI / 2) * ribWidth;
    const backX = seg.x - Math.cos(angle) * curveOffset;
    const backY = seg.y - Math.sin(angle) * curveOffset;

    ctx.beginPath();
    ctx.moveTo(pLeftX, pLeftY);
    ctx.quadraticCurveTo(backX, backY, pRightX, pRightY);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  /* Limbs */
  limbs.forEach((limb) => {
    const { hipX, hipY } = limb.update(spine, creatureSpeed, dt);
    limb.draw(ctx, hipX, hipY);
  });

  /* Skull */
  const openMouth = AI.phase === "POSSESSION" || AI.isLunging;
  drawCreepySkull(ctx, spine[0], 1, openMouth, time);
}

/* ---------------------------------------------------------
   COLLISION / SCORE / EVASION ACHIEVEMENTS
--------------------------------------------------------- */

function checkHitbox() {
  if (GameState.current !== "PLAYING") return;
  const hitRadius = activePreset.hitRadius;
  const dist = Math.hypot(mouse.x - spine[0].x, mouse.y - spine[0].y);

  // Near miss detection (Close call)
  if (dist < hitRadius * 3.5 && dist > hitRadius) {
    Player.score += 5;

    if (!mouse.hasRecordedNearMiss) {
      mouse.hasRecordedNearMiss = true;
      AchievementSystem.runStats.nearMisses++;
      AchievementSystem.data.stats.totalNearMisses++;

      AchievementSystem.updateProgress("closeCall", AchievementSystem.runStats.nearMisses);

      // Predator achievement (5 frenzy near misses)
      if (AI.phase === "FRENZY") {
        AchievementSystem.runStats.frenzyNearMisses++;
        AchievementSystem.updateProgress("predator", AchievementSystem.runStats.frenzyNearMisses);
      }

      // Death's Door (Near miss at < 10% sanity)
      if (Player.sanity < 10) {
        AchievementSystem.unlock("deathsDoor");
      }

      // Slow and steady (Survive attack near-miss while moving slowly)
      const velocity = Math.hypot(mouse.vx, mouse.vy);
      if (velocity < 2) {
        AchievementSystem.unlock("slowAndSteady");
      }

      // No Place to Hide (Near miss within 2 seconds of leaving safe zone)
      if (gameClock - AchievementSystem.runStats.leftSafeZoneTime < 2000) {
        AchievementSystem.unlock("noPlaceToHide");
      }

      setTimeout(() => { mouse.hasRecordedNearMiss = false; }, 800);
    }
  }

  if (dist < hitRadius) {
    AchievementSystem.runStats.damageTaken++;
    triggerJumpscare();
    return;
  }

  for (let i = 1; i < 20; i += 2) {
    if (Math.hypot(mouse.x - spine[i].x, mouse.y - spine[i].y) < hitRadius) {
      AchievementSystem.runStats.damageTaken++;
      triggerJumpscare();
      return;
    }
  }

  for (const limb of limbs) {
    if (
      Math.hypot(mouse.x - limb.footX, mouse.y - limb.footY) < hitRadius ||
      (limb.kneeX && Math.hypot(mouse.x - limb.kneeX, mouse.y - limb.kneeY) < hitRadius)
    ) {
      AchievementSystem.runStats.damageTaken++;
      triggerJumpscare();
      return;
    }
  }
}

/* ---------------------------------------------------------
   MAIN LOOP
--------------------------------------------------------- */

function animate(time) {
  requestAnimationFrame(animate);

  let realDt = time - lastTime;
  if (realDt > 50) realDt = 16;
  lastTime = time;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gameplayActive = GameState.current === "PLAYING" && !GameState.paused;

  // Render objectives & safe zones first so they appear beneath the creature
  if (GameState.current === "PLAYING" || GameState.current === "PAUSED") {
    renderObjectives(gameClock);
  }

  if (gameplayActive) {
    const dt = Math.min(realDt, 50);
    gameClock += dt;
    survivalMs += dt;
    Player.score += (dt * 0.01) * Player.combo;
    UI.timer.textContent = formatTime(survivalMs);

    updateAI(dt);
    updateResources(dt);
    handleRituals(dt);
    renderLich(dt, gameClock);
    checkHitbox();
  }

  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    const p = bloodParticles[i];
    if (gameplayActive) {
      const dt = Math.min(realDt, 50);
      const particleScale = dt / 16.67;
      p.x += p.vx * particleScale;
      p.y += p.vy * particleScale;
      p.vx *= Math.pow(0.92, particleScale);
      p.vy *= Math.pow(0.92, particleScale);
      p.alpha -= p.decay * particleScale;

      if (p.alpha <= 0) {
        bloodParticles.splice(i, 1);
        continue;
      }
    }
    ctx.fillStyle = `rgba(175,8,18,${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------------------------------------------------------
   JUMPSCARE / GAME OVER
--------------------------------------------------------- */

function prepareJumpscareVideo() {
  if (!UI.video.src || !UI.video.src.includes("LICH%20jump%20scare.mp4") && !UI.video.src.includes("LICH jump scare.mp4")) {
    UI.video.src = "LICH jump scare.mp4";
    UI.video.load();
  }
}

function triggerJumpscare() {
  if (GameState.current !== "PLAYING") return;
  GameState.current = "GAMEOVER";
  GameState.paused = false;

  AchievementSystem.deathTime = Date.now();
  AchievementSystem.data.stats.totalDeaths++;
  AchievementSystem.saveToStorage();

  UI.bgAudio.pause();
  UI.bgAudio.currentTime = 0;
  UI.hud.classList.add("hidden");
  UI.pauseButton.classList.add("hidden");
  UI.interactionPrompt.classList.add("hidden");

  if (Settings.graphics.flashEffects && !Settings.graphics.reducedFlashes && !Settings.graphics.simplifiedEffects) {
    prepareJumpscareVideo();
    UI.video.classList.remove("hidden");
    UI.video.style.display = "block";
    UI.video.currentTime = 0;
    UI.video.play().catch(() => showDeathScreen());
  } else {
    UI.video.classList.add("hidden");
    UI.video.style.display = "none";
    showDeathScreen();
  }

  UI.screamAudio.currentTime = 0;
  UI.screamAudio.play().catch(() => {});
}

UI.video.addEventListener("error", () => {
  UI.video.pause();
  UI.video.classList.add("hidden");
  UI.video.style.display = "none";
  showDeathScreen();
});

function showDeathScreen() {
  UI.video.pause();
  UI.video.currentTime = 0;
  UI.video.classList.add("hidden");
  UI.video.style.display = "none";

  UI.finalTime.textContent = formatTime(survivalMs);
  UI.finalScore.textContent = Math.floor(Player.score);
  UI.finalRituals.textContent = `${completedRituals} / ${Rules.maxRituals}`;
  UI.deathScreen.classList.remove("hidden");

  const bestKey = `best_${Rules.difficulty}`;
  const best = parseInt(localStorage.getItem(bestKey) || "0", 10);

  if (Player.score > best) {
    localStorage.setItem(bestKey, String(Math.floor(Player.score)));
    UI.newRecordTag.style.display = "block";
  } else {
    UI.newRecordTag.style.display = "none";
  }
}

UI.video.addEventListener("ended", showDeathScreen);

/* ---------------------------------------------------------
   PAUSE SYSTEM
--------------------------------------------------------- */

function pauseGame() {
  if (GameState.current !== "PLAYING" || GameState.paused) return;
  GameState.paused = true;
  GameState.current = "PAUSED";
  UI.bgAudio.pause();
  UI.screamAudio.pause();
  UI.pauseMenu.classList.remove("hidden");
  UI.pauseButton.classList.add("hidden");
  showPauseMain();
  lastTime = performance.now();
}

function resumeGame() {
  if (GameState.current !== "PAUSED") return;
  GameState.paused = false;
  GameState.current = "PLAYING";
  UI.pauseMenu.classList.add("hidden");
  UI.pauseButton.classList.remove("hidden");
  applyAudioSettings();
  UI.bgAudio.play().catch(() => {});
  lastTime = performance.now();
}

function togglePause() {
  if (GameState.current === "PLAYING") pauseGame();
  else if (GameState.current === "PAUSED") resumeGame();
}

/* ---------------------------------------------------------
   GAME START
--------------------------------------------------------- */

function startGame() {
  // Check 'AGAIN' achievement (Restart immediately after dying)
  if (AchievementSystem.deathTime && Date.now() - AchievementSystem.deathTime < 4000) {
    AchievementSystem.unlock("again");
  }

  // Evaluate victory/completion of previous run achievements if rituals completed
  if (completedRituals === Rules.maxRituals) {
    // Untouchable
    if (AchievementSystem.runStats.damageTaken === 0) {
      AchievementSystem.unlock("untouchable");
    }

    // No Cursor
    if (currentCursorStyle === cursorSVG.blind) {
      AchievementSystem.unlock("noCursor");
    }

    // Nightmare
    if (Rules.difficulty === "IMPOSSIBLE") {
      AchievementSystem.unlock("nightmare");
    }

    // Perfect Run
    if (
      AchievementSystem.runStats.damageTaken === 0 &&
      AchievementSystem.runStats.lowestSanity >= 25 &&
      AchievementSystem.runStats.interruptedRituals === 0
    ) {
      AchievementSystem.unlock("perfectRun");
    }

    // Pacifist
    if (AchievementSystem.runStats.nearMisses === 0) {
      AchievementSystem.unlock("pacifist");
    }

    // Speedrunner
    if (survivalMs < 120000) {
      AchievementSystem.unlock("speedrunner");
    }

    // Stamina Master
    if (!AchievementSystem.runStats.criticalStaminaReached) {
      AchievementSystem.unlock("staminaMaster");
    }

    // No Fear
    if (AchievementSystem.runStats.safeZonesEntered.size === 0) {
      AchievementSystem.unlock("noFear");
    }
  }

  // Increment Persistent Lifetime Stats
  AchievementSystem.data.stats.totalRuns++;
  AchievementSystem.data.stats.totalSurvivalTime += survivalMs;
  AchievementSystem.data.stats.longestSurvival = Math.max(AchievementSystem.data.stats.longestSurvival, survivalMs);
  AchievementSystem.data.stats.totalRituals += completedRituals;
  AchievementSystem.data.stats.highestScore = Math.max(AchievementSystem.data.stats.highestScore, Player.score);
  AchievementSystem.saveToStorage();

  // Run Count Achievements
  AchievementSystem.updateProgress("obsession", AchievementSystem.data.stats.totalRuns);
  AchievementSystem.updateProgress("addictedToDeath", AchievementSystem.data.stats.totalRuns);

  AchievementSystem.resetRunStats();

  GameState.current = "PLAYING";
  GameState.paused = false;
  Player.sanity = 100;
  Player.stamina = 100;
  Player.score = 0;
  Player.combo = 1;
  completedRituals = 0;
  currentRitualProgress = 0;
  survivalMs = 0;
  gameClock = 0;
  objectives = [];
  safeZones = [];
  AI.phase = "HUNTING";
  AI.isLunging = false;
  AI.isFeinting = false;
  AI.lungeRemaining = 0;
  AI.nextLungeTime = activePreset.lungeMin;

  const offX = -500;
  const offY = -500;

  for (let i = 0; i < numSegments; i++) {
    spine[i].x = offX;
    spine[i].y = offY;
    spine[i].angle = 0;
  }

  lastHeadX = offX;
  lastHeadY = offY;
  creatureSpeed = 0;
  bloodParticles.length = 0;
  spawnObjective();

  UI.startMenu.classList.add("hidden");
  UI.deathScreen.classList.add("hidden");
  UI.pauseMenu.classList.add("hidden");
  UI.achievementsMenu.classList.add("hidden");

  UI.video.pause();
  UI.video.removeAttribute("src");
  UI.video.load();
  UI.video.currentTime = 0;
  UI.video.classList.add("hidden");
  UI.video.style.display = "none";
  UI.hud.classList.remove("hidden");
  UI.pauseButton.classList.remove("hidden");
  UI.menuAudio.pause();
  UI.menuAudio.currentTime = 0;

  applyAudioSettings();
  UI.bgAudio.currentTime = 0;
  UI.bgAudio.play().catch(() => {});

  lastTime = performance.now();
  gameStartTime = performance.now();
  showPauseMain();
}

/* ---------------------------------------------------------
   BUTTONS
--------------------------------------------------------- */

document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("restartBtn").addEventListener("click", startGame);
UI.pauseButton.addEventListener("click", togglePause);
UI.resumeBtn.addEventListener("click", resumeGame);
UI.audioBtn.addEventListener("click", () => showPausePanel(UI.audioPanel));
UI.graphicsBtn.addEventListener("click", () => showPausePanel(UI.graphicsPanel));
UI.controlsBtn.addEventListener("click", () => showPausePanel(UI.controlsPanel));
UI.audioBackBtn.addEventListener("click", showPauseMain);
UI.graphicsBackBtn.addEventListener("click", showPauseMain);
UI.controlsBackBtn.addEventListener("click", showPauseMain);

UI.quitBtn.addEventListener("click", () => {
  GameState.current = "MENU";
  GameState.paused = false;
  UI.pauseMenu.classList.add("hidden");
  UI.pauseButton.classList.add("hidden");
  UI.hud.classList.add("hidden");
  UI.interactionPrompt.classList.add("hidden");
  UI.video.pause();
  UI.video.currentTime = 0;
  UI.video.classList.add("hidden");
  UI.video.style.display = "none";
  UI.bgAudio.pause();
  UI.bgAudio.currentTime = 0;
  UI.screamAudio.pause();
  UI.screamAudio.currentTime = 0;
  UI.startMenu.classList.remove("hidden");
  applyAudioSettings();
  UI.menuAudio.play().catch(() => {});
  lastTime = performance.now();
});

document.getElementById("menuBtn").addEventListener("click", () => location.reload());

/* ---------------------------------------------------------
   ESC PAUSE
--------------------------------------------------------- */

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    if (GameState.current === "PLAYING" || GameState.current === "PAUSED") togglePause();
    return;
  }
  if (e.key === "p" || e.key === "P") {
    if (GameState.current === "PLAYING" || GameState.current === "PAUSED") togglePause();
  }
});

/* ---------------------------------------------------------
   DIFFICULTY
--------------------------------------------------------- */

document.querySelectorAll(".btn-diff").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".btn-diff").forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");
    const diff = e.target.dataset.diff;
    Rules.difficulty = diff;
    activePreset = DIFFICULTY_PRESETS[diff];
    const desc = document.getElementById("diffDescription");

    if (diff === "EASY") desc.textContent = "EASY: Slow movement. Generous hitboxes.";
    if (diff === "NORMAL") desc.textContent = "NORMAL: Standard survival experience.";
    if (diff === "HARD") desc.textContent = "HARD: Aggressive speed and predictions.";
    if (diff === "IMPOSSIBLE") desc.textContent = "IMPOSSIBLE: Relentless speed. Precise intercept prediction and massive hitboxes.";
  });
});

/* ---------------------------------------------------------
   MENU SONGS
--------------------------------------------------------- */

document.querySelectorAll(".btn-song").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".btn-song").forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");
    UI.menuAudio.src = e.target.dataset.song;
    applyAudioSettings();
    UI.menuAudio.play().catch(() => {});
  });
});

document.querySelectorAll(".btn-cursor").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".btn-cursor").forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");
    const type = e.target.dataset.cursor;
    currentCursorStyle = cursorSVG[type] || cursorSVG.bone;
    applyGraphicsSettings();
  });
});

/* ---------------------------------------------------------
   MENU AUDIO INITIALIZATION & SYSTEM INIT
--------------------------------------------------------- */

document.addEventListener("click", function initAudio() {
  if (GameState.current === "MENU") {
    applyAudioSettings();
    UI.menuAudio.play().catch(() => {});
  }
  document.removeEventListener("click", initAudio);
}, { once: true });

/* ---------------------------------------------------------
   TIME FORMAT UTILITIES
--------------------------------------------------------- */

function formatTime(ms) {
  const m = Math.floor(ms / 60000).toString().padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  const msStr = Math.floor((ms % 1000) / 10).toString().padStart(2, "0");
  return `${m}:${s}.${msStr}`;
}

function formatTimeHours(ms) {
  const h = Math.floor(ms / 3600000).toString().padStart(2, "0");
  const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, "0");
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/* ---------------------------------------------------------
   START
--------------------------------------------------------- */

AchievementSystem.init();
applyAudioSettings();
applyGraphicsSettings();
requestAnimationFrame(animate);
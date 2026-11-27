(() => {
  const svg = document.querySelector("main > svg");
  const stick = document.getElementById("move-stick");
  const knob = document.getElementById("stick-knob");
  const actionControls = document.getElementById("character-actions");
  const attackButton = document.getElementById("attack-button");
  const attackIcon = document.getElementById("attack-icon");
  const jumpButton = document.getElementById("jump-button");
  const movesButton = document.getElementById("moves-toggle");
  const movePicker = document.getElementById("move-picker");
  const moveOptions = [...movePicker.querySelectorAll("[data-move]")];
  const actionButton = document.getElementById("interaction-action");
  const actionIcon = document.getElementById("interaction-icon");
  const workoutPanel = document.getElementById("workout-panel");
  const workoutLabel = document.getElementById("workout-label");
  const workoutProgress = document.getElementById("workout-progress");
  const zoomButton = document.getElementById("zoom-cycle");
  const settingsButton = document.getElementById("settings-toggle");
  const graphicsMenu = document.getElementById("graphics-menu");
  const graphicsStatus = document.getElementById("graphics-status");
  const qualityButtons = [...document.querySelectorAll("[data-quality]")];
  const errorBox = document.getElementById("load-error");
  const input = { x: 0, y: 0, pointerId: null, destination: null, keys: new Set() };
  const zoomFactors = [1, 0.75, 0.5];
  const qualityProfiles = {
    low: { maxResolution: 1, scale: 0.75, label: "Low" },
    medium: { maxResolution: 1.5, scale: 1, label: "Medium" },
    high: { maxResolution: 2, scale: 1, label: "High" }
  };
  const QUALITY_STORAGE_KEY = "roomscape-graphics-quality";
  const FLOOR_PATTERN_SIZE = 128;
  const FLOOR_REPEAT_SIZE = 48;
  const FULL_KICK_TAPS = 4;
  const FULL_KICK_WINDOW_MS = 750;
  const JUMP_DURATION = 0.52;
  const JUMP_HEIGHT = 32;
  // Procedural action poses update a canvas-backed GPU texture. Pace those uploads
  // for mobile GPUs; character movement and camera follow still update every tick.
  const ACTION_RENDER_FPS = { low: 12, medium: 20, high: 26 };
  const MAX_FRAME_TIME = 0.1;
  const MAX_MOVEMENT_STEP = 0.04;
  const movementKeys = [
    ["ArrowLeft", -1, 0], ["a", -1, 0], ["ArrowRight", 1, 0], ["d", 1, 0],
    ["ArrowUp", 0, -1], ["w", 0, -1], ["ArrowDown", 0, 1], ["s", 0, 1]
  ];
  const materialColors = {
    grass: ["#63aa5b", "#39894c", "#8cc76b"], path: ["#d9b987", "#bb9a69", "#e6cfaa"],
    paving: ["#bfc9d5", "#7f91a6", "#e7edf4"], parking: ["#50505c", "#f2e5d5", "#676876"],
    brick: ["#a7444b", "#692f3b", "#bd6460"], dirt: ["#98715e", "#bd9277", "#87614f"],
    tile: ["#dce2e8", "#8191a3", "#f0f2f4"], wood: ["#d7a15f", "#a96e3e", "#e9bd7c"],
    blue: ["#78a9ba", "#557d90", "#9bc7d2"], hall: ["#78c3fb", "#3978a2", "#d8efff"],
    gym: ["#546570", "#293942", "#9fb5ba"]
  };
  let game, mapData, settings, catalog, objects = [], walls = [], player, playerSprite, playerShadow, camera, activeItem = null;
  let zoomStep = 0, lastPromptAt = 0;
  let kickTapTimes = [], fullKickQueued = false;
  let practiceDummy, carriedDummy;
  let dummyFlight;
  let characterArt, characterSize, actionRenderer, actionTexture, characterAction;
  let running = false, runTime = 0, runBlend = 0;
  let jumpElapsed = null, jumpHeight = 0, lastDrawnFrame = -1;
  let wallJump;
  let skipNextDelta = true;
  let equippedMove = "punch", contextAction = null, targetMarker;
  let workoutStations = [], activeWorkout = null, workoutFinishedUntil = 0;
  const throwAim = { x: 1, y: 0 };
  const smokePuffs = [];
  const practiceMoves = {
    slap: { reach: 44, speed: 135 },
    punch: { reach: 42, speed: 165 },
    kick: { reach: 54, speed: 220 },
    "full-kick": { reach: 60, speed: 340 }
  };
  const moveShortcuts = { punch: "J", slap: "F", kick: "K", puff: "G" };
  let qualityPreference = readQualityPreference(), activeQuality = "medium";

  function readQualityPreference() {
    try {
      const saved = localStorage.getItem(QUALITY_STORAGE_KEY);
      return ["auto", "low", "medium", "high"].includes(saved) ? saved : "auto";
    } catch { return "auto"; }
  }
  function detectQuality() {
    const memory = Number(navigator.deviceMemory) || 0;
    const cores = Number(navigator.hardwareConcurrency) || 0;
    if ((memory && memory <= 3) || (cores && cores <= 4)) return "low";
    if ((memory && memory <= 6) || cores === 5) return "medium";
    if (memory || cores) return "high";
    return matchMedia("(pointer: coarse)").matches ? "medium" : "high";
  }
  function resolutionScaleFor(profile) {
    const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
    const quality = qualityProfiles[profile] || qualityProfiles.medium;
    return Math.max(0.65, Math.min(dpr, quality.maxResolution) * quality.scale);
  }
  function applyQualityResolution() {
    if (!game?.scale?.gameSize) return;
    const renderScale = resolutionScaleFor(activeQuality);
    const host = game.canvas?.parentElement;
    const bounds = host?.getBoundingClientRect();
    const width = Math.max(1, Math.round((bounds?.width || window.innerWidth) * renderScale));
    const height = Math.max(1, Math.round((bounds?.height || window.innerHeight) * renderScale));
    if (game.scale.gameSize.width !== width || game.scale.gameSize.height !== height) {
      game.scale.resize(width, height);
    }
  }
  function chooseQuality(preference, save = true) {
    qualityPreference = preference;
    activeQuality = preference === "auto" ? detectQuality() : preference;
    if (save) {
      try { localStorage.setItem(QUALITY_STORAGE_KEY, preference); } catch { /* Use this selection for the current page. */ }
    }
    qualityButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.quality === preference)));
    const profile = qualityProfiles[activeQuality];
    const renderScale = resolutionScaleFor(activeQuality);
    graphicsStatus.textContent = preference === "auto"
      ? `Auto · ${profile.label} · ${renderScale.toFixed(2)}× render resolution`
      : `${profile.label} · ${renderScale.toFixed(2)}× render resolution`;
    applyQualityResolution();
  }

  chooseQuality(qualityPreference, false);
  window.addEventListener("resize", applyQualityResolution);
  settingsButton.addEventListener("click", () => {
    const opening = graphicsMenu.hidden;
    graphicsMenu.hidden = !opening;
    settingsButton.setAttribute("aria-expanded", String(opening));
    settingsButton.setAttribute("aria-label", opening ? "Close settings" : "Open settings");
  });
  qualityButtons.forEach((button) => button.addEventListener("click", () => {
    chooseQuality(button.dataset.quality);
  }));
  document.addEventListener("pointerdown", (event) => {
    if (graphicsMenu.hidden || graphicsMenu.contains(event.target) || settingsButton.contains(event.target)) return;
    graphicsMenu.hidden = true;
    settingsButton.setAttribute("aria-expanded", "false");
    settingsButton.setAttribute("aria-label", "Open settings");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || graphicsMenu.hidden) return;
    graphicsMenu.hidden = true;
    settingsButton.setAttribute("aria-expanded", "false");
    settingsButton.setAttribute("aria-label", "Open settings");
    settingsButton.focus();
  });

  function fail(message) { errorBox.textContent = message; errorBox.style.display = "block"; }
  async function json(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    return response.json();
  }
  const assetById = (id) => catalog.assets.find((asset) => asset.id === id);
  const colliderOf = (item) => {
    const asset = assetById(item.assetId);
    if (item.collidable === false || (item.collidable == null && asset?.collidable === false)) return null;
    return item.collider || asset?.collider || null;
  };
  function transformPoint(item, point) {
    const centerX = item.x + item.width / 2, centerY = item.y + item.height / 2;
    const x = item.x + point[0] * item.width - centerX, y = item.y + point[1] * item.height - centerY;
    const angle = (Number(item.rotation) || 0) * Math.PI / 180;
    return { x: centerX + x * Math.cos(angle) - y * Math.sin(angle), y: centerY + x * Math.sin(angle) + y * Math.cos(angle) };
  }
  function pointInPolygon(cx, cy, radius, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a.y > cy) !== (b.y > cy) && cx < (b.x - a.x) * (cy - a.y) / (b.y - a.y) + a.x) inside = !inside;
      const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((cx - a.x) * dx + (cy - a.y) * dy) / len)) : 0;
      if ((cx - a.x - t * dx) ** 2 + (cy - a.y - t * dy) ** 2 < radius * radius) return true;
    }
    return inside;
  }

  function canOccupy(x, y, overWall = false) {
    const body = settings.player.collision, cy = y - body.footOffset;
    const inside = (px, py) => mapData.walkable.some((r) => px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height);
    if (!inside(x, cy)) return false;
    for (let s = 0; s < 12; s++) {
      const a = s * Math.PI / 6;
      if (!inside(x + Math.cos(a) * body.radius, cy + Math.sin(a) * body.radius)) return false;
    }
    if (!overWall) {
      for (const wall of walls) {
        const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1, len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, ((x - wall.x1) * dx + (cy - wall.y1) * dy) / len)) : 0;
        const reach = body.radius + RoomscapeWalls.outlineWidth(wall) / 2;
        if ((x - wall.x1 - t * dx) ** 2 + (cy - wall.y1 - t * dy) ** 2 <= reach * reach) return false;
      }
    }
    for (const item of objects) {
      const box = item._bounds;
      if (!box || x + body.radius < box.left || x - body.radius > box.right || cy + body.radius < box.top || cy - body.radius > box.bottom) continue;
      if (pointInPolygon(x, cy, body.radius, item._points)) return false;
    }
    return true;
  }

  function nearestSearchable() {
    if (activeItem) return activeItem;
    let nearest = null, best = Infinity;
    for (const item of objects) {
      const asset = assetById(item.assetId);
      if (!asset?.interaction?.checkedAssetId || !assetById(asset.interaction.checkedAssetId)) continue;
      const x = item.x + item.width / 2, y = item.y + item.height * (asset.depthAnchor ?? 0.9);
      const distance = Math.hypot(player.x - x, player.y - settings.player.collision.footOffset - y);
      const range = Math.max(84, Math.min(132, Math.max(item.width, item.height) * 0.62));
      if (distance <= range && distance < best) { best = distance; nearest = item; }
    }
    return nearest;
  }

  function nearestWorkout() {
    if (!actionRenderer || activeItem || carriedDummy || jumpElapsed !== null) return null;
    let nearest = null, best = 30;
    const obstacle = dummyFlight || practiceDummy;
    for (const item of workoutStations) {
      const { x, y } = item._workout.stand;
      const dx = x - player.x, dy = y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > best) continue;
      if (![.25, .5, .75, 1].every(t => hasBodyRoom(player.x + dx * t, player.y + dy * t, obstacle))) continue;
      best = distance;
      nearest = item;
    }
    return nearest;
  }

  function updateWorkoutPanel(station) {
    const complete = !activeWorkout && performance.now() < workoutFinishedUntil;
    const text = activeWorkout?.item._workout.exercise.name || (complete ? "Set complete" : station?._workout.exercise.name);
    workoutPanel.hidden = !text;
    workoutProgress.hidden = !activeWorkout;
    if (text && workoutLabel.textContent !== text) workoutLabel.textContent = text;
  }

  function updateAction() {
    const station = activeWorkout?.item || nearestWorkout();
    const dummy = !station && actionRenderer && !carriedDummy && !activeItem && canReachDummy() ? practiceDummy : null;
    const item = !station && !dummy && !carriedDummy ? nearestSearchable() : null;
    const asset = item && assetById(item.assetId);
    const mode = activeWorkout ? "stop" : station ? "workout" : carriedDummy ? "throw" : activeItem ? "done" : item ? "check" : "grab";
    const target = station || item || dummy || (carriedDummy ? practiceDummy : null);
    const label = {
      throw: "Throw", grab: "Grab", check: asset?.interaction?.actionLabel || "Check", done: "Done",
      workout: station?._workout.exercise.name, stop: "Stop exercise"
    }[mode];
    const targetName = item ? item.name || asset.name : !station && target ? "Dani" : "";
    const available = Boolean(target && !characterAction);
    if (contextAction?.mode !== mode || contextAction.target !== target || contextAction.available !== available) {
      contextAction = { mode, target, available };
      actionButton.disabled = !available;
      actionIcon.setAttribute("href", `#hud-${mode}`);
      const accessibleLabel = targetName ? `${label} ${targetName}` : label;
      actionButton.setAttribute("aria-label", accessibleLabel);
      actionButton.title = accessibleLabel;
      actionButton.setAttribute("aria-keyshortcuts", station || item ? "E" : "Q");
    }
    attackButton.disabled = Boolean(activeWorkout || activeItem || carriedDummy);
    updateWorkoutPanel(characterAction ? null : station);
  }
  function updateTargetMarker() {
    const target = contextAction?.available && contextAction.target;
    if (!target || activeWorkout || carriedDummy || characterAction || (target === practiceDummy && dummyFlight)) {
      targetMarker.setVisible(false);
      return;
    }
    if (target === practiceDummy) {
      targetMarker.setPosition(target.x, target.y - 3).setDisplaySize(27, 11).setVisible(true);
    } else if (contextAction.mode === "workout") {
      const { x, y } = target._workout.stand;
      targetMarker.setPosition(x, y - settings.player.collision.footOffset).setDisplaySize(28, 13).setVisible(true);
    } else {
      const asset = assetById(target.assetId);
      targetMarker.setPosition(target.x + target.width / 2, target.y + target.height * (asset.depthAnchor ?? 0.9))
        .setDisplaySize(Math.min(64, target.width), 14).setVisible(true);
    }
  }
  function toggleAction() {
    if (carriedDummy || characterAction) return;
    if (activeWorkout) return endWorkout();
    const station = nearestWorkout();
    if (station) return startWorkout(station);
    if (activeItem) {
      const asset = assetById(activeItem.assetId), image = activeItem._sprite;
      image.setTexture(`asset:${asset.id}`); activeItem = null; updateAction(); return;
    }
    const item = nearestSearchable(); if (!item) return;
    const asset = assetById(item.assetId), checked = assetById(asset.interaction.checkedAssetId);
    if (!checked) return;
    activeItem = item; item._sprite.setTexture(`asset:${checked.id}`);
    input.destination = null; input.x = input.y = 0; updateAction();
  }
  function requestContextAction() {
    if (actionButton.disabled || characterAction) return;
    const { mode, target } = contextAction;
    if (mode === "throw" && carriedDummy) requestGrab();
    else if (mode === "grab" && !carriedDummy && canReachDummy()) requestGrab();
    else if (mode === "stop" && activeWorkout) endWorkout();
    else if (mode === "workout" && nearestWorkout() === target) startWorkout(target);
    else if ((mode === "check" || mode === "done") && nearestSearchable() === target) toggleAction();
  }

  function startWorkout(item) {
    const { stand, pose, rotation, inUseTexture } = item._workout;
    activeWorkout = { item, elapsed: 0 };
    if (item._workout.exercise.hideEquipment) item._sprite.setVisible(false);
    if (inUseTexture) item._sprite.setTexture(inUseTexture).setDisplaySize(item.width, item.height);
    input.destination = null;
    running = false;
    runBlend = 0;
    player.setPosition(stand.x, stand.y);
    playerSprite.setPosition(pose.x - stand.x, pose.y - stand.y).setRotation(rotation);
    if (item._workout.key === "boxing") playerSprite.setFlipX(item.x + item.width / 2 < stand.x);
    else playerSprite.setFlipX(false);
    workoutProgress.value = 0;
    lastDrawnFrame = -1;
    updateAction();
  }

  function endWorkout(complete = false) {
    const { item } = activeWorkout;
    if (item._workout.exercise.hideEquipment) item._sprite.setVisible(true);
    if (item._workout.inUseTexture) item._sprite.setTexture(`asset:${item.assetId}`).setDisplaySize(item.width, item.height);
    if (item._workout.key === "boxing") item._sprite.setRotation((Number(item.rotation) || 0) * Math.PI / 180);
    activeWorkout = null;
    workoutFinishedUntil = complete ? performance.now() + 900 : 0;
    playerSprite.setPosition(0, 0).setRotation(0);
    lastDrawnFrame = -1;
    updateAction();
  }

  function updateWorkout(dt) {
    const workout = activeWorkout;
    workout.elapsed += dt;
    const { exercise } = workout.item._workout;
    if (workout.elapsed >= exercise.duration) endWorkout(true);
  }

  function playCharacterAction(key) {
    characterAction = { key, elapsed: 0, contacted: false };
    lastDrawnFrame = -1;
    updateAction();
  }

  function hasBodyRoom(x, y, other, overWall = false) {
    return canOccupy(x, y, overWall) && (!other || Math.hypot(x - other.x, y - other.y) >= 2 * settings.player.collision.radius);
  }

  function addPracticeDummy(scene, idle, liftedFrame, width, height) {
    const spawn = settings.player.spawn;
    for (const [dx, dy] of [[48, 0], [-48, 0], [0, -48], [0, 48]]) {
      const x = spawn.x + dx, y = spawn.y + dy;
      if (!hasBodyRoom(x, y, player)) continue;
      const sprite = scene.add.image(x, y, idle.key, idle.frame)
        .setOrigin(0.5, 1).setDisplaySize(width, height).setTint(0x9ed4ff)
        .setFlipX(dx > 0).setDepth(9999);
      const label = scene.add.text(x, y - height - 4, "Dani", {
        fontFamily: "system-ui", fontSize: "10px", fontStyle: "bold",
        color: "#ffffff", stroke: "#25334a", strokeThickness: 3
      }).setOrigin(0.5, 1).setDepth(10001);
      practiceDummy = { x, y, sprite, label, width, height, idleFrame: idle.frame, liftedFrame, reaction: null };
      break;
    }
  }

  function resolvePracticeHit(move) {
    const target = practiceDummy;
    if (!target || dummyFlight) return;
    const dx = target.x - player.x, dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    const facing = playerSprite.flipX ? -1 : 1;
    const ahead = dx * facing;
    if (distance === 0 || distance > move.reach || ahead < distance * 0.45) return;
    target.reaction = {
      elapsed: 0, duration: 0.31,
      vx: dx / distance * move.speed, vy: dy / distance * move.speed, direction: Math.sign(dx)
    };
  }

  function emitPuff() {
    const direction = playerSprite.flipX ? 1 : -1;
    const burst = { hit: false };
    const travel = settings.player.puff?.distance ?? 92;
    const height = characterSize.height * .31 + jumpHeight;
    for (let index = 0; index < 3; index++) {
      const puff = smokePuffs.find(part => !part.burst);
      if (!puff) break;
      Object.assign(puff, {
        burst, direction, age: -index * .065, groundY: player.y,
        startX: player.x + direction * 7, startY: player.y - height,
        travel: travel * (1 - index * .23), scale: 1 - index * .14
      });
    }
  }

  function updateSmoke(dt) {
    for (const puff of smokePuffs) {
      if (!puff.burst) continue;
      puff.age += dt;
      if (puff.age < 0) continue;
      const t = Math.min(1, puff.age / .95);
      const x = puff.startX + puff.direction * puff.travel * (1 - (1 - t) ** 1.6);
      if (t === 1 || !canOccupy(x, puff.groundY)) {
        puff.sprite.setVisible(false);
        puff.burst = null;
        continue;
      }
      const y = puff.startY - (5 * t + 2 * Math.sin(t * Math.PI)) * puff.scale;
      const width = (9 + 31 * t) * puff.scale, height = width * .73;
      const alpha = .81 * Math.min(1, (1 - t) / .26);
      puff.sprite.setPosition(x, y).setDisplaySize(width, height).setAlpha(alpha).setVisible(true);

      const target = practiceDummy;
      if (!target || carriedDummy || dummyFlight || puff.burst.hit) continue;
      const dx = target.x - x, dy = target.y - target.height * .34 - y;
      const bodyRadius = settings.player.collision.radius;
      if ((dx / (width * .46 + bodyRadius)) ** 2 + (dy / (height * .46 + bodyRadius)) ** 2 > 1) continue;
      puff.burst.hit = true;
      target.reaction = { elapsed: 0, duration: .31, vx: puff.direction * 120, vy: 0, direction: puff.direction };
    }
  }

  function updatePracticeDummy(dt) {
    if (carriedDummy) return;
    if (dummyFlight) {
      updateDummyFlight(dt);
      return;
    }
    const target = practiceDummy;
    const hit = target?.reaction;
    if (!hit) return;
    hit.elapsed = Math.min(hit.duration, hit.elapsed + dt);
    const progress = hit.elapsed / hit.duration;
    const swing = Math.sin(progress * Math.PI);
    const travel = (1 - progress) * dt;
    const nextX = target.x + hit.vx * travel;
    const nextY = target.y + hit.vy * travel;
    if (nextX !== target.x && hasBodyRoom(nextX, target.y, player)) target.x = nextX;
    if (nextY !== target.y && hasBodyRoom(target.x, nextY, player)) target.y = nextY;
    const hop = 3 * swing;
    const tilt = 14 * swing * hit.direction;
    target.sprite.setPosition(target.x, target.y - hop).setAngle(tilt)
      .setTint(progress < 0.3 ? 0xffa699 : 0x9ed4ff);
    target.label.setPosition(target.x, target.y - target.height - 4);
    if (progress === 1) {
      target.sprite.setAngle(0);
      target.reaction = null;
    }
  }

  function canReachDummy() {
    const target = practiceDummy;
    if (!target || dummyFlight) return false;
    const direction = playerSprite.flipX ? -1 : 1;
    const dx = target.x - player.x, dy = target.y - player.y;
    if (dx * direction < 12 || Math.hypot(dx, dy) > 37 || Math.abs(dy) > 20) return false;
    for (const step of [0.25, 0.5, 0.75]) {
      if (!canOccupy(player.x + dx * step, player.y + dy * step)) return false;
    }

    return true;
  }

  function liftPracticeDummy() {
    if (!canReachDummy()) return;
    const target = practiceDummy;
    const sprite = target.sprite;
    carriedDummy = { elapsed: 0, fromX: sprite.x, fromY: sprite.y - target.height * 0.44, fromAngle: sprite.angle };
    target.reaction = null;
    sprite.setFrame(target.liftedFrame).setOrigin(0.5, 0.56).setPosition(carriedDummy.fromX, carriedDummy.fromY)
      .setTint(0x9ed4ff).setDepth(10002);
    target.label.setVisible(false);
    updateAction();
  }

  function updateCarriedDummy(dt) {
    const carry = carriedDummy;
    if (!carry) return;
    const target = practiceDummy;
    carry.elapsed = Math.min(0.27, carry.elapsed + dt);
    const progress = carry.elapsed / 0.27;
    const ease = progress * progress * (3 - 2 * progress);
    const direction = playerSprite.flipX ? -1 : 1;
    const x = player.x + direction * target.width * 0.08;
    const y = player.y - jumpHeight - target.height * 0.94;
    target.sprite.setPosition(carry.fromX + (x - carry.fromX) * ease, carry.fromY + (y - carry.fromY) * ease)
      .setAngle(carry.fromAngle + (88 * direction - carry.fromAngle) * ease);
  }

  function findThrowLanding() {
    const radius = settings.player.collision.radius;
    const step = Math.max(1, Math.min(4, radius / 2));
    const minDistance = 2 * radius + 2;
    const { x: aimX, y: aimY } = throwAim;
    const landingAt = (dx, dy, distance) => {
      const x = player.x + dx * distance;
      const y = player.y + dy * distance;
      if (hasBodyRoom(x, y, player)) return { x, y };
    };

    // The airborne dummy can pass through walls. Only the landing needs clearance.
    const range = Math.max(92, minDistance);
    for (let distance = range; distance <= range + 32; distance += step) {
      const landing = landingAt(aimX, aimY, distance);
      if (landing) return landing;
    }
    for (let distance = range - step; distance >= minDistance; distance -= step) {
      const landing = landingAt(aimX, aimY, distance);
      if (landing) return landing;
    }
    for (const [dx, dy] of [[-aimX, -aimY], [-aimY, aimX], [aimY, -aimX]]) {
      const landing = landingAt(dx, dy, minDistance + step);
      if (landing) return landing;
    }
  }

  function launchPracticeDummy() {
    const target = practiceDummy;
    const landing = findThrowLanding();
    if (!landing) return;
    const { x, y } = landing;
    if (Math.abs(x - player.x) > 0.01) playerSprite.setFlipX(x < player.x);
    const direction = playerSprite.flipX ? -1 : 1;
    dummyFlight = {
      x, y, elapsed: 0, fromX: target.sprite.x, fromY: target.sprite.y,
      fromAngle: target.sprite.angle, endAngle: direction * 360
    };
    carriedDummy = null;
    updateAction();
  }

  function updateDummyFlight(dt) {
    const flight = dummyFlight;
    const target = practiceDummy;
    flight.elapsed += dt;
    const progress = Math.min(1, flight.elapsed / 0.46);
    if (progress < 1) {
      const height = 25 * 4 * progress * (1 - progress);
      const endY = flight.y - target.height * 0.44;
      target.sprite.setPosition(
        flight.fromX + (flight.x - flight.fromX) * progress,
        flight.fromY + (endY - flight.fromY) * progress - height
      ).setAngle(flight.fromAngle + (flight.endAngle - flight.fromAngle) * progress);
      return;
    }
    target.x = flight.x;
    target.y = flight.y;
    target.sprite.setFrame(target.idleFrame).setOrigin(0.5, 1).setPosition(target.x, target.y).setAngle(0).setDepth(9999);
    target.label.setPosition(target.x, target.y - target.height - 4).setVisible(true);
    dummyFlight = null;
  }

  function requestGrab() {
    if (!actionRenderer || activeWorkout || activeItem || characterAction || !practiceDummy || dummyFlight) return;
    kickTapTimes = [];
    playCharacterAction(carriedDummy ? "throw" : "grab");
  }

  function requestJump() {
    if (!player || activeWorkout || activeItem || jumpElapsed !== null) return;
    jumpElapsed = 0;
    lastDrawnFrame = -1;
  }

  function requestKick() {
    if (!actionRenderer || activeWorkout || activeItem || fullKickQueued || carriedDummy) return;
    const action = characterAction?.key;
    if (action && action !== "kick") return;

    const now = performance.now();
    kickTapTimes = kickTapTimes.filter((time) => now - time <= FULL_KICK_WINDOW_MS);
    kickTapTimes.push(now);
    if (kickTapTimes.length >= FULL_KICK_TAPS) {
      kickTapTimes = [];
      attackButton.classList.add("kick-control-full");
      if (action) fullKickQueued = true;
      else playCharacterAction("full-kick");
    } else if (!action) {
      playCharacterAction("kick");
    }
  }
  function requestGesture(animation) {
    if (!actionRenderer || activeWorkout || activeItem || carriedDummy || characterAction) return;
    kickTapTimes = [];
    playCharacterAction(animation);
  }

  function setMovesOpen(open) {
    movePicker.hidden = !open;
    movesButton.setAttribute("aria-expanded", String(open));
  }

  function equipMove(option) {
    equippedMove = option.dataset.move;
    const label = option.textContent.trim();
    const shortcut = moveShortcuts[equippedMove];
    kickTapTimes = [];
    attackIcon.setAttribute("href", `#hud-${equippedMove}`);
    attackButton.dataset.move = equippedMove;
    attackButton.title = equippedMove === "kick" ? "Kick (K). Tap four times quickly for a full kick." : `${label} (${shortcut})`;
    attackButton.setAttribute("aria-label", `Attack with ${label}`);
    attackButton.setAttribute("aria-keyshortcuts", shortcut);
    for (const choice of moveOptions) choice.setAttribute("aria-pressed", String(choice === option));
    setMovesOpen(false);
  }

  function bindActionButton(button, perform) {
    // A second touch can activate an action while the first is captured by the joystick.
    button.addEventListener("pointerdown", (event) => {
      if (event.button === 0) perform(event);
    });
    button.addEventListener("click", (event) => {
      if (event.detail === 0) perform(event);
    });
  }
  bindActionButton(attackButton, () => {
    if (equippedMove === "kick") requestKick();
    else requestGesture(equippedMove);
  });
  bindActionButton(actionButton, requestContextAction);
  bindActionButton(jumpButton, requestJump);
  bindActionButton(movesButton, (event) => {
    const open = movePicker.hidden;
    setMovesOpen(open);
    if (open && event.type === "click") moveOptions.find((option) => option.dataset.move === equippedMove)?.focus();
  });
  for (const option of moveOptions) {
    bindActionButton(option, (event) => {
      equipMove(option);
      if (event.type === "click") movesButton.focus();
    });
  }
  document.addEventListener("pointerdown", (event) => {
    if (!movePicker.hidden && !movePicker.contains(event.target) && !movesButton.contains(event.target)) setMovesOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !movePicker.hidden) {
      setMovesOpen(false);
      movesButton.focus();
    }
  });

  function patternCanvas(key) {
    const [base, line, accent] = materialColors[key] || materialColors.hall;
    const size = FLOOR_PATTERN_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    if (key === "gym") {
      ctx.fillStyle = line;
      ctx.fillRect(0, 0, size, 3);
      ctx.fillRect(0, 0, 3, size);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = accent;
      for (let i = 0; i < 28; i++) {
        ctx.fillRect(5 + i * 37 % 119, 5 + i * 61 % 119, i % 5 === 0 ? 3 : 2, 2);
      }
      return canvas;
    }

    if (key === "grass" || key === "dirt") {
      const pixels = (worldUnits) => Math.round(worldUnits * size / FLOOR_REPEAT_SIZE);
      const dot = pixels(2);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = accent;
      for (let i = 0; i < 18; i++) {
        const x = pixels((i * 17) % FLOOR_REPEAT_SIZE);
        const y = pixels((i * 29) % FLOOR_REPEAT_SIZE);
        ctx.fillRect(x, y, dot, dot);
      }
      return canvas;
    }

    // Fill whole texels so the grout is sharp before the camera scales it.
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = line;
    ctx.beginPath();
    if (key === "brick") {
      const rowHeight = size / 4;
      for (let row = 0; row < 4; row++) {
        const y = row * rowHeight;
        const offset = (row % 2) * size / 4;
        ctx.rect(0, y, size, 4);
        ctx.rect(offset, y, 4, rowHeight);
        ctx.rect(offset + size / 2, y, 4, rowHeight);
      }
    } else if (key === "wood") {
      for (let column = 0; column < 3; column++) {
        ctx.rect(Math.round(column * size / 3), 0, 3, size);
      }
    } else {
      for (let stride = 0; stride < size; stride += size / 2) {
        ctx.rect(stride, 0, 3, size);
        ctx.rect(0, stride, size, 3);
      }
    }
    ctx.fill();
    return canvas;
  }
  function addFloor(scene) {
    const tileScale = FLOOR_REPEAT_SIZE / FLOOR_PATTERN_SIZE;
    const regions = mapData.floor.regions || [mapData.floor];
    for (const region of regions) {
      const material = region.material || "hall";
      const key = `floor:${material}`;
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, patternCanvas(material));
      scene.add.tileSprite(region.x, region.y, region.width, region.height, key)
        .setOrigin(0)
        .setDepth(-1000)
        .setTileScale(tileScale)
        .setTilePosition((region.x % FLOOR_REPEAT_SIZE) / tileScale, (region.y % FLOOR_REPEAT_SIZE) / tileScale);
    }
  }
  function addWalls(scene) {
    const g = scene.add.graphics().setDepth(-100);
    // Paint each band across the whole network so no segment caps cut across a junction.
    for (const layer of RoomscapeWalls.layers) {
      for (const wall of walls) {
        const width = layer.width(wall);
        const color = Phaser.Display.Color.HexStringToColor(layer.color(wall)).color;
        g.lineStyle(width, color).beginPath().moveTo(wall.x1, wall.y1).lineTo(wall.x2, wall.y2).strokePath();
        g.fillStyle(color).fillCircle(wall.x1, wall.y1, width / 2).fillCircle(wall.x2, wall.y2, width / 2);
      }
    }
  }
  function addLandscape(scene) {
    const g = scene.add.graphics().setDepth(-500);
    for (const item of mapData.landscape || []) {
      if (item.type === "tree") {
        g.fillStyle(0x584233, 1).fillRoundedRect(item.x - 5, item.y + 5, 10, item.size * .48, 4);
        g.fillStyle(0x317d45, 1).fillCircle(item.x, item.y, item.size * .52);
        g.fillStyle(0x65ad57, 1).fillCircle(item.x - item.size * .1, item.y - item.size * .12, item.size * .34);
      } else if (item.type === "hedge") {
        g.fillStyle(0x317b43, 1).fillRoundedRect(item.x, item.y, item.width, item.height, 10);
        g.fillStyle(0x66a951, 1).fillRoundedRect(item.x + 2, item.y + 2, item.width - 4, item.height * .5, 8);
      } else if (item.type === "fence") {
        g.lineStyle(3, 0x363640, 1).strokeRect(item.x, item.y, item.width, item.height);
      } else if (item.type === "bench") {
        g.fillStyle(0x785238, 1).fillRoundedRect(item.x, item.y, item.width, item.height, 4);
        g.lineStyle(2, 0x493a32, 1).strokeRect(item.x, item.y, item.width, item.height);
      } else if (item.type === "sign") {
        g.fillStyle(0x8c5e38, 1).fillRoundedRect(item.x, item.y, item.width, item.height, 3);
        scene.add.text(item.x + item.width / 2, item.y + item.height / 2, item.text || "", { fontFamily: "system-ui", fontSize: "10px", color: "#fff2d6" }).setOrigin(.5).setDepth(-499);
      }
    }
  }

  function addRoomLabels(scene) {
    const labels = mapData.labels || [];
    if (!labels.length) return;
    const plaques = scene.add.graphics().setDepth(-50);
    for (const { x, y, text } of labels) {
      if (!text) continue;
      const width = Math.max(70, text.length * 6.7 + 18);
      plaques.fillStyle(0x211923, 0.4).fillRoundedRect(x + 2, y + 3, width, 26, 4);
      plaques.fillStyle(0x8e5b3d).fillRoundedRect(x, y, width, 26, 4);
      plaques.lineStyle(1.8, 0x452e2b).strokeRoundedRect(x, y, width, 26, 4);
      plaques.lineStyle(1, 0xd4a476).strokeRoundedRect(x + 3, y + 3, width - 6, 20, 2);
      plaques.fillStyle(0xf0c184).fillCircle(x + 7, y + 13, 1.4).fillCircle(x + width - 7, y + 13, 1.4);
      scene.add.text(x + width / 2, y + 13, text, {
        fontFamily: "system-ui", fontSize: "11px", color: "#fff2db", fontStyle: "bold", resolution: 2
      }).setOrigin(.5).setDepth(-49);
    }
  }

  function sceneConfig() {
    const spriteSettings = settings.player.sprite;
    const useDrawnArt = spriteSettings.art === "drawn" && typeof RoomscapeExplorer !== "undefined";
    return {
      preload() {
        if (!useDrawnArt) this.load.image("walk-atlas", spriteSettings.src);
        const needed = new Set();
        for (const item of mapData.objects) {
          const asset = assetById(item.assetId);
          if (asset) {
            needed.add(asset.id);
            if (asset.interaction?.checkedAssetId) needed.add(asset.interaction.checkedAssetId);
          }
        }
        for (const id of needed) {
          const asset = assetById(id);
          if (asset?.canvas) this.textures.addCanvas(`asset:${asset.id}`, asset.canvas);
          else if (asset) this.load.image(`asset:${asset.id}`, asset.src);
          if (asset?.inUseCanvas) this.textures.addCanvas(`asset-in-use:${asset.id}`, asset.inUseCanvas);
        }
      },
      create() {
        const scene = this;
        walls = RoomscapeWalls.joinedSegments(mapData.wallSegments || [], mapData.style?.wallWidth);
        addFloor(scene); addLandscape(scene); addWalls(scene);
        addRoomLabels(scene);
        characterArt = useDrawnArt ? RoomscapeExplorer.createAtlas() : spriteSettings;
        const atlas = useDrawnArt
          ? scene.textures.addCanvas("walk-atlas", characterArt.canvas)
          : scene.textures.get("walk-atlas");
        characterArt.frames.forEach((frame, index) => atlas.add(`walk:${index}`, 0, frame.x, frame.y, frame.width, frame.height));
        objects = mapData.objects.map((item) => {
          const asset = assetById(item.assetId); if (!asset) return null;
          const depth = asset.drawInFrontOfCharacters ? 10003 : Number(item.z) || 0;
          const sprite = scene.add.image(item.x + item.width / 2, item.y + item.height / 2, `asset:${asset.id}`)
            .setOrigin(.5, .5).setDisplaySize(item.width, item.height)
            .setRotation((Number(item.rotation) || 0) * Math.PI / 180).setDepth(depth);
          const collider = colliderOf(item);
          const points = collider?.type === "polygon" && collider.points?.length >= 3 ? collider.points.map((p) => transformPoint(item, p)) : null;
          item._sprite = sprite; item._points = points;
          item._bounds = points ? { left: Math.min(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) } : null;
          const key = item.exercise || asset.exercise;
          const exercise = Object.hasOwn(RoomscapeGym.exercises, key) && RoomscapeGym.exercises[key];
          if (exercise) {
            const stand = transformPoint(item, exercise.stand);
            const size = exercise.displaySize;
            item._workout = {
              key, exercise, stand, pose: exercise.onMachine ? transformPoint(item, exercise.onMachine) : stand,
              rotation: exercise.onMachine ? sprite.rotation : 0,
              displaySize: size && { width: item.width * size[0], height: item.height * size[1] },
              inUseTexture: key === asset.exercise && asset.inUseCanvas ? `asset-in-use:${asset.id}` : null
            };
          }
          return item;
        }).filter(Boolean);
        workoutStations = objects.filter((item) => item._workout);
        const height = spriteSettings.displayHeight;
        const width = Math.max(...characterArt.frames.map((pose) => pose.width / pose.height * height));
        characterSize = { width, height };
        const idle = { key: "walk-atlas", frame: `walk:${characterArt.idleFrame}` };
        const spawn = settings.player.spawn;
        playerSprite = scene.add.sprite(0, 0, idle.key, idle.frame).setOrigin(.5, 1).setDisplaySize(width, height);
        player = scene.add.container(spawn.x, spawn.y, [playerSprite]).setDepth(10000);
        playerShadow = scene.add.ellipse(spawn.x, spawn.y - 3, width * 0.5, height * 0.12, 0x1a1f2b, 0.3)
          .setDepth(9998).setVisible(false);
        targetMarker = scene.add.ellipse(0, 0, 27, 11, 0xffd166, 0.16).setStrokeStyle(2, 0xffd166)
          .setDepth(9997).setVisible(false);
        addPracticeDummy(scene, idle, `walk:${characterArt.liftedDummyFrame}`, width, height);
        if (useDrawnArt) {
          actionRenderer = RoomscapeExplorer.createActionRenderer();
          actionTexture = scene.textures.addCanvas("explorer-action", actionRenderer.canvas);
          scene.textures.addCanvas("puff-smoke", RoomscapeExplorer.createPuffTexture());
          // Three billows per burst, with room for two overlapping bursts.
          for (let i = 0; i < 6; i++) {
            smokePuffs.push({ sprite: scene.add.image(0, 0, "puff-smoke").setDepth(9998).setVisible(false), burst: null });
          }
        }
        attackButton.hidden = movesButton.hidden = !actionRenderer;
        updateAction();
        actionControls.hidden = false;
        camera = scene.cameras.main;
        camera.setBounds(mapData.bounds.left, mapData.bounds.top, mapData.bounds.right - mapData.bounds.left, mapData.bounds.bottom - mapData.bounds.top);
        camera.startFollow(player, false);
        const zoom = () => camera.setZoom((game.scale.height / mapData.viewport.worldHeight) * settings.camera.zoom * zoomFactors[zoomStep]);
        zoom();
        scene.scale.on("resize", () => { applyQualityResolution(); zoom(); });
        applyQualityResolution();
        scene.input.keyboard.on("keydown", (event) => {
          const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
          if (key === " " && event.target?.closest?.("button:not(#move-stick)")) return;
          if (key === " ") event.preventDefault();
          input.keys.add(key);
          if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
          if (key === "e") toggleAction();
          if (key === " ") requestJump();
          if (key === "k") requestKick();
          if (key === "j") requestGesture("punch");
          if (key === "f") requestGesture("slap");
          if (key === "g") requestGesture("puff");
          if (key === "q") requestGrab();
        });
        scene.input.keyboard.on("keyup", (event) => input.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
        scene.input.on("pointerdown", (p) => { if (p.button !== 0 || p.event.target === stick || p.event.target.closest?.("button")) return; input.destination = camera.getWorldPoint(p.x, p.y); });
        scene.events.on("update", updateFrame);
      }
    };
  }
  function updateCharacterAction(dt) {
    const action = characterAction;
    const clip = RoomscapeExplorer.actions[action.key];
    action.elapsed += dt;
    const progress = Math.min(1, action.elapsed / clip.duration);
    if (!action.contacted && progress >= clip.contact) {
      action.contacted = true;
      lastDrawnFrame = -1;
      if (action.key === "grab") liftPracticeDummy();
      else if (action.key === "throw") launchPracticeDummy();
      else if (action.key === "puff") emitPuff();
      else resolvePracticeHit(practiceMoves[action.key]);
    }
    if (progress < 1) return;
    characterAction = null;
    lastDrawnFrame = -1;
    if (action.key === "kick" && fullKickQueued) {
      fullKickQueued = false;
      playCharacterAction("full-kick");
    }
    if (action.key === "full-kick") attackButton.classList.remove("kick-control-full");
    updateAction();
  }

  function renderCharacter(step, now) {
    let texture = "walk-atlas";
    let frame;
    if (activeWorkout || characterAction || (actionRenderer && jumpElapsed !== null)) {
      const action = characterAction;
      const paintFrame = Math.floor(now * ACTION_RENDER_FPS[activeQuality] / 1000);
      if (paintFrame !== lastDrawnFrame) {
        lastDrawnFrame = paintFrame;
        if (activeWorkout) {
          const { item, elapsed } = activeWorkout;
          const { key, exercise } = item._workout;
          const progress = elapsed / exercise.duration;
          const phase = progress * exercise.reps % 1;
          actionRenderer.drawWorkout(key, phase, elapsed);
          workoutProgress.value = progress;
          if (key === "boxing") {
            const restRotation = (Number(item.rotation) || 0) * Math.PI / 180;
            item._sprite.setRotation(restRotation + Math.sin(Math.max(0, phase - .42) / .58 * Math.PI * 2) * .13);
          }
        } else {
          const progress = action ? action.elapsed / RoomscapeExplorer.actions[action.key].duration : 0;
          actionRenderer.draw(action?.key, progress, step, runBlend, Boolean(carriedDummy), jumpHeight / JUMP_HEIGHT);
        }
        actionTexture.refresh();
      }
      texture = "explorer-action";
      frame = "__BASE";
    } else {
      const frames = carriedDummy ? characterArt.carryRunFrames : characterArt.runFrames || characterArt.walkFrames;
      const idle = carriedDummy ? characterArt.carryIdleFrame : characterArt.idleFrame;
      frame = `walk:${running && frames?.length ? frames[step % frames.length] : idle}`;
    }
    if (playerSprite.texture.key !== texture || playerSprite.frame.name !== frame) {
      const { width, height } = activeWorkout?.item._workout.displaySize || characterSize;
      playerSprite.setTexture(texture, frame).setDisplaySize(width, height);
    }
  }

  function updateJump(dt) {
    if (jumpElapsed === null) return;
    jumpElapsed += dt;
    const progress = Math.min(1, jumpElapsed / JUMP_DURATION);
    jumpHeight = 4 * JUMP_HEIGHT * progress * (1 - progress);
    playerSprite.y = -jumpHeight;
    playerShadow.setPosition(player.x, player.y - 3).setVisible(progress < 1);
    if (progress === 1) {
      jumpElapsed = null;
      lastDrawnFrame = -1;
    }
  }

  function findWallJump(aimX, aimY, step, obstacle) {
    const range = (JUMP_DURATION - jumpElapsed) * settings.player.movement.maximumSpeed;
    const startX = player.x, startY = player.y;
    // Commit to the crossing only when there is ground within reach on the other side.
    for (let distance = step; distance <= range; distance = Math.min(range, distance + 3)) {
      const x = startX + aimX * distance, y = startY + aimY * distance;
      if (!hasBodyRoom(x, y, obstacle, true)) break;
      if (hasBodyRoom(x, y, obstacle)) return { x, y, startX, startY };
      if (distance === range) break;
    }
  }

  function advanceWallJump(step, obstacle) {
    const landing = wallJump;
    const dx = landing.x - player.x, dy = landing.y - player.y;
    const distance = Math.hypot(dx, dy);
    const arrived = distance <= step + 1e-6;
    const x = arrived ? landing.x : player.x + dx * step / distance;
    const y = arrived ? landing.y : player.y + dy * step / distance;
    if (!hasBodyRoom(x, y, obstacle, !arrived)) {
      player.setPosition(landing.startX, landing.startY);
      wallJump = null;
      return;
    }
    player.setPosition(x, y);
    if (arrived) wallJump = null;
  }

  function update(dt) {
    updatePracticeDummy(dt);
    updateSmoke(dt);
    if (activeWorkout) {
      updateWorkout(dt);
      return;
    }
    const move = { x: 0, y: 0 };
    for (const [key, x, y] of movementKeys) {
      if (input.keys.has(key)) {
        move.x += x;
        move.y += y;
      }
    }
    if (!move.x && !move.y && Math.hypot(input.x, input.y) > 0.06) {
      move.x = input.x;
      move.y = input.y;
    }
    const stride = settings.player.movement.maximumSpeed * dt;
    let step = stride;
    if (!move.x && !move.y && input.destination) {
      move.x = input.destination.x - player.x;
      move.y = input.destination.y - player.y;
      const remaining = Math.hypot(move.x, move.y);
      step = Math.min(step, remaining);
      if (remaining < 0.01) input.destination = null;
    }
    const oldX = player.x, oldY = player.y;
    const length = Math.hypot(move.x, move.y);
    const obstacle = carriedDummy ? null : dummyFlight || practiceDummy;
    if (wallJump) {
      advanceWallJump(stride, obstacle);
    } else if (length > 0 && step > 0 && !activeItem) {
      throwAim.x = move.x / length;
      throwAim.y = move.y / length;
      const nextX = oldX + throwAim.x * step;
      const nextY = oldY + throwAim.y * step;
      if (jumpElapsed !== null && !hasBodyRoom(nextX, nextY, obstacle)) {
        wallJump = findWallJump(throwAim.x, throwAim.y, step, obstacle);
      }
      if (wallJump) {
        advanceWallJump(stride, obstacle);
      } else {
        if (nextX !== oldX) {
          if (hasBodyRoom(nextX, oldY, obstacle)) player.x = nextX;
          else input.destination = null;
        }
        if (nextY !== oldY) {
          if (hasBodyRoom(player.x, nextY, obstacle)) player.y = nextY;
          else input.destination = null;
        }
      }
    }
    const dx = player.x - oldX, dy = player.y - oldY;
    // Keep the previous facing when the player is moving mostly up or down.
    if (Math.abs(dx) > Math.max(6 * dt, Math.abs(dy) * 0.25)) playerSprite.setFlipX(dx < 0);
    const speed = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
    running = speed > (running ? 5 : 10) && settings.player.sprite.walkingEnabled;
    if (running) runTime += dt;
    runBlend = running ? Math.min(1, runBlend + dt * 14) : Math.max(0, runBlend - dt * 14);
    updateJump(dt);
    updateCarriedDummy(dt);
    if (characterAction) updateCharacterAction(dt);
  }

  function updateFrame(now, delta) {
    if (document.hidden) return;
    if (skipNextDelta) {
      skipNextDelta = false;
    } else {
      // Use real frame time, while keeping each collision step short and bounding catch-up.
      const elapsed = Math.min(delta / 1000, MAX_FRAME_TIME);
      const steps = Math.ceil(elapsed / MAX_MOVEMENT_STEP);
      for (let i = 0; i < steps; i++) update(elapsed / steps);
    }
    renderCharacter(Math.floor(runTime * (characterArt.runFps || characterArt.walkFps)), now);
    if (now - lastPromptAt > 60) { lastPromptAt = now; updateAction(); }
    updateTargetMarker();
  }
  function setStick(event) {
    const rect = stick.getBoundingClientRect(), max = (rect.width - knob.offsetWidth) / 2;
    let dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2), distance = Math.hypot(dx, dy);
    if (distance > max) { dx *= max / distance; dy *= max / distance; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; input.x = dx / max; input.y = dy / max;
  }
  stick.addEventListener("pointerdown", (e) => {
    if (input.pointerId !== null || e.button !== 0) return;
    input.pointerId = e.pointerId; input.destination = null;
    stick.setPointerCapture(e.pointerId); setStick(e); e.preventDefault();
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === input.pointerId) setStick(e); });
  function releaseStick(e) { if (e.pointerId !== input.pointerId) return; input.pointerId = null; input.x = input.y = 0; knob.style.transform = "translate(0,0)"; }
  stick.addEventListener("pointerup", releaseStick);
  stick.addEventListener("pointercancel", releaseStick);
  stick.addEventListener("lostpointercapture", releaseStick);

  function clearMovementInput() {
    input.keys.clear();
    input.destination = null;
    if (input.pointerId !== null) {
      const pointerId = input.pointerId;
      releaseStick({ pointerId });
      if (stick.hasPointerCapture(pointerId)) stick.releasePointerCapture(pointerId);
    }
  }

  window.addEventListener("blur", clearMovementInput);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearMovementInput();
    else {
      skipNextDelta = true;
      lastDrawnFrame = -1;
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) skipNextDelta = true;
  });
  zoomButton.addEventListener("click", () => { zoomStep = (zoomStep + 1) % zoomFactors.length; zoomButton.textContent = `${zoomFactors[zoomStep]}×`; if (camera) camera.setZoom((game.scale.height / mapData.viewport.worldHeight) * settings.camera.zoom * zoomFactors[zoomStep]); });

  async function start() {
    [mapData, settings, catalog] = await Promise.all([json("maps/room-01/map.json"), json("game-settings.json"), json("assets/asset-manifest.json")]);
    catalog.assets.push(...RoomscapeGym.createAssets());
    const canvasHost = document.createElement("div"); canvasHost.id = "game-container"; canvasHost.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    svg.style.display = "none"; svg.parentElement.insertBefore(canvasHost, svg);
    const renderScale = resolutionScaleFor(activeQuality);
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: canvasHost,
      width: Math.round(innerWidth * renderScale),
      height: Math.round(innerHeight * renderScale),
      backgroundColor: "#343640",
      fps: { smoothStep: false },
      scale: { mode: Phaser.Scale.NONE, width: Math.round(innerWidth * renderScale), height: Math.round(innerHeight * renderScale) },
      render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false, powerPreference: "high-performance" },
      scene: sceneConfig()
    });
  }
  start().catch((error) => fail(`${error.message} Open the game through a local web server so its JSON files can load.`));
})();

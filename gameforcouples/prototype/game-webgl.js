(() => {
  const svg = document.querySelector("main > svg");
  const stick = document.getElementById("move-stick");
  const knob = document.getElementById("stick-knob");
  const kickButton = document.getElementById("kick-button");
  const slapButton = document.getElementById("slap-button");
  const puffButton = document.getElementById("puff-button");
  const actionButton = document.getElementById("interaction-action");
  const actionLabel = document.getElementById("interaction-label");
  const actionTarget = document.getElementById("interaction-target");
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
  const materialColors = {
    grass: ["#63aa5b", "#39894c", "#8cc76b"], path: ["#d9b987", "#bb9a69", "#e6cfaa"],
    paving: ["#bfc9d5", "#7f91a6", "#e7edf4"], parking: ["#50505c", "#f2e5d5", "#676876"],
    brick: ["#a7444b", "#692f3b", "#bd6460"], dirt: ["#98715e", "#bd9277", "#87614f"],
    tile: ["#dce2e8", "#8191a3", "#f0f2f4"], wood: ["#d7a15f", "#a96e3e", "#e9bd7c"],
    blue: ["#78a9ba", "#557d90", "#9bc7d2"], hall: ["#78c3fb", "#3978a2", "#d8efff"]
  };
  let game, mapData, settings, catalog, objects = [], player, camera, activeItem = null;
  let zoomStep = 0, lastPromptAt = 0;
  let kickTapTimes = [], fullKickQueued = false;
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

  function canOccupy(x, y) {
    const body = settings.player.collision, cy = y - body.footOffset;
    const inside = (px, py) => mapData.walkable.some((r) => px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height);
    if (!inside(x, cy)) return false;
    for (let s = 0; s < 12; s++) {
      const a = s * Math.PI / 6;
      if (!inside(x + Math.cos(a) * body.radius, cy + Math.sin(a) * body.radius)) return false;
    }
    for (const wall of mapData.wallSegments || []) {
      const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1, len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((x - wall.x1) * dx + (cy - wall.y1) * dy) / len)) : 0;
      const reach = body.radius + (wall.width || mapData.style?.wallWidth || 25) / 2;
      if ((x - wall.x1 - t * dx) ** 2 + (cy - wall.y1 - t * dy) ** 2 <= reach * reach) return false;
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
  function updateAction() {
    const item = nearestSearchable();
    if (!item) { actionButton.hidden = true; return; }
    const asset = assetById(item.assetId);
    actionLabel.textContent = activeItem ? "Done" : asset.interaction.actionLabel || "Check";
    actionTarget.textContent = item.name || asset.name;
    actionButton.setAttribute("aria-label", `${actionLabel.textContent} ${item.name || asset.name}`);
    actionButton.hidden = false;
  }
  function placeAction() {
    const target = activeItem || nearestSearchable();
    if (!target || actionButton.hidden) return;
    const rect = game.canvas.getBoundingClientRect();
    const wv = camera.worldView, z = camera.zoom;
    const scaleX = rect.width / game.scale.width, scaleY = rect.height / game.scale.height;
    const x = rect.left + ((target.x + target.width / 2 - wv.x) * z * scaleX);
    const y = rect.top + ((target.y - 8 - wv.y) * z * scaleY);
    actionButton.style.transform = `translate3d(${Math.max(64, Math.min(innerWidth - 64, x))}px,${Math.max(62, Math.min(innerHeight - 85, y))}px,0) translate(-50%,-100%)`;
  }
  function toggleAction() {
    if (activeCharacterAction()) return;
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
  actionButton.addEventListener("click", toggleAction);

  function activeCharacterAction() {
    const animation = player?.anims.currentAnim?.key;
    if (player?.anims.isPlaying && animation && animation !== "walk" && animation !== "idle") {
      return animation;
    }
    return null;
  }

  function playCharacterAction(animation) {
    if (player.bodyVelocity) player.bodyVelocity.x = player.bodyVelocity.y = 0;
    player.anims.timeScale = 1;
    player.play(animation);
  }

  function requestKick() {
    if (kickButton.hidden || activeItem || fullKickQueued) return;
    const action = activeCharacterAction();
    if (action && action !== "kick") return;

    const now = performance.now();
    kickTapTimes = kickTapTimes.filter((time) => now - time <= FULL_KICK_WINDOW_MS);
    kickTapTimes.push(now);
    if (kickTapTimes.length >= FULL_KICK_TAPS) {
      kickTapTimes = [];
      kickButton.classList.add("kick-control-full");
      if (action) fullKickQueued = true;
      else playCharacterAction("full-kick");
    } else if (!action) {
      playCharacterAction("kick");
    }
  }
  kickButton.addEventListener("click", requestKick);

  function requestGesture(button, animation) {
    if (button.hidden || activeItem || activeCharacterAction()) return;
    kickTapTimes = [];
    playCharacterAction(animation);
  }
  slapButton.addEventListener("click", () => requestGesture(slapButton, "slap"));
  puffButton.addEventListener("click", () => requestGesture(puffButton, "puff"));

  function patternCanvas(key) {
    const [base, line, accent] = materialColors[key] || materialColors.hall;
    const size = FLOOR_PATTERN_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

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
    const segments = mapData.wallSegments || [];
    const joined = (segment) => {
      const ends = [{ x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 }];
      const dx = segment.x2 - segment.x1, dy = segment.y2 - segment.y1, length = Math.hypot(dx, dy) || 1;
      for (const other of segments) {
        if (other === segment) continue;
        const ox = other.x2 - other.x1, oy = other.y2 - other.y1, otherLength = Math.hypot(ox, oy) || 1;
        const sin = Math.abs((dx * oy - dy * ox) / (length * otherLength));
        if (sin > .22 && Math.abs(sin - 1) > .22) continue;
        const reach = ((segment.width || 26) + (other.width || 26)) / 2 + 4;
        for (const end of ends) {
          const t = ((end.x - other.x1) * ox + (end.y - other.y1) * oy) / (otherLength * otherLength);
          if (t < 0 || t > 1) continue;
          const px = other.x1 + t * ox, py = other.y1 + t * oy;
          if (Math.hypot(end.x - px, end.y - py) <= reach) { end.x = px; end.y = py; }
        }
      }
      return ends;
    };
    const strokeWithRoundEnds = (a, b, width, color, alpha = 1) => {
      g.lineStyle(width, color, alpha).beginPath().moveTo(a.x, a.y).lineTo(b.x, b.y).strokePath();
      const radius = width / 2;
      g.fillStyle(color, alpha).fillCircle(a.x, a.y, radius).fillCircle(b.x, b.y, radius);
    };
    for (const wall of mapData.wallSegments || []) {
      const width = wall.width || mapData.style?.wallWidth || 26;
      const [a, b] = joined(wall);
      strokeWithRoundEnds(a, b, width + 6, 0x17151b);
      strokeWithRoundEnds(a, b, width, Phaser.Display.Color.HexStringToColor(wall.stroke || "#672b38").color);
      strokeWithRoundEnds(a, b, Math.max(5, width * .42), 0x17151b);
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
          if (asset) this.load.image(`asset:${asset.id}`, asset.src);
        }
      },
      create() {
        const scene = this;
        addFloor(scene); addLandscape(scene); addWalls(scene);
        for (const label of mapData.labels || []) scene.add.text(label.x, label.y, label.text || "", { fontFamily: "system-ui", fontSize: "16px", color: "#624b42", fontStyle: "bold", alpha: .65 }).setDepth(-50);
        const playerArt = useDrawnArt ? RoomscapeExplorer.createAtlas() : spriteSettings;
        const atlas = useDrawnArt
          ? scene.textures.addCanvas("walk-atlas", playerArt.canvas)
          : scene.textures.get("walk-atlas");
        playerArt.frames.forEach((frame, index) => atlas.add(`walk:${index}`, 0, frame.x, frame.y, frame.width, frame.height));
        objects = mapData.objects.map((item) => {
          const asset = assetById(item.assetId); if (!asset) return null;
          const sprite = scene.add.image(item.x + item.width / 2, item.y + item.height / 2, `asset:${asset.id}`).setOrigin(.5, .5).setDisplaySize(item.width, item.height).setRotation((Number(item.rotation) || 0) * Math.PI / 180).setDepth(Number(item.z) || 0);
          const collider = colliderOf(item);
          const points = collider?.type === "polygon" && collider.points?.length >= 3 ? collider.points.map((p) => transformPoint(item, p)) : null;
          item._sprite = sprite; item._points = points;
          item._bounds = points ? { left: Math.min(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) } : null;
          return item;
        }).filter(Boolean);
        const displayHeight = spriteSettings.displayHeight;
        const displayWidth = Math.max(...playerArt.frames.map((pose) => pose.width / pose.height * displayHeight));
        const idle = { key: "walk-atlas", frame: `walk:${playerArt.idleFrame}` };
        player = scene.add.sprite(settings.player.spawn.x, settings.player.spawn.y, idle.key, idle.frame).setOrigin(.5, 1).setDisplaySize(displayWidth, displayHeight).setDepth(10000);
        player.on("animationupdate", () => player.setDisplaySize(displayWidth, displayHeight));
        const walk = playerArt.walkFrames.map((index) => ({ key: "walk-atlas", frame: `walk:${index}` }));
        scene.anims.create({ key: "idle", frames: [idle], frameRate: 1 });
        player.play("idle");
        if (walk.length) {
          scene.anims.create({ key: "walk", frames: walk, frameRate: playerArt.walkFps, repeat: -1 });
        }
        if (useDrawnArt && playerArt.kickFrames?.length && playerArt.fullKickFrames?.length) {
          const actions = [
            { key: "kick", indices: playerArt.kickFrames, frameRate: playerArt.kickFps },
            { key: "full-kick", indices: playerArt.fullKickFrames, frameRate: playerArt.fullKickFps },
            { key: "slap", indices: playerArt.slapFrames, frameRate: playerArt.slapFps, button: slapButton },
            { key: "puff", indices: playerArt.puffFrames, frameRate: playerArt.puffFps, button: puffButton }
          ];
          for (const { key, indices, frameRate, button } of actions) {
            if (!indices?.length) continue;
            const frames = indices.map((index) => ({ key: "walk-atlas", frame: `walk:${index}` }));
            scene.anims.create({ key, frames, frameRate });
            if (button) {
              player.on(`animationcomplete-${key}`, () => player.play("idle"));
              button.hidden = false;
            }
          }
          player.on("animationcomplete-kick", () => {
            if (fullKickQueued) {
              fullKickQueued = false;
              playCharacterAction("full-kick");
            } else {
              player.play("idle");
            }
          });
          player.on("animationcomplete-full-kick", () => {
            kickButton.classList.remove("kick-control-full");
            player.play("idle");
          });
          kickButton.hidden = false;
        }
        camera = scene.cameras.main;
        camera.setBounds(mapData.bounds.left, mapData.bounds.top, mapData.bounds.right - mapData.bounds.left, mapData.bounds.bottom - mapData.bounds.top);
        camera.startFollow(player, false);
        const zoom = () => camera.setZoom((game.scale.height / mapData.viewport.worldHeight) * settings.camera.zoom * zoomFactors[zoomStep]);
        zoom();
        scene.scale.on("resize", () => { applyQualityResolution(); zoom(); });
        applyQualityResolution();
        scene.input.keyboard.on("keydown", (event) => {
          const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
          input.keys.add(key);
          if (key === "e") toggleAction();
          if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
          if (key === "k") requestKick();
          if (key === "f") requestGesture(slapButton, "slap");
          if (key === "g") requestGesture(puffButton, "puff");
        });
        scene.input.keyboard.on("keyup", (event) => input.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
        scene.input.on("pointerdown", (p) => { if (p.button !== 0 || p.event.target === stick || p.event.target.closest?.("button")) return; input.destination = camera.getWorldPoint(p.x, p.y); });
        scene.events.on("update", (time, delta) => update(scene, Math.min(delta / 1000, .04), time));
      }
    };
  }
  function update(scene, dt, now) {
    if (activeCharacterAction()) return;
    const move = { x: 0, y: 0 };
    for (const [key, x, y] of [["ArrowLeft", -1, 0], ["a", -1, 0], ["ArrowRight", 1, 0], ["d", 1, 0], ["ArrowUp", 0, -1], ["w", 0, -1], ["ArrowDown", 0, 1], ["s", 0, 1]]) if (input.keys.has(key)) { move.x += x; move.y += y; }
    if (!move.x && !move.y) {
      const stickLength = Math.hypot(input.x, input.y);
      const deadzone = 0.06;
      if (stickLength > deadzone) {
        // Remap the usable joystick range so motion starts continuously after
        // the deadzone, with a slightly more responsive curve at mid deflection.
        const normalized = Math.min(1, (stickLength - deadzone) / (1 - deadzone));
        const intensity = Math.pow(normalized, 0.82);
        move.x = input.x / stickLength * intensity;
        move.y = input.y / stickLength * intensity;
      }
    }
    if (!move.x && !move.y && input.destination) {
      const dx = input.destination.x - player.x, dy = input.destination.y - player.y, distance = Math.hypot(dx, dy);
      if (distance < 4) input.destination = null; else { const scale = Math.min(1, distance / 55); move.x = dx / distance * scale; move.y = dy / distance * scale; }
    }
    const m = settings.player.movement, length = Math.hypot(move.x, move.y);
    if (length > .001 && !activeItem) {
      const intensity = Math.min(1, length), nx = move.x / length, ny = move.y / length;
      player.bodyVelocity ||= { x: 0, y: 0 };
      // Approach the requested velocity with a bounded acceleration. This
      // avoids snapping down to a lower speed whenever the stick moves inward.
      const targetX = nx * m.maximumSpeed * intensity, targetY = ny * m.maximumSpeed * intensity;
      const deltaX = targetX - player.bodyVelocity.x, deltaY = targetY - player.bodyVelocity.y;
      const deltaLength = Math.hypot(deltaX, deltaY), maxDelta = m.acceleration * dt;
      if (deltaLength <= maxDelta) {
        player.bodyVelocity.x = targetX;
        player.bodyVelocity.y = targetY;
      } else {
        const blend = maxDelta / deltaLength;
        player.bodyVelocity.x += deltaX * blend;
        player.bodyVelocity.y += deltaY * blend;
      }
    } else if (player.bodyVelocity) {
      const drag = Math.exp(-m.drag * dt); player.bodyVelocity.x *= drag; player.bodyVelocity.y *= drag;
      if (Math.hypot(player.bodyVelocity.x, player.bodyVelocity.y) < 2) player.bodyVelocity.x = player.bodyVelocity.y = 0;
    }
    const v = player.bodyVelocity || { x: 0, y: 0 }, oldX = player.x, oldY = player.y, nextX = oldX + v.x * dt, nextY = oldY + v.y * dt;
    if (Math.abs(nextX - oldX) > .01) { if (canOccupy(nextX, oldY)) player.x = nextX; else { v.x = 0; input.destination = null; } }
    if (Math.abs(nextY - oldY) > .01) { if (canOccupy(player.x, nextY)) player.y = nextY; else { v.y = 0; input.destination = null; } }
    const dx = player.x - oldX, dy = player.y - oldY;
    // Keep the previous facing when the player is moving mostly up or down.
    if (Math.abs(dx) > Math.max(6 * dt, Math.abs(dy) * 0.25)) player.setFlipX(dx < 0);
    const speed = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
    const wasWalking = player.anims.currentAnim?.key === "walk";
    const walking = speed > (wasWalking ? 5 : 10) && settings.player.sprite.walkingEnabled;
    if (walking !== wasWalking) player.play(walking ? "walk" : "idle");
    if (walking) {
      const speedRatio = Math.min(1, speed / m.maximumSpeed);
      player.anims.timeScale = 0.42 + 0.58 * Math.sqrt(speedRatio);
    }
    if (now - lastPromptAt > 60) { lastPromptAt = now; updateAction(); }
    placeAction();
  }
  function setStick(event) {
    const rect = stick.getBoundingClientRect(), max = (rect.width - knob.offsetWidth) / 2;
    let dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2), distance = Math.hypot(dx, dy);
    if (distance > max) { dx *= max / distance; dy *= max / distance; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; input.x = dx / max; input.y = dy / max;
  }
  stick.addEventListener("pointerdown", (e) => { input.pointerId = e.pointerId; input.destination = null; stick.setPointerCapture(e.pointerId); setStick(e); e.preventDefault(); });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === input.pointerId) setStick(e); });
  function releaseStick(e) { if (e.pointerId !== input.pointerId) return; input.pointerId = null; input.x = input.y = 0; knob.style.transform = "translate(0,0)"; }
  stick.addEventListener("pointerup", releaseStick); stick.addEventListener("pointercancel", releaseStick);
  zoomButton.addEventListener("click", () => { zoomStep = (zoomStep + 1) % zoomFactors.length; zoomButton.textContent = `${zoomFactors[zoomStep]}×`; if (camera) camera.setZoom((game.scale.height / mapData.viewport.worldHeight) * settings.camera.zoom * zoomFactors[zoomStep]); });

  async function start() {
    [mapData, settings, catalog] = await Promise.all([json("maps/room-01/map.json"), json("game-settings.json"), json("assets/asset-manifest.json")]);
    const canvasHost = document.createElement("div"); canvasHost.id = "game-container"; canvasHost.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    svg.style.display = "none"; svg.parentElement.insertBefore(canvasHost, svg);
    const renderScale = resolutionScaleFor(activeQuality);
    game = new Phaser.Game({ type: Phaser.AUTO, parent: canvasHost, width: Math.round(innerWidth * renderScale), height: Math.round(innerHeight * renderScale), backgroundColor: "#343640", scale: { mode: Phaser.Scale.NONE, width: Math.round(innerWidth * renderScale), height: Math.round(innerHeight * renderScale) }, render: { antialias: true, antialiasGL: true, pixelArt: false, roundPixels: false, powerPreference: "high-performance" }, scene: sceneConfig() });
  }
  start().catch((error) => fail(`${error.message} Open the game through a local web server so its JSON files can load.`));
})();

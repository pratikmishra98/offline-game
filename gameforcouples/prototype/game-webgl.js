(() => {
  const svg = document.querySelector("main > svg");
  const stick = document.getElementById("move-stick");
  const knob = document.getElementById("stick-knob");
  const actionButton = document.getElementById("interaction-action");
  const actionLabel = document.getElementById("interaction-label");
  const actionTarget = document.getElementById("interaction-target");
  const zoomButton = document.getElementById("zoom-cycle");
  const errorBox = document.getElementById("load-error");
  const input = { x: 0, y: 0, pointerId: null, destination: null, keys: new Set() };
  const zoomFactors = [1, 0.75, 0.5];
  const materialColors = {
    grass: ["#63aa5b", "#39894c", "#8cc76b"], path: ["#d9b987", "#bb9a69", "#e6cfaa"],
    paving: ["#bfc9d5", "#7f91a6", "#e7edf4"], parking: ["#50505c", "#f2e5d5", "#676876"],
    brick: ["#a7444b", "#692f3b", "#bd6460"], dirt: ["#98715e", "#bd9277", "#87614f"],
    tile: ["#dce2e8", "#8191a3", "#f0f2f4"], wood: ["#d7a15f", "#a96e3e", "#e9bd7c"],
    blue: ["#78a9ba", "#557d90", "#9bc7d2"], hall: ["#78c3fb", "#3978a2", "#d8efff"]
  };
  let game, mapData, settings, catalog, objects = [], player, camera, activeItem = null;
  let zoomStep = 0, lastPromptAt = 0;

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
    const x = rect.left + ((target.x + target.width / 2 - wv.x) * z);
    const y = rect.top + ((target.y - 8 - wv.y) * z);
    actionButton.style.transform = `translate3d(${Math.max(64, Math.min(innerWidth - 64, x))}px,${Math.max(62, Math.min(innerHeight - 85, y))}px,0) translate(-50%,-100%)`;
  }
  function toggleAction() {
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

  function patternCanvas(key) {
    const [base, line, accent] = materialColors[key] || materialColors.hall;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 48;
    const c = canvas.getContext("2d"); c.fillStyle = base; c.fillRect(0, 0, 48, 48);
    c.strokeStyle = line; c.globalAlpha = 0.55; c.lineWidth = key === "brick" ? 1.5 : 1;
    if (key === "wood") { for (let x = 0; x <= 48; x += 16) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 48); c.stroke(); } }
    else if (key === "grass" || key === "dirt") { c.globalAlpha = 0.3; c.fillStyle = accent; for (let i = 0; i < 18; i++) { c.fillRect((i * 17) % 48, (i * 29) % 48, 2, 2); } }
    else { for (let x = 0; x <= 48; x += key === "brick" ? 24 : 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 48); c.stroke(); } for (let y = 0; y <= 48; y += key === "brick" ? 12 : 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(48, y); c.stroke(); } }
    if (key === "brick") { c.beginPath(); c.moveTo(12, 0); c.lineTo(12, 12); c.moveTo(36, 12); c.lineTo(36, 24); c.moveTo(12, 24); c.lineTo(12, 36); c.moveTo(36, 36); c.lineTo(36, 48); c.stroke(); }
    c.globalAlpha = 1; return canvas;
  }
  function addFloor(scene) {
    const regions = mapData.floor.regions || [mapData.floor];
    for (const region of regions) {
      const key = `floor:${region.material || "hall"}`;
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, patternCanvas(region.material || "hall"));
      scene.add.tileSprite(region.x + region.width / 2, region.y + region.height / 2, region.width, region.height, key).setDepth(-1000).setTileScale(1, 1);
    }
  }
  function addWalls(scene) {
    const g = scene.add.graphics().setDepth(-100);
    for (const wall of mapData.wallSegments || []) {
      const width = wall.width || mapData.style?.wallWidth || 26;
      g.lineStyle(width + 6, Phaser.Display.Color.HexStringToColor("#17151b").color, 1).beginPath().moveTo(wall.x1, wall.y1).lineTo(wall.x2, wall.y2).strokePath();
      g.lineStyle(width, Phaser.Display.Color.HexStringToColor(wall.stroke || "#672b38").color, 1).beginPath().moveTo(wall.x1, wall.y1).lineTo(wall.x2, wall.y2).strokePath();
      g.lineStyle(Math.max(5, width * .42), 0x17151b, 1).beginPath().moveTo(wall.x1, wall.y1).lineTo(wall.x2, wall.y2).strokePath();
      g.lineStyle(Math.max(1.5, width * .07), Phaser.Display.Color.HexStringToColor(wall.edgeStroke || "#d86a66").color, .85).beginPath().moveTo(wall.x1, wall.y1 - width * .29).lineTo(wall.x2, wall.y2 - width * .29).strokePath();
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
    return {
      preload() {
        this.load.image("walk-atlas", settings.player.sprite.src);
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
        const atlas = scene.textures.get("walk-atlas");
        settings.player.sprite.frames.forEach((frame, index) => atlas.add(`walk:${index}`, 0, frame.x, frame.y, frame.width, frame.height));
        objects = mapData.objects.map((item) => {
          const asset = assetById(item.assetId); if (!asset) return null;
          const sprite = scene.add.image(item.x + item.width / 2, item.y + item.height / 2, `asset:${asset.id}`).setOrigin(.5, .5).setDisplaySize(item.width, item.height).setRotation((Number(item.rotation) || 0) * Math.PI / 180).setDepth(Number(item.z) || 0);
          const collider = colliderOf(item);
          const points = collider?.type === "polygon" && collider.points?.length >= 3 ? collider.points.map((p) => transformPoint(item, p)) : null;
          item._sprite = sprite; item._points = points;
          item._bounds = points ? { left: Math.min(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), right: Math.max(...points.map(p => p.x)), bottom: Math.max(...points.map(p => p.y)) } : null;
          return item;
        }).filter(Boolean);
        const frame = settings.player.sprite.frames[settings.player.sprite.idleFrame];
        player = scene.add.sprite(settings.player.spawn.x, settings.player.spawn.y, "walk-atlas", `walk:${settings.player.sprite.idleFrame}`).setOrigin(.5, 1).setDisplaySize(frame.width * settings.player.sprite.displayHeight / frame.height, settings.player.sprite.displayHeight).setDepth(10000);
        const walk = settings.player.sprite.walkFrames.map((index) => ({ key: "walk-atlas", frame: `walk:${index}` }));
        if (walk.length) {
          scene.anims.create({ key: "walk", frames: walk, frameRate: settings.player.sprite.walkFps, repeat: -1 });
          scene.anims.create({ key: "idle", frames: [{ key: "walk-atlas", frame: `walk:${settings.player.sprite.idleFrame}` }], frameRate: 1, repeat: -1 });
          player.play("idle");
        }
        camera = scene.cameras.main; camera.setBounds(mapData.bounds.left, mapData.bounds.top, mapData.bounds.right - mapData.bounds.left, mapData.bounds.bottom - mapData.bounds.top); camera.startFollow(player, true, .12, .12);
        const zoom = () => camera.setZoom((game.scale.height / mapData.viewport.worldHeight) * settings.camera.zoom * zoomFactors[zoomStep]);
        zoom(); scene.scale.on("resize", zoom);
        scene.input.keyboard.on("keydown", (event) => { const k = event.key.length === 1 ? event.key.toLowerCase() : event.key; input.keys.add(k); if (k === "e") toggleAction(); });
        scene.input.keyboard.on("keyup", (event) => input.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
        scene.input.on("pointerdown", (p) => { if (p.button !== 0 || p.event.target === stick || p.event.target.closest?.("button")) return; input.destination = camera.getWorldPoint(p.x, p.y); });
        scene.events.on("update", (time, delta) => update(scene, Math.min(delta / 1000, .04), time));
      }
    };
  }
  function update(scene, dt, now) {
    const move = { x: 0, y: 0 };
    for (const [key, x, y] of [["ArrowLeft", -1, 0], ["a", -1, 0], ["ArrowRight", 1, 0], ["d", 1, 0], ["ArrowUp", 0, -1], ["w", 0, -1], ["ArrowDown", 0, 1], ["s", 0, 1]]) if (input.keys.has(key)) { move.x += x; move.y += y; }
    if (!move.x && !move.y && Math.hypot(input.x, input.y) > .06) { move.x = input.x; move.y = input.y; }
    if (!move.x && !move.y && input.destination) {
      const dx = input.destination.x - player.x, dy = input.destination.y - player.y, distance = Math.hypot(dx, dy);
      if (distance < 4) input.destination = null; else { const scale = Math.min(1, distance / 55); move.x = dx / distance * scale; move.y = dy / distance * scale; }
    }
    const m = settings.player.movement, length = Math.hypot(move.x, move.y);
    if (length > .06 && !activeItem) {
      const intensity = Math.min(1, length), nx = move.x / length, ny = move.y / length;
      player.bodyVelocity ||= { x: 0, y: 0 };
      player.bodyVelocity.x += nx * m.acceleration * intensity * dt; player.bodyVelocity.y += ny * m.acceleration * intensity * dt;
      const speed = Math.hypot(player.bodyVelocity.x, player.bodyVelocity.y), target = m.maximumSpeed * intensity;
      if (speed > target) { player.bodyVelocity.x *= target / speed; player.bodyVelocity.y *= target / speed; }
    } else if (player.bodyVelocity) {
      const drag = Math.exp(-m.drag * dt); player.bodyVelocity.x *= drag; player.bodyVelocity.y *= drag;
      if (Math.hypot(player.bodyVelocity.x, player.bodyVelocity.y) < 2) player.bodyVelocity.x = player.bodyVelocity.y = 0;
    }
    const v = player.bodyVelocity || { x: 0, y: 0 }, oldX = player.x, oldY = player.y, nextX = oldX + v.x * dt, nextY = oldY + v.y * dt;
    if (Math.abs(nextX - oldX) > .01) { if (canOccupy(nextX, oldY)) player.x = nextX; else { v.x = 0; input.destination = null; } }
    if (Math.abs(nextY - oldY) > .01) { if (canOccupy(player.x, nextY)) player.y = nextY; else { v.y = 0; input.destination = null; } }
    if (Math.abs(v.x) > 2) player.setFlipX(v.x < 0);
    const walking = Math.hypot(v.x, v.y) > 7 && settings.player.sprite.walkingEnabled;
    if (walking && player.anims.currentAnim?.key !== "walk") player.play("walk");
    if (!walking && player.anims.currentAnim?.key !== "idle") player.play("idle");
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
    game = new Phaser.Game({ type: Phaser.AUTO, parent: canvasHost, width: innerWidth, height: innerHeight, backgroundColor: "#343640", scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" }, render: { antialias: true, roundPixels: false, powerPreference: "high-performance" }, scene: sceneConfig() });
  }
  start().catch((error) => fail(`${error.message} Open the game through a local web server so its JSON files can load.`));
})();

(() => {
  const $ = (id) => document.getElementById(id);
  const state = { normalFile: null, checkedFile: null, normalUrl: null, checkedUrl: null, baseManifest: null, manifest: null, manifestReady: false, batch: [] };
  const ui = {
    form: $("asset-form"), name: $("asset-name"), normalFile: $("normal-file"), checkedFile: $("checked-file"),
    normalPreview: $("normal-preview"), checkedPreview: $("checked-preview"), normalMeta: $("normal-meta"), checkedMeta: $("checked-meta"),
    checkedGroup: $("checked-group"), decorative: $("decorative-option"), searchable: $("searchable-option"), width: $("default-width"),
    submit: $("submit-asset"), hint: $("submit-hint"), message: $("message"),
    batchList: $("batch-list"), batchCount: $("batch-count"), batchNote: $("batch-note"), createZip: $("create-zip")
  };
  const MAX_SOURCE_DIMENSION = 1800;
  const MAX_OUTPUT_DIMENSION = 1200;
  const POLYGON_GRID = 96;

  function isSearchable() { return ui.form.elements["asset-type"].value === "searchable"; }

  function refreshType() {
    const searchable = isSearchable();
    ui.checkedGroup.hidden = !searchable;
    ui.decorative.classList.toggle("selected", !searchable);
    ui.searchable.classList.toggle("selected", searchable);
    ui.decorative.querySelector(".choice-mark").textContent = searchable ? "○" : "●";
    ui.searchable.querySelector(".choice-mark").textContent = searchable ? "●" : "○";
    updateReady();
  }

  function updateReady() {
    const ready = Boolean(ui.name.value.trim() && state.normalFile && (!isSearchable() || state.checkedFile) && state.manifestReady);
    ui.submit.disabled = !ready;
    ui.hint.textContent = !state.manifestReady ? "Loading the project asset catalog…" : !state.normalFile ? "Upload the normal image to continue." : isSearchable() && !state.checkedFile ? "Upload the checked image to continue." : !ui.name.value.trim() ? "Enter an asset name to continue." : "Ready to process and add this asset to your batch.";
    ui.createZip.disabled = state.batch.length === 0;
  }

  function showMessage(message, kind = "success") {
    ui.message.textContent = message;
    ui.message.classList.toggle("error", kind === "error");
  }

  function previewFile(file, role) {
    const isNormal = role === "normal";
    const preview = isNormal ? ui.normalPreview : ui.checkedPreview;
    const meta = isNormal ? ui.normalMeta : ui.checkedMeta;
    const previousUrl = isNormal ? state.normalUrl : state.checkedUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const url = URL.createObjectURL(file);
    if (isNormal) state.normalUrl = url; else state.checkedUrl = url;
    preview.replaceChildren();
    const image = document.createElement("img"); image.src = url; image.alt = `${role} sprite preview`; preview.append(image);
    const size = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    meta.textContent = `${file.name} · ${size}`;
  }

  function acceptFile(file, role) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { showMessage("Choose an image file.", "error"); return; }
    if (file.size > 30 * 1024 * 1024) { showMessage("That image is over 30 MB. Resize it before uploading.", "error"); return; }
    if (role === "normal") {
      state.normalFile = file;
      if (!ui.name.value.trim()) ui.name.value = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    } else state.checkedFile = file;
    previewFile(file, role); showMessage(""); updateReady();
  }

  ui.form.querySelectorAll('input[name="asset-type"]').forEach((input) => input.addEventListener("change", refreshType));
  ui.normalFile.addEventListener("change", () => acceptFile(ui.normalFile.files?.[0], "normal"));
  ui.checkedFile.addEventListener("change", () => acceptFile(ui.checkedFile.files?.[0], "checked"));
  ui.name.addEventListener("input", updateReady);
  [[$("normal-drop"), "normal"], [$("checked-drop"), "checked"]].forEach(([target, role]) => {
    target.addEventListener("dragover", (event) => { event.preventDefault(); target.classList.add("dragover"); });
    target.addEventListener("dragleave", () => target.classList.remove("dragover"));
    target.addEventListener("drop", (event) => { event.preventDefault(); target.classList.remove("dragover"); acceptFile(event.dataTransfer.files?.[0], role); });
  });

  function alphaBounds(canvas) {
    const { width, height } = canvas;
    const pixels = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, width, height).data;
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] < 8) continue;
      if (x < left) left = x; if (x > right) right = x;
      if (y < top) top = y; if (y > bottom) bottom = y;
    }
    if (right < left || bottom < top) throw new Error("The image appears fully transparent.");
    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  }

  async function decodeSource(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SOURCE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
    return { canvas, bounds: alphaBounds(canvas) };
  }

  function unionBounds(sources) {
    const left = Math.min(...sources.map((source) => source.bounds.x));
    const top = Math.min(...sources.map((source) => source.bounds.y));
    const right = Math.max(...sources.map((source) => source.bounds.x + source.bounds.width - 1));
    const bottom = Math.max(...sources.map((source) => source.bounds.y + source.bounds.height - 1));
    const padding = Math.max(2, Math.round(Math.max(right - left + 1, bottom - top + 1) * .006));
    const width = Math.max(1, right - left + 1 + padding * 2), height = Math.max(1, bottom - top + 1 + padding * 2);
    return { x: Math.max(0, left - padding), y: Math.max(0, top - padding), width, height };
  }

  function cropAndScale(source, crop) {
    const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(crop.width, crop.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(crop.width * scale)); canvas.height = Math.max(1, Math.round(crop.height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source.canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function encodeWebp(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("The browser could not encode this image."));
      if (blob.type !== "image/webp") return reject(new Error("This browser does not support transparent WebP encoding."));
      resolve(blob);
    }, "image/webp", .88));
  }

  function traceCollider(canvas) {
    const scale = Math.min(1, POLYGON_GRID / Math.max(canvas.width, canvas.height));
    const width = Math.max(2, Math.round(canvas.width * scale)), height = Math.max(2, Math.round(canvas.height * scale));
    const sample = document.createElement("canvas"); sample.width = width; sample.height = height;
    const context = sample.getContext("2d", { willReadFrequently: true }); context.drawImage(canvas, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const filled = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pixels[(y * width + x) * 4 + 3] > 20;
    const edges = [];
    const add = (ax, ay, bx, by, dir) => edges.push({ ax, ay, bx, by, dir, used: false });
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (!filled(x, y)) continue;
      if (!filled(x, y - 1)) add(x, y, x + 1, y, 0);
      if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
      if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
      if (!filled(x - 1, y)) add(x, y + 1, x, y, 3);
    }
    const key = (x, y) => `${x},${y}`;
    const outgoing = new Map();
    edges.forEach((edge, index) => { const start = key(edge.ax, edge.ay); if (!outgoing.has(start)) outgoing.set(start, []); outgoing.get(start).push(index); });
    const contours = [];
    for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
      if (edges[edgeIndex].used) continue;
      const first = edges[edgeIndex], points = [[first.ax, first.ay]]; let currentIndex = edgeIndex; let guard = 0;
      while (currentIndex != null && !edges[currentIndex].used && guard++ < edges.length + 2) {
        const current = edges[currentIndex]; current.used = true;
        if (current.bx === first.ax && current.by === first.ay) break;
        points.push([current.bx, current.by]);
        const candidates = (outgoing.get(key(current.bx, current.by)) || []).filter((index) => !edges[index].used);
        const turnPreference = [1, 0, 3, 2];
        candidates.sort((a, b) => turnPreference.indexOf((edges[a].dir - current.dir + 4) % 4) - turnPreference.indexOf((edges[b].dir - current.dir + 4) % 4));
        currentIndex = candidates[0];
      }
      if (points.length >= 3) contours.push(points);
    }
    const area = (points) => Math.abs(points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0));
    let contour = contours.sort((a, b) => area(b) - area(a))[0];
    if (!contour) return roundedRectCollider();
    const compact = contour.filter((point, index) => {
      const previous = contour[(index - 1 + contour.length) % contour.length], next = contour[(index + 1) % contour.length];
      return (point[0] - previous[0]) * (next[1] - point[1]) !== (point[1] - previous[1]) * (next[0] - point[0]);
    });
    contour = compact.length >= 3 ? compact : contour;
    if (contour.length > 48) contour = contour.filter((_, index) => index % Math.ceil(contour.length / 48) === 0);
    return { type: "polygon", points: contour.map(([x, y]) => [Number((x / width).toFixed(4)), Number((y / height).toFixed(4))]) };
  }

  function roundedRectCollider() {
    return { type: "polygon", points: [[.18,0],[.82,0],[1,.18],[1,.82],[.82,1],[.18,1],[0,.82],[0,.18]] };
  }

  function slugify(value) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game-prop"; }

  function uniqueId(base, usedIds, searchable) {
    let id = base, suffix = 2;
    while (usedIds.has(id) || (searchable && usedIds.has(`${id}-checked`))) {
      id = `${base}-${suffix++}`;
    }
    return id;
  }

  async function writeBlob(directory, filename, blob) {
    const handle = await directory.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable(); await writable.write(blob); await writable.close();
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let value = n; for (let k = 0; k < 8; k++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; table[n] = value >>> 0; }
    return table;
  })();

  function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
  function zipBundle(files) {
    const encoder = new TextEncoder(); const locals = []; const centrals = []; let offset = 0;
    const u16 = (view, index, value) => view.setUint16(index, value, true);
    const u32 = (view, index, value) => view.setUint32(index, value, true);
    for (const file of files) {
      const name = encoder.encode(file.name), data = file.data, checksum = crc32(data);
      const local = new Uint8Array(30 + name.length); const localView = new DataView(local.buffer);
      u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u16(localView, 6, 0); u16(localView, 8, 0); u16(localView, 10, 0); u16(localView, 12, 0x21);
      u32(localView, 14, checksum); u32(localView, 18, data.length); u32(localView, 22, data.length); u16(localView, 26, name.length); u16(localView, 28, 0); local.set(name, 30);
      locals.push(local, data);
      const central = new Uint8Array(46 + name.length); const centralView = new DataView(central.buffer);
      u32(centralView, 0, 0x02014b50); u16(centralView, 4, 20); u16(centralView, 6, 20); u16(centralView, 8, 0); u16(centralView, 10, 0); u16(centralView, 12, 0); u16(centralView, 14, 0x21);
      u32(centralView, 16, checksum); u32(centralView, 20, data.length); u32(centralView, 24, data.length); u16(centralView, 28, name.length); u16(centralView, 30, 0); u16(centralView, 32, 0); u16(centralView, 34, 0); u16(centralView, 36, 0); u32(centralView, 38, 0); u32(centralView, 42, offset); central.set(name, 46);
      centrals.push(central); offset += local.length + data.length;
    }
    const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22); const endView = new DataView(end.buffer);
    u32(endView, 0, 0x06054b50); u16(endView, 4, 0); u16(endView, 6, 0); u16(endView, 8, files.length); u16(endView, 10, files.length); u32(endView, 12, centralSize); u32(endView, 16, offset); u16(endView, 20, 0);
    return new Blob([...locals, ...centrals, end], { type: "application/zip" });
  }

  async function downloadBundle() {
    const fileRecords = [];
    for (const item of state.batch) {
      fileRecords.push({ name: `assets/furniture/${item.id}.webp`, data: new Uint8Array(await item.normal.arrayBuffer()) });
      if (item.checked) fileRecords.push({ name: `assets/furniture/${item.id}-checked.webp`, data: new Uint8Array(await item.checked.arrayBuffer()) });
    }
    fileRecords.push({ name: "assets/asset-manifest.json", data: new TextEncoder().encode(`${JSON.stringify(state.manifest, null, 2)}\n`) });
    const url = URL.createObjectURL(zipBundle(fileRecords)); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "roomscape-assets.zip"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function renderBatch() {
    ui.batchCount.textContent = String(state.batch.length);
    ui.batchNote.textContent = state.batch.length ? `${state.batch.length} asset${state.batch.length === 1 ? "" : "s"} staged. Add more or create the ZIP when ready.` : "Processed assets will appear here. You can add more before exporting.";
    ui.batchList.replaceChildren();
    for (const item of state.batch) {
      const row = document.createElement("li"); row.className = "batch-item";
      const preview = document.createElement("img"); preview.src = item.previewUrl; preview.alt = "";
      const details = document.createElement("div"); details.className = "batch-item-copy";
      const name = document.createElement("strong"); name.textContent = item.name;
      const meta = document.createElement("small"); meta.textContent = `${item.checked ? "Normal + checked" : "Decorative"} · ${formatBytes(item.totalBytes)} · ${item.savings}% smaller`;
      details.append(name, meta);
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-item"; remove.textContent = "Remove"; remove.setAttribute("aria-label", `Remove ${item.name} from batch`);
      remove.addEventListener("click", () => {
        state.batch = state.batch.filter((candidate) => candidate !== item); URL.revokeObjectURL(item.previewUrl);
        rebuildManifest(); renderBatch(); updateReady();
      });
      row.append(preview, details, remove); ui.batchList.append(row);
    }
    updateReady();
  }

  function formatBytes(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function rebuildManifest() {
    const manifest = structuredClone(state.baseManifest);
    if (!Array.isArray(manifest.assets)) manifest.assets = [];
    for (const item of state.batch) manifest.assets.push(...item.entries);
    state.manifest = manifest;
  }

  async function createZip() {
    if (!state.batch.length || ui.createZip.disabled) return;
    ui.createZip.disabled = true; ui.createZip.setAttribute("aria-busy", "true");
    ui.createZip.firstChild.textContent = "Building ZIP… ";
    try {
      await downloadBundle();
      showMessage(`ZIP created with ${state.batch.length} asset${state.batch.length === 1 ? "" : "s"}. Extract it into the prototype folder.`);
    } catch (error) {
      showMessage(error.message || "Could not create the ZIP.", "error");
    } finally {
      ui.createZip.firstChild.textContent = "Create ZIP "; ui.createZip.removeAttribute("aria-busy"); updateReady();
    }
  }
  ui.createZip.addEventListener("click", createZip);

  async function processAndSave(event) {
    event.preventDefault();
    if (ui.submit.disabled) return;
    ui.submit.disabled = true; ui.submit.setAttribute("aria-busy", "true"); ui.submit.querySelector("span").textContent = "Processing images…"; showMessage("");
    try {
      const searchable = isSearchable();
      const sources = [await decodeSource(state.normalFile)];
      if (searchable) sources.push(await decodeSource(state.checkedFile));
      const crop = unionBounds(sources);
      const outputs = sources.map((source) => cropAndScale(source, crop));
      const blobs = await Promise.all(outputs.map(encodeWebp));
      const collider = traceCollider(outputs[0]);
      const usedIds = new Set(state.manifest.assets.map((asset) => asset.id));
      const id = uniqueId(slugify(ui.name.value), usedIds, searchable);
      const checkedId = searchable ? `${id}-checked` : null;
      const normalCanvas = outputs[0];
      const requestedWidth = Math.max(24, Math.min(600, Number(ui.width.value) || 160));
      const requestedHeight = Math.max(8, Math.round(requestedWidth * normalCanvas.height / normalCanvas.width));
      const baseEntry = {
        id, name: ui.name.value.trim(), src: `assets/furniture/${id}.webp`,
        width: normalCanvas.width, height: normalCanvas.height,
        defaultSize: { width: requestedWidth, height: requestedHeight }, depthAnchor: .9,
        collider,
        ...(searchable ? { interaction: { type: "inspect", actionLabel: "Check", doneLabel: "Done", checkedAssetId: checkedId } } : {})
      };
      const entries = [baseEntry];
      if (searchable) entries.push({
        id: checkedId, name: `${ui.name.value.trim()} · checked`, src: `assets/furniture/${checkedId}.webp`,
        width: outputs[1].width, height: outputs[1].height,
        defaultSize: { width: requestedWidth, height: requestedHeight }, depthAnchor: .9,
        collider, variantOf: id, displayState: "checked", hideInDesigner: true
      });
      const before = state.normalFile.size + (searchable ? state.checkedFile.size : 0);
      const after = blobs.reduce((sum, blob) => sum + blob.size, 0);
      const savings = before ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;
      const previewUrl = URL.createObjectURL(blobs[0]);
      state.batch.push({ id, name: ui.name.value.trim(), normal: blobs[0], checked: searchable ? blobs[1] : null, entries, previewUrl, totalBytes: after, savings });
      rebuildManifest(); renderBatch();
      showMessage(`${ui.name.value.trim()} added to the batch · ${savings}% smaller than source. Add another asset or create your ZIP.`);
      ui.form.reset();
      for (const role of ["normal", "checked"]) {
        const isNormal = role === "normal";
        const previousUrl = isNormal ? state.normalUrl : state.checkedUrl;
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        if (isNormal) { state.normalFile = null; state.normalUrl = null; } else { state.checkedFile = null; state.checkedUrl = null; }
        const preview = isNormal ? ui.normalPreview : ui.checkedPreview;
        preview.replaceChildren(Object.assign(document.createElement("span"), { textContent: "No image selected" }));
        (isNormal ? ui.normalMeta : ui.checkedMeta).textContent = isNormal ? "Transparent edges will be trimmed automatically." : "Both states are trimmed on the same canvas bounds.";
      }
      refreshType();
      ui.submit.querySelector("span").textContent = "Add processed asset to batch";
      ui.submit.removeAttribute("aria-busy"); updateReady();
    } catch (error) {
      showMessage(error.message || "Could not process this asset.", "error");
      ui.submit.querySelector("span").textContent = "Add processed asset to batch"; ui.submit.removeAttribute("aria-busy"); updateReady();
    }
  }

  ui.form.addEventListener("submit", processAndSave);
  fetch("assets/asset-manifest.json", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("Could not load the asset catalog.");
    return response.json();
  }).then((manifest) => {
    state.baseManifest = structuredClone(manifest); state.manifest = structuredClone(manifest); state.manifestReady = true;
    updateReady();
  }).catch((error) => { showMessage(`${error.message} Open this page through the local web server.`, "error"); });
  refreshType();
  updateReady();
})();

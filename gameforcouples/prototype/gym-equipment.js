const RoomscapeGym = (() => {
  const ink = "#19232b";
  const steel = "#596d78";
  const silver = "#a8bbc3";
  const frame = "#35444e";
  const pad = "#286157";
  const seam = "#71a99a";
  const brass = "#f2b461";
  const shadow = "#151c25aa";

  function block(ctx, x, y, width, height, radius, color, outline = ink) {
    const right = x + width, bottom = y + height;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(right, y, right, bottom, r);
    ctx.arcTo(right, bottom, x, bottom, r);
    ctx.arcTo(x, bottom, x, y, r);
    ctx.arcTo(x, y, right, y, r);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.stroke();
    }
  }

  function line(ctx, x1, y1, x2, y2, color, width = 1.4) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function disc(ctx, x, y, rx, ry, color, outline = ink) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.7;
      ctx.stroke();
    }
  }

  function dumbbell(ctx, x, y, length, weight, stripe) {
    line(ctx, x + 3, y + 2, x + length - 3, y + 2, ink, 6);
    line(ctx, x + 3, y, x + length - 3, y, silver, 4);
    for (const offset of [0, length - 7]) {
      block(ctx, x + offset, y - weight / 2, 7, weight, 2, frame);
      line(ctx, x + offset + 2, y - weight / 2 + 2, x + offset + 5, y - weight / 2 + 2, stripe);
    }
  }

  function rack(ctx) {
    block(ctx, 9, 12, 149, 46, 8, shadow, null);
    block(ctx, 8, 11, 144, 42, 5, frame);
    block(ctx, 12, 8, 136, 25, 4, steel);
    block(ctx, 12, 33, 136, 15, 3, "#293841");
    line(ctx, 17, 11, 142, 11, silver);
    line(ctx, 16, 34, 144, 34, silver);
    for (let i = 0; i < 5; i++) {
      dumbbell(ctx, 17 + i * 25, 23, 20, 12 + i, brass);
      dumbbell(ctx, 17 + i * 25, 41, 20, 9 + i * 0.7, seam);
    }
    for (const x of [8, 142]) block(ctx, x, 45, 10, 9, 2, steel);
  }

  function benchPress(ctx, racked = true) {
    block(ctx, 9, 18, 112, 95, 12, shadow, null);
    for (const x of [15, 98]) {
      block(ctx, x, 12, 12, 55, 3, frame);
      block(ctx, x + 1, 13, 9, 44, 2, steel, null);
      block(ctx, x - 3, 56, 18, 10, 3, frame);
    }
    block(ctx, 42, 33, 42, 72, 6, frame);
    block(ctx, 44, 31, 38, 48, 6, pad);
    block(ctx, 45, 81, 36, 21, 5, pad);
    line(ctx, 50, 37, 76, 37, seam);
    line(ctx, 51, 86, 75, 86, seam);
    block(ctx, 33, 103, 60, 7, 3, steel);
    if (!racked) return;
    line(ctx, 7, 24, 118, 24, ink, 7);
    line(ctx, 8, 22, 117, 22, silver, 4);
    for (const x of [12, 91]) {
      block(ctx, x, 8, 10, 29, 3, "#b96150");
      block(ctx, x + 10, 11, 7, 23, 3, steel);
      line(ctx, x + 3, 12, x + 3, 30, brass);
    }
  }

  function treadmill(ctx) {
    block(ctx, 7, 11, 49, 104, 7, shadow, null);
    block(ctx, 5, 8, 46, 104, 7, frame);
    block(ctx, 12, 34, 32, 68, 4, "#182329");
    for (let y = 43; y < 100; y += 8) line(ctx, 15, y, 41, y, "#35454e");
    block(ctx, 5, 13, 7, 86, 3, steel);
    block(ctx, 44, 13, 7, 86, 3, steel);
    block(ctx, 4, 6, 48, 24, 5, frame);
    block(ctx, 17, 10, 22, 11, 2, "#579d91");
    line(ctx, 22, 16, 27, 16, "#c7f1d9");
    line(ctx, 31, 16, 35, 16, "#c7f1d9");
    disc(ctx, 12, 15, 2, 2, brass, null);
    disc(ctx, 44, 15, 2, 2, "#d48069", null);
  }

  function heavyBag(ctx) {
    disc(ctx, 34, 70, 27, 12, shadow, null);
    disc(ctx, 31, 69, 26, 11, frame);
    disc(ctx, 31, 66, 21, 8, steel);
    block(ctx, 27, 51, 8, 17, 2, frame);
    block(ctx, 14, 10, 34, 49, 12, "#9a4a47");
    block(ctx, 17, 8, 27, 44, 10, "#c7755c", null);
    disc(ctx, 31, 12, 12, 5, "#de987d");
    line(ctx, 17, 39, 44, 39, "#763e40", 3);
    line(ctx, 24, 19, 24, 31, "#efae90", 2);
  }

  function plates(ctx) {
    block(ctx, 5, 45, 42, 12, 5, shadow, null);
    block(ctx, 4, 40, 41, 14, 4, frame);
    block(ctx, 20, 9, 8, 36, 3, steel);
    for (const [x, y, color] of [[13, 40, "#786792"], [33, 39, "#b96150"], [22, 25, "#537e92"]]) {
      disc(ctx, x, y, 11, 12, color);
      disc(ctx, x, y, 7, 8, frame);
      disc(ctx, x, y, 3, 3, silver);
    }
  }

  function mat(ctx) {
    block(ctx, 5, 6, 53, 99, 6, shadow, null);
    block(ctx, 3, 3, 53, 99, 5, "#39776e");
    block(ctx, 7, 7, 45, 91, 3, "#4c8d81", seam);
    for (let y = 14; y < 98; y += 8) line(ctx, 10, y, 49, y, "#73a596", 0.65);
    line(ctx, 14, 22, 44, 22, "#b4c9a8", 1.7);
  }

  function handWeights(ctx) {
    dumbbell(ctx, 5, 9, 24, 11, brass);
    dumbbell(ctx, 23, 22, 25, 12, seam);
  }

  const equipment = [
    ["gym-dumbbell-rack", "Dumbbell rack", 160, 60, rack, [[.05,.20],[.95,.20],[.95,.87],[.05,.87]]],
    ["gym-bench-press", "Bench press", 126, 116, benchPress, [[.10,.12],[.89,.12],[.89,.57],[.66,.61],[.66,.94],[.30,.94],[.30,.61],[.10,.57]]],
    ["gym-treadmill", "Treadmill", 58, 118, treadmill, [[.09,.08],[.89,.08],[.89,.92],[.09,.92]]],
    ["gym-heavy-bag", "Punching bag", 64, 85, heavyBag, [[.25,.66],[.75,.66],[.9,.80],[.75,.93],[.25,.93],[.09,.80]]],
    ["gym-plate-stand", "Weight plate stand", 50, 60, plates, [[.10,.48],[.89,.48],[.89,.88],[.10,.88]]],
    ["gym-mat", "Exercise mat", 60, 108, mat],
    ["gym-hand-weights", "Hand weights", 54, 31, handWeights]
  ];

  const exercises = {
    curls: { name: "Dumbbell curls", stand: [.5, 1.38], duration: 3, reps: 3 },
    press: {
      name: "Bench press", stand: [.5, 1.24], onMachine: [.5, 128 / 116],
      displaySize: [96 / 126, 128 / 116], duration: 4.5, reps: 3
    },
    run: { name: "Treadmill run", stand: [.5, 1.19], onMachine: [.5, .84], duration: 4, reps: 10 },
    boxing: { name: "Punching bag", stand: [1.14, .94], duration: 3, reps: 5 },
    squats: { name: "Weighted squats", stand: [.5, 1.29], duration: 4.5, reps: 3 },
    pushups: { name: "Push-ups", stand: [.5, 1.12], onMachine: [.5, .83], displaySize: [1, .74], duration: 4.5, reps: 3 },
    situps: { name: "Sit-ups", stand: [.5, 1.12], onMachine: [.5, .83], displaySize: [1, .74], duration: 4.5, reps: 3 },
    shoulders: { name: "Shoulder press", stand: [.5, 1.47], hideEquipment: true, duration: 4.5, reps: 3 }
  };
  const equipmentExercises = {
    "gym-dumbbell-rack": "curls", "gym-bench-press": "press", "gym-treadmill": "run",
    "gym-heavy-bag": "boxing", "gym-plate-stand": "squats",
    "gym-mat": "pushups", "gym-hand-weights": "shoulders"
  };

  function equipmentCanvas(width, height, draw) {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    draw(ctx);
    return canvas;
  }

  function createAssets() {
    return equipment.map(([id, name, width, height, draw, points]) => {
      const canvas = equipmentCanvas(width, height, draw);
      return {
        id, name, canvas, width: canvas.width, height: canvas.height,
        defaultSize: { width, height }, exercise: equipmentExercises[id], collidable: Boolean(points),
        inUseCanvas: draw === benchPress ? equipmentCanvas(width, height, (ctx) => benchPress(ctx, false)) : undefined,
        drawInFrontOfCharacters: id === "gym-heavy-bag",
        collider: points && { type: "polygon", points }
      };
    });
  }

  return { createAssets, exercises };
})();

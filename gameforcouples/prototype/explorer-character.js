/* Original 2D character art. Only the pose changes between the atlas frames. */
const RoomscapeExplorer = (() => {
  const ink = "#34262a";
  const width = 96;
  const height = 128;
  const scale = 1.5;
  const walkFrameCount = 12;
  const walkFps = 16;
  const kickFrameCount = 13;
  const kickFps = 20;
  const fullKickFrameCount = 17;
  const fullKickFps = 22;
  const slapFrameCount = 13;
  const slapFps = 24;
  const puffFrameCount = 15;
  const puffFps = 20;
  const columns = 7;
  const tau = 2 * Math.PI;

  const kickPoses = [
    { at: 0, footX: 39, footY: 120, kneeX: 42, kneeY: 101, shoe: 0, lean: 0, bounce: 0, nearArm: 0, farArm: 0 },
    { at: 0.16, footX: 35, footY: 117, kneeX: 43, kneeY: 102, shoe: 0.12, lean: 0.06, bounce: 1.8, nearArm: 4, farArm: -4 },
    { at: 0.34, footX: 46, footY: 99, kneeX: 58, kneeY: 84, shoe: 0.25, lean: -0.11, bounce: -0.8, nearArm: -9, farArm: 6 },
    { at: 0.50, footX: 79, footY: 83, kneeX: 60, kneeY: 81, shoe: -0.20, lean: -0.17, bounce: -1.2, nearArm: -14, farArm: 10 },
    { at: 0.59, footX: 77, footY: 85, kneeX: 60, kneeY: 82, shoe: -0.11, lean: -0.14, bounce: -1, nearArm: -13, farArm: 8 },
    { at: 0.78, footX: 52, footY: 104, kneeX: 57, kneeY: 91, shoe: 0.12, lean: -0.05, bounce: 0.5, nearArm: -5, farArm: 3 },
    { at: 1, footX: 39, footY: 120, kneeX: 42, kneeY: 101, shoe: 0, lean: 0, bounce: 0, nearArm: 0, farArm: 0 }
  ];
  const fullKickPoses = [
    kickPoses[0],
    { at: 0.16, footX: 31, footY: 118, kneeX: 40, kneeY: 103, shoe: 0.18, lean: 0.1, bounce: 3.2, nearArm: 7, farArm: -7 },
    { at: 0.32, footX: 44, footY: 91, kneeX: 58, kneeY: 76, shoe: 0.28, lean: -0.21, bounce: -1, nearArm: -11, farArm: 10 },
    { at: 0.44, footX: 80, footY: 67, kneeX: 60, kneeY: 74, shoe: -0.36, lean: -0.39, bounce: -2.2, nearArm: -20, farArm: 15 },
    { at: 0.57, footX: 79, footY: 70, kneeX: 60, kneeY: 75, shoe: -0.31, lean: -0.34, bounce: -2, nearArm: -17, farArm: 13 },
    { at: 0.76, footX: 55, footY: 105, kneeX: 55, kneeY: 91, shoe: 0.19, lean: -0.08, bounce: 0.8, nearArm: -6, farArm: 4 },
    kickPoses[kickPoses.length - 1]
  ];
  const slapPoses = [
    { at: 0, handX: 37, handY: 82, elbowX: 37, elbowY: 73, angle: 1.5, lean: 0, bounce: 0, farArm: 0 },
    { at: 0.25, handX: 22, handY: 58, elbowX: 29, elbowY: 70, angle: -2.0, lean: -0.13, bounce: 1, farArm: -3 },
    { at: 0.38, handX: 34, handY: 50, elbowX: 29, elbowY: 62, angle: -1.0, lean: -0.08, bounce: 0, farArm: -5 },
    { at: 0.50, handX: 77, handY: 61, elbowX: 57, elbowY: 64, angle: -0.38, lean: 0.11, bounce: -0.8, farArm: -9 },
    { at: 0.63, handX: 73, handY: 71, elbowX: 58, elbowY: 68, angle: 0.25, lean: 0.1, bounce: 0, farArm: -6 },
    { at: 1, handX: 37, handY: 82, elbowX: 37, elbowY: 73, angle: 1.5, lean: 0, bounce: 0, farArm: 0 }
  ];
  const puffPoses = [
    { at: 0, bounce: 0, lean: 0, kneeX: 42, nearArm: 0, farArm: 0 },
    { at: 0.22, bounce: 7.5, lean: 0.34, kneeX: 35, nearArm: 4, farArm: -5 },
    { at: 0.35, bounce: 8.5, lean: 0.38, kneeX: 33, nearArm: 3, farArm: -4 },
    { at: 0.46, bounce: 5.5, lean: 0.27, kneeX: 36, nearArm: 1, farArm: -3 },
    { at: 0.62, bounce: 7, lean: 0.33, kneeX: 35, nearArm: 3, farArm: -4 },
    { at: 0.87, bounce: 0, lean: 0, kneeX: 42, nearArm: 0, farArm: 0 },
    { at: 1, bounce: 0, lean: 0, kneeX: 42, nearArm: 0, farArm: 0 }
  ];

  const art = {
    backpack: new Path2D("M38 56 Q29 52 25 59 Q20 68 24 81 Q28 86 38 83 L43 71Z"),
    backpackPocket: new Path2D("M24 69 Q27 66 32 68 L34 78 Q30 81 25 78Z"),
    jacket: new Path2D("M45 53 Q56 51 64 57 Q67 65 65 73 L67 84 Q53 91 34 85 L34 67 Q36 58 45 53Z"),
    jacketShade: new Path2D("M37 63 Q38 75 43 80 Q54 85 66 79 L67 84 Q53 91 34 85 L34 67Z"),
    hood: new Path2D("M40 49 Q34 48 33 55 Q35 62 44 63 L55 60 Q63 60 65 55 L60 52Z"),
    collar: new Path2D("M46 53 Q56 54 63 53 L57 61Z"),
    pocket: new Path2D("M46 73 L49 71 L57 72 L60 76 L59 81 Q52 83 45 80Z"),
    zipper: new Path2D("M57 61 Q60 70 61 83"),
    neck: new Path2D("M47 47 L60 48 L60 56 Q54 60 47 55Z"),
    face: new Path2D("M29 34 Q29 20 45 17 L59 17 Q72 18 75 32 Q76 37 78 39 Q81 42 78 45 Q79 51 72 55 Q67 59 59 59 Q47 59 41 53 L32 48Z"),
    cheekShade: new Path2D("M32 38 Q40 50 51 54 Q65 58 75 51 Q71 57 62 58 Q49 59 41 53 L32 48Z"),
    hair: new Path2D("M34 49 Q25 47 24 40 L21 43 Q20 34 25 29 L21 29 Q24 21 33 18 L28 16 Q37 12 46 14 Q45 10 40 8 Q52 7 59 15 Q64 11 70 13 L67 17 Q76 18 79 26 Q80 33 75 38 Q74 29 68 27 Q62 34 51 35 L55 30 Q48 35 43 34 L40 43 Q35 41 34 49Z"),
    hairLight: new Path2D("M25 31 Q30 21 45 19 L37 17 Q48 15 57 21 Q53 15 49 12 Q59 15 62 22 Q67 18 72 22 Q67 23 65 26 Q59 30 53 31 L56 26 Q46 33 38 31 Q42 27 46 25 Q33 25 25 31Z"),
    hairStrand: new Path2D("M28 37 Q33 30 41 29 M48 25 Q56 23 59 24"),
    brows: new Path2D("M52 37 Q55.5 33.5 61 35 M68 35 Q71 32.9 74 34.6"),
    angryBrows: new Path2D("M51.7 35.2 L62.9 40.6 M68.4 39.5 L74.5 33.8"),
    nearEye: new Path2D("M52 43 C52.5 39.4 55 37.7 58.6 38 C62 38.2 64 40.8 63.3 44.2 C62.3 47.2 57 48.1 54 46.4 Q51.9 45.2 52 43Z"),
    farEye: new Path2D("M68 41.7 C68.4 38.5 70 37.1 72.2 37.4 C74.3 37.6 75.5 39.7 75.1 42.2 Q74.5 45.4 71.1 45.5 Q67.8 45 68 41.7Z"),
    eyelids: new Path2D("M52 43 C52.5 39.4 55 37.7 58.6 38 C61.7 38.2 63.5 40.2 63.4 42.3 M68 41.7 C68.4 38.5 70 37.1 72.2 37.4 Q74.6 37.7 75.1 40"),
    earFold: new Path2D("M35.5 45 Q37.5 42.5 40 44.2 Q37.6 44.7 38.7 47.2"),
    mouth: new Path2D("M64 50.2 Q66.7 49.8 69.5 50"),
    angryMouth: new Path2D("M62.4 53 Q65.5 47.6 70.6 50"),
    nose: new Path2D("M73.6 44.3 Q75.5 45.5 77.2 43.6"),
    kickTrail: new Path2D("M64 96 Q82 91 92 77 M75 96 Q84 93 90 86"),
    slapTrail: new Path2D("M49 52 Q70 46 86 54 M59 48 Q72 43 81 47"),
    openHand: new Path2D("M-3-3 L3-4 L5-7 Q7-8 7-5 L6-3 L12-3 Q14-3 14-1 Q14 0 12 0 L13 1 Q15 2 12 3 L10 3 Q12 5 9 6 L4 5 Q-2 5-3 2Z"),
    palmFold: new Path2D("M1 0 Q4 0 6 2 M8 0 L11 1"),
    puffCloud: new Path2D("M-9 1 Q-12-3-7-5 Q-7-9-2-9 Q1-9 3-6 Q10-8 10-2 Q13 2 8 5 Q6 9 1 6 Q-4 9-7 5 Q-11 5-9 1Z"),
    puffSwirl: new Path2D("M-5 0 Q-5-4-1-4 Q3-4 3-1 Q3 2 0 2"),
    shoe: new Path2D("M-6-5 Q-3-7 2-6 L7-3 Q12-3 13 1 L12 4 Q4 7-7 4 Q-9 2-6-5Z"),
    sole: new Path2D("M-7 2 Q2 5 13 1 L12 4 Q4 7-7 4Z"),
    laces: new Path2D("M2-3 L5-1 M5-4 L8-2")
  };

  function paint(ctx, path, color, outline = 0) {
    if (color) {
      ctx.fillStyle = color;
      ctx.fill(path);
    }
    if (outline) stroke(ctx, path, ink, outline);
  }

  function stroke(ctx, path, color, weight) {
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke(path);
  }

  function ellipse(ctx, x, y, rx, ry, color, outline = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, tau);
    ctx.fillStyle = color;
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = outline;
      ctx.stroke();
    }
  }

  function softShadow(ctx, x, y, rx, ry, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    fade.addColorStop(0, `rgba(26, 31, 43, ${opacity})`);
    fade.addColorStop(0.45, `rgba(26, 31, 43, ${opacity * 0.66})`);
    fade.addColorStop(1, "rgba(26, 31, 43, 0)");
    ellipse(ctx, 0, 0, 1, 1, fade);
    ctx.restore();
  }

  function drawFootShadow(ctx, foot) {
    // The shadow stays on the floor as the shoe lifts above it.
    softShadow(ctx, foot.x + 2, foot.groundY + 4, 12 + 2 * foot.lift, 3.6, 0.62 - 0.49 * foot.lift);
  }

  function limb(ctx, start, joint, end, color, width, bent = false) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    if (bent) {
      // Round the corner of the raised knee without flattening the bend.
      ctx.lineTo(joint.x + (start.x - joint.x) * 0.2, joint.y + (start.y - joint.y) * 0.2);
      ctx.quadraticCurveTo(joint.x, joint.y, joint.x + (end.x - joint.x) * 0.2, joint.y + (end.y - joint.y) * 0.2);
      ctx.lineTo(end.x, end.y);
    } else {
      ctx.quadraticCurveTo(joint.x, joint.y, end.x, end.y);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = width + 3.4;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function legPose(phase, x, groundY, walking) {
    if (!walking) return { x, y: groundY, groundY, lift: 0, angle: 0 };

    const progress = phase % 1;
    const stride = 15;
    const stance = 0.59;
    if (progress < stance) {
      // While planted, the foot travels back relative to the moving body.
      return { x: x + stride * (1 - 2 * progress / stance), y: groundY, groundY, lift: 0, angle: 0 };
    }

    const swing = (progress - stance) / (1 - stance);
    const eased = swing * swing * (3 - 2 * swing);
    const lift = Math.sin(Math.PI * swing);
    return { x: x + stride * (2 * eased - 1), y: groundY - 9 * lift, groundY, lift, angle: -0.28 * lift };
  }

  function drawLeg(ctx, hip, foot, near) {
    const knee = foot.knee || {
      x: (hip.x + foot.x) / 2 + 2 + 6 * foot.lift,
      y: (hip.y + foot.y) / 2 - 3 * foot.lift
    };
    const ankle = { x: foot.x, y: foot.y - 3 };
    limb(ctx, hip, knee, ankle, near ? "#3e596d" : "#293d51", near ? 10 : 8, Boolean(foot.knee));
    ellipse(ctx, ankle.x, ankle.y - 1, near ? 5 : 4, 3, near ? "#73909f" : "#516c7e", 1.3);
    ctx.save();
    ctx.translate(foot.x, foot.y);
    ctx.rotate(foot.angle);
    paint(ctx, art.shoe, near ? "#a76340" : "#7b4a38", 2);
    paint(ctx, art.sole, near ? "#f2d4a1" : "#c9ad86");
    stroke(ctx, art.laces, near ? "#f1c07d" : "#d29a6a", 1.4);
    ctx.restore();
  }

  function drawArm(ctx, shoulder, swing, near) {
    const elbow = { x: shoulder.x - 3 + swing * 0.38, y: shoulder.y + 12 };
    const hand = {
      x: shoulder.x - 3 + swing,
      y: shoulder.y + 21 - Math.abs(swing) * 0.26
    };
    limb(ctx, shoulder, elbow, hand, near ? "#f8ba46" : "#c98d33", near ? 9 : 7);
    ellipse(ctx, hand.x, hand.y + 3, near ? 4.8 : 3.7, near ? 5.3 : 4.4, near ? "#edb086" : "#d59471", 1.7);
    if (near) ellipse(ctx, hand.x + 2.7, hand.y + 1.5, 2.1, 3, "#f5c29a");
  }

  function drawSlapArm(ctx, shoulder, { elbow, hand, angle }) {
    limb(ctx, shoulder, elbow, hand, "#f8ba46", 9, true);
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);
    paint(ctx, art.openHand, "#f4bd94", 1.65);
    stroke(ctx, art.palmFold, "#cb8869", 1.05);
    ctx.restore();
  }

  function drawHead(ctx, angry = false, tilt = 0) {
    ctx.save();
    if (tilt) {
      ctx.translate(55, 55);
      ctx.rotate(tilt);
      ctx.translate(-55, -55);
    }
    const skin = ctx.createLinearGradient(51, 35, 61, 59);
    skin.addColorStop(0, "#ffdab5");
    skin.addColorStop(1, "#f0b486");
    paint(ctx, art.face, skin, 2.5);
    paint(ctx, art.cheekShade, "#e9aa84");
    paint(ctx, art.hair, "#62402f", 2.5);
    paint(ctx, art.hairLight, "#9b6039");
    stroke(ctx, art.hairStrand, "#b87843", 1.7);
    ellipse(ctx, 38, 45, 5.1, 5.4, "#f4c098", 1.9);
    stroke(ctx, art.earFold, "#ca8266", 1.5);
    if (!angry) stroke(ctx, art.brows, "#67402e", 2.15);
    paint(ctx, art.nearEye, "#fff7e8");
    paint(ctx, art.farEye, "#fff7e8");
    ellipse(ctx, 59.5, 42.5, 3.35, 3.9, "#935434");
    ellipse(ctx, 72.5, 41.6, 2.35, 3.25, "#935434");
    ellipse(ctx, 59.8, 42.1, 2.2, 3, ink);
    ellipse(ctx, 72.8, 41.2, 1.5, 2.45, ink);
    ellipse(ctx, 59, 40.5, 0.95, 1.05, "#fff9ec");
    ellipse(ctx, 72.15, 39.8, 0.7, 0.85, "#fff9ec");
    stroke(ctx, art.eyelids, "#5e3b32", 1.45);
    if (angry) stroke(ctx, art.angryBrows, "#4d2c26", 3.2);
    ellipse(ctx, 51.5, 48.3, 4, 1.9, "#eba383");
    ellipse(ctx, 50.2, 47.5, 0.65, 0.62, "#ad6d52");
    ellipse(ctx, 52.1, 47.3, 0.6, 0.58, "#ad6d52");
    ellipse(ctx, 54, 47.9, 0.52, 0.5, "#ad6d52");
    ellipse(ctx, 75.2, 45.9, 1.9, 1.2, "#eba383");
    stroke(ctx, art.nose, "#b9775c", 1.15);
    stroke(ctx, angry ? art.angryMouth : art.mouth, "#805141", angry ? 2.2 : 1.55);
    ctx.restore();
  }

  function drawWalkPose(ctx, phase, walking) {
    const step = walking ? Math.cos(phase * tau) : 0;
    drawPose(ctx, {
      bounce: walking ? -0.85 * (1 - step * step) : 0,
      farFoot: legPose(phase + 0.5, 55, 112, walking),
      nearFoot: legPose(phase, 39, 120, walking),
      farArm: 8 * step,
      nearArm: -11 * step
    });
  }

  function poseValues(poses, progress) {
    const next = poses.findIndex((pose) => pose.at >= progress);
    const from = poses[next - 1];
    const to = poses[next];
    const t = (progress - from.at) / (to.at - from.at);
    const eased = t * t * (3 - 2 * t);
    return (name) => from[name] + (to[name] - from[name]) * eased;
  }

  function drawKickPose(ctx, poses, progress, full) {
    const value = poseValues(poses, progress);
    const footY = value("footY");
    drawPose(ctx, {
      angry: full,
      trail: full ? Math.max(0, 1 - Math.abs(progress - 0.48) / 0.13) : 0,
      bounce: value("bounce"),
      lean: value("lean"),
      farFoot: legPose(0, 55, 112, false),
      nearFoot: {
        x: value("footX"), y: footY, groundY: 120,
        lift: Math.min(1, (120 - footY) / 24),
        angle: value("shoe"),
        knee: { x: value("kneeX"), y: value("kneeY") }
      },
      nearArm: value("nearArm"),
      farArm: value("farArm")
    });
  }

  function drawSlapPose(ctx, progress) {
    const value = poseValues(slapPoses, progress);
    drawPose(ctx, {
      farFoot: legPose(0, 55, 112, false),
      nearFoot: legPose(0, 39, 120, false),
      farArm: value("farArm"),
      bounce: value("bounce"),
      lean: value("lean"),
      trail: Math.max(0, 1 - Math.abs(progress - 0.5) / 0.13),
      slapArm: {
        elbow: { x: value("elbowX"), y: value("elbowY") },
        hand: { x: value("handX"), y: value("handY") },
        angle: value("angle")
      }
    });
  }

  function drawPuffPose(ctx, progress) {
    const value = poseValues(puffPoses, progress);
    const lean = value("lean");
    drawPose(ctx, {
      bounce: value("bounce"),
      lean,
      headTilt: -0.7 * lean,
      farFoot: legPose(0, 55, 112, false),
      nearFoot: { ...legPose(0, 39, 120, false), knee: { x: value("kneeX"), y: 102 } },
      nearArm: value("nearArm"),
      farArm: value("farArm"),
      puff: (progress - 0.32) / 0.56
    });
  }

  function drawPuffCloud(ctx, progress) {
    const size = 0.38 + 0.59 * progress;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, progress * 7, (1 - progress) * 3);
    ctx.translate(30 - 17 * progress, 91 - 11 * progress);
    ctx.scale(size, size);
    paint(ctx, art.puffCloud, "#dce89e", 1.8);
    stroke(ctx, art.puffSwirl, "#8e9b5e", 1.3);
    ellipse(ctx, 10, 6, 2.2, 1.8, "#dce89e", 1.25);
    ellipse(ctx, -8, 9, 1.7, 1.4, "#dce89e", 1.1);
    ctx.restore();
  }

  function drawPose(ctx, { farFoot, nearFoot, farArm, nearArm, bounce, lean = 0, headTilt = 0, angry = false, trail = 0, slapArm, puff = 0 }) {
    softShadow(ctx, 50, 119.5, 24, 8.5, 0.31);
    drawFootShadow(ctx, farFoot);
    drawFootShadow(ctx, nearFoot);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (puff > 0 && puff < 1) drawPuffCloud(ctx, puff);
    if (trail > 0) {
      const path = slapArm ? art.slapTrail : art.kickTrail;
      stroke(ctx, path, `rgba(96, 58, 36, ${trail * 0.6})`, 4.8);
      stroke(ctx, path, `rgba(255, 219, 132, ${trail})`, 2.8);
    }
    drawLeg(ctx, { x: 54, y: 81 + bounce }, farFoot, false);
    drawLeg(ctx, { x: 41, y: 83 + bounce }, nearFoot, true);
    ctx.translate(47, 83 + bounce);
    ctx.rotate(lean);
    ctx.translate(-47, -83);
    paint(ctx, art.backpack, "#437a73", 2.5);
    paint(ctx, art.backpackPocket, "#6b9e88", 1.4);
    drawArm(ctx, { x: 63, y: 60 }, farArm, false);
    paint(ctx, art.jacket, "#ffc951", 2.5);
    paint(ctx, art.jacketShade, "#e39b32");
    paint(ctx, art.pocket, "#ffd76b");
    stroke(ctx, art.zipper, "#9a5f36", 1.65);
    ellipse(ctx, 57.7, 63, 1.4, 2, "#524338");
    const nearShoulder = { x: 40, y: 61 };
    if (slapArm) drawSlapArm(ctx, nearShoulder, slapArm);
    else drawArm(ctx, nearShoulder, nearArm, true);
    paint(ctx, art.neck, "#e5a481", 1.9);
    paint(ctx, art.hood, "#ffd363", 2.2);
    paint(ctx, art.collar, "#568d81");
    drawHead(ctx, angry, headTilt);
  }

  function createAtlas() {
    const canvas = document.createElement("canvas");
    const frameWidth = width * scale;
    const frameHeight = height * scale;
    const padding = 1;
    const cellWidth = frameWidth + 2 * padding;
    const cellHeight = frameHeight + 2 * padding;
    const actionFrameCount = [kickFrameCount, fullKickFrameCount, slapFrameCount, puffFrameCount]
      .reduce((total, count) => total + count - 2, 0);
    const frameCount = 1 + walkFrameCount + actionFrameCount;
    canvas.width = cellWidth * columns;
    canvas.height = cellHeight * Math.ceil(frameCount / columns);
    const ctx = canvas.getContext("2d");
    const frames = [];

    function addFrame(draw) {
      const index = frames.length;
      const x = index % columns * cellWidth + padding;
      const y = Math.floor(index / columns) * cellHeight + padding;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      // Keep each pose inside its frame and leave transparent pixels for texture filtering.
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.clip();
      draw();
      ctx.restore();
      frames.push({ x, y, width: frameWidth, height: frameHeight });
      return index;
    }

    const idleFrame = addFrame(() => drawWalkPose(ctx, 0, false));
    const walkFrames = [];
    for (let step = 0; step < walkFrameCount; step++) {
      const phase = (0.25 + step / walkFrameCount) % 1;
      walkFrames.push(addFrame(() => drawWalkPose(ctx, phase, true)));
    }
    function addActionFrames(count, draw) {
      const sequence = [idleFrame];
      for (let step = 1; step < count - 1; step++) {
        sequence.push(addFrame(() => draw(ctx, step / (count - 1))));
      }
      sequence.push(idleFrame);
      return sequence;
    }

    const kickFrames = addActionFrames(kickFrameCount, (ctx, progress) => drawKickPose(ctx, kickPoses, progress, false));
    const fullKickFrames = addActionFrames(fullKickFrameCount, (ctx, progress) => drawKickPose(ctx, fullKickPoses, progress, true));
    const slapFrames = addActionFrames(slapFrameCount, drawSlapPose);
    const puffFrames = addActionFrames(puffFrameCount, drawPuffPose);
    return {
      canvas, frames, idleFrame, walkFrames, walkFps,
      kickFrames, kickFps, fullKickFrames, fullKickFps,
      slapFrames, slapFps, puffFrames, puffFps
    };
  }

  return { createAtlas };
})();

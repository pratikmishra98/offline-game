/* Original 2D character art. Only the pose changes between the atlas frames. */
const RoomscapeExplorer = (() => {
  const ink = "#34262a";
  const width = 96;
  const height = 128;
  const scale = 1.5;
  const runFrameCount = 12;
  const runFps = 26;
  const grabContactAt = 0.42;
  const throwReleaseAt = 0.28;
  const columns = 10;
  const tau = 2 * Math.PI;
  const nearCarryArm = { elbow: { x: 27, y: 37 }, hand: { x: 29, y: 12 }, angle: -0.38 };
  const farCarryArm = { elbow: { x: 80, y: 37 }, hand: { x: 74, y: 12 }, angle: -2.75 };

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
  const punchPoses = [
    slapPoses[0],
    { at: 0.24, handX: 39, handY: 65, elbowX: 32, elbowY: 74, angle: 0, lean: -0.08, bounce: 0, farArm: -4 },
    { at: 0.43, handX: 82, handY: 60, elbowX: 61, elbowY: 62, angle: 0, lean: 0.13, bounce: -0.6, farArm: -7 },
    { at: 0.56, handX: 77, handY: 61, elbowX: 59, elbowY: 64, angle: 0, lean: 0.1, bounce: 0, farArm: -5 },
    slapPoses.at(-1)
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
    screwEye: new Path2D("M-4-2 L2 0 L-4 2"),
    gymBrow: new Path2D("M-4 0 Q0-1.5 4 0"),
    gymTeeth: new Path2D("M-6-2 Q0-5 6-2 L5 2 Q0 4-6 2Z"),
    gymTongue: new Path2D("M0 0 Q3 1 6-1 L6 3 Q5 8 1 6 Q-1 5 0 0Z"),
    gymSweat: new Path2D("M0-4 Q5 0 3 3 Q0 6-2 3 Q-3 1 0-4Z"),
    benchHoodie: new Path2D("M37 57 Q47 52 59 57 L64 66 Q62 76 59 85 Q49 89 35 84 L32 67Z"),
    benchHoodieShade: new Path2D("M57 58 L64 66 Q62 76 59 85 Q53 88 47 87 Q55 79 57 58Z"),
    benchZipper: new Path2D("M48 60 Q45 74 48 85"),
    rearJacket: new Path2D("M34 56 Q48 51 62 56 Q69 60 66 70 L64 85 Q48 91 32 85 L30 70 Q28 60 34 56Z"),
    rearJacketShade: new Path2D("M60 59 Q67 61 66 70 L64 85 Q48 91 32 85 L33 80 Q48 85 58 81Z"),
    rearHood: new Path2D("M34 53 Q48 49 62 53 L65 61 Q62 70 48 73 Q35 70 31 61Z"),
    rearHoodSeam: new Path2D("M48 59 Q45 66 48 70"),
    rearHair: new Path2D("M25 51 Q20 46 22 38 L18 40 Q19 30 25 26 L21 26 Q28 19 37 21 L32 16 Q43 15 49 20 L47 14 Q57 15 62 23 Q68 20 74 25 L70 27 Q80 31 77 41 L74 39 Q78 49 70 53 L68 49 Q63 60 53 58 L48 60 L44 56 Q35 59 29 50 L29 54Z"),
    rearHairLight: new Path2D("M24 36 Q30 23 44 25 L39 22 Q50 23 56 30 Q54 22 51 19 Q61 22 65 31 Q68 27 72 30 Q62 34 58 41 Q51 32 45 34 Q48 39 44 43 Q37 35 30 39 L33 32Z"),
    rearHairStrand: new Path2D("M30 44 Q36 39 43 47 M53 45 Q59 38 67 36"),
    rearShoe: new Path2D("M-6 2 L-6-5 Q-5-11 0-11 Q5-11 6-5 L6 2 Q6 6 0 6 Q-6 6-6 2Z"),
    rearShoeHeel: new Path2D("M-5 1 Q0 3 5 1 L5 3 Q3 6-3 5 Q-5 4-5 1Z"),
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
    slyGrin: new Path2D("M-7 0 Q-1 2 7-4 Q6 4-1 4 Q-5 4-7 0Z"),
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

  function standingFoot(x, groundY) {
    return { x, y: groundY, groundY, lift: 0, angle: 0 };
  }

  function runningFoot(phase, x, groundY) {
    const progress = phase % 1;
    const stride = 23;
    const stance = 0.38;
    if (progress < stance) {
      const contact = progress / stance;
      const angle = -0.28 + 0.66 * contact;
      return {
        x: x + stride * (1 - 2 * contact),
        y: groundY - 9 * Math.max(0, angle),
        groundY, lift: 0, angle
      };
    }

    // Contact lasts less than half a cycle, leaving a brief airborne phase between steps.
    const swing = (progress - stance) / (1 - stance);
    const lift = Math.sin(Math.PI * swing);
    return {
      x: x - stride * Math.cos(Math.PI * swing),
      y: groundY - 23 * lift - 3.42 * (1 - swing),
      groundY, lift,
      angle: -0.28 + 0.66 * Math.cos(Math.PI * swing / 2)
    };
  }

  function legKnee(hip, foot) {
    return foot.knee || {
      x: (hip.x + foot.x) / 2 + 2 + 6 * foot.lift,
      y: (hip.y + foot.y) / 2 - 3 * foot.lift
    };
  }

  function drawLeg(ctx, hip, foot, near) {
    const ankle = { x: foot.x, y: foot.y - 3 };
    limb(ctx, hip, legKnee(hip, foot), ankle, near ? "#3e596d" : "#293d51", near ? 10 : 8, Boolean(foot.knee));
    ellipse(ctx, ankle.x, ankle.y - 1, near ? 5 : 4, 3, near ? "#73909f" : "#516c7e", 1.3);
    ctx.save();
    ctx.translate(foot.x, foot.y);
    if (foot.facingLeft) ctx.scale(-1, 1);
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

  function drawGestureArm(ctx, shoulder, { elbow, hand, angle, fist }, near = true) {
    limb(ctx, shoulder, elbow, hand, near ? "#f8ba46" : "#c98d33", near ? 9 : 7, true);
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle);
    if (fist) {
      ellipse(ctx, 2, 0, 5.6, 4.8, "#f4bd94", 1.65);
      ellipse(ctx, 0, -1.6, 2.4, 1.7, "#ffd2ac");
    } else {
      paint(ctx, art.openHand, "#f4bd94", 1.65);
      stroke(ctx, art.palmFold, "#cb8869", 1.05);
    }
    ctx.restore();
  }

  const expressions = {
    sprint:    { eyes: "focused", mouth: "pant" },
    jump:      { eyes: "wide",    mouth: "gasp" },
    slap:      { eyes: "glare",   mouth: "teeth" },
    puff:      { eyes: "sly",     mouth: "grin" },
    curls:     { eyes: "wink",    mouth: "teeth" },
    press:     { eyes: "squeeze", mouth: "teeth" },
    run:       { eyes: "wide",    mouth: "tongue" },
    boxing:    { eyes: "glare",   mouth: "puff" },
    squats:    { eyes: "wide",    mouth: "puff" },
    pushups:   { eyes: "wink",    mouth: "tongue" },
    situps:    { eyes: "squeeze", mouth: "gasp" },
    shoulders: { eyes: "cross",   mouth: "gasp" }
  };

  function drawExpression(ctx, face, effort) {
    for (const far of [false, true]) {
      const x = far ? 72 : 58, y = far ? 41 : 42;
      ctx.save();
      ctx.translate(x, y);
      if (far) ctx.scale(.79, .92);
      const squint = face.eyes === "squeeze" || (face.eyes === "wink" && !far);
      const narrow = face.eyes === "glare" || face.eyes === "sly" || face.eyes === "focused";
      const height = squint ? 4 - 3.5 * effort : 4 + (narrow ? -2 : 2) * effort;
      if (height < 1.8) {
        ctx.save();
        if (far) ctx.scale(-1, 1);
        stroke(ctx, art.screwEye, ink, 1.9);
        ctx.restore();
      } else {
        ellipse(ctx, 0, 0, 5.3, height, "#fff6e6", 1.3);
        const look = face.eyes === "cross" ? (far ? -2 : 2) : face.eyes === "sly" ? -2.5 : 1;
        ellipse(ctx, look * effort, -.3, 1.9, Math.min(height - .4, 2.7), ink);
      }
      ctx.translate(0, -height - 2);
      const slant = (face.eyes === "glare" || face.eyes === "sly") ? (far ? -.48 : .48) : (far ? -.23 : .28);
      ctx.rotate(slant * effort);
      stroke(ctx, art.gymBrow, "#62402f", 2);
      ctx.restore();
    }

    const puff = face.mouth === "puff";
    ellipse(ctx, 52, 48.5, 3 + (puff ? 3.4 : 1.3) * effort, 1.5 + (puff ? 2.5 : .8) * effort, "#ec9981");
    stroke(ctx, art.nose, "#b9775c", 1.15);
    ctx.save();
    ctx.translate(66, 51);
    ctx.scale(.78 + .22 * effort, .55 + .65 * effort);
    if (face.mouth === "teeth") {
      paint(ctx, art.gymTeeth, "#fff0d6", 1.4);
    } else if (face.mouth === "grin") {
      paint(ctx, art.slyGrin, "#fff2d9", 1.6);
    } else if (face.mouth === "pant") {
      ellipse(ctx, 1, 0, 4.6, 1.6 + 1.9 * effort, "#773d41", 1.2);
    } else if (puff) {
      ellipse(ctx, 3, 0, 1.9, 2.2, "#803f42", 1);
    } else {
      const tongue = face.mouth === "tongue";
      ellipse(ctx, 0, 0, tongue ? 5 : 3.2, 2.3 + 1.5 * effort, "#773d41", 1.3);
      if (tongue) paint(ctx, art.gymTongue, "#ef8892", 1.3);
    }
    ctx.restore();
    if (face.mouth === "tongue" || face.eyes === "squeeze") {
      ctx.save();
      ctx.translate(45, 39 + effort * 4);
      paint(ctx, art.gymSweat, "#a8e2ed", 1);
      ctx.restore();
    }
  }

  function drawHead(ctx, angry = false, tilt = 0, expression, effort = 0) {
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
    if (expression) {
      drawExpression(ctx, expressions[expression], effort);
      ctx.restore();
      return;
    }
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

  function idlePose(carrying = false, grounded = true) {
    return {
      grounded,
      bounce: 0,
      farFoot: standingFoot(55, 112),
      nearFoot: standingFoot(39, 120),
      farArm: 0,
      nearArm: 0,
      slapArm: carrying ? nearCarryArm : undefined,
      farReach: carrying ? farCarryArm : undefined
    };
  }

  function runPose(phase, carrying = false) {
    const armSwing = Math.cos((phase - 0.09) * tau);
    const bounce = -1.5 * (1 + Math.cos((phase - 0.44) * 2 * tau));
    const footPose = (offset, x, groundY, hipX, hipY) => {
      const foot = runningFoot(phase + offset, x, groundY);
      foot.knee = {
        x: (hipX + foot.x) / 2 + 5 + 13 * foot.lift,
        y: (hipY + bounce + foot.y - 3) / 2
      };
      return foot;
    };
    return {
      bounce,
      lean: carrying ? 0.045 : 0.15,
      farFoot: footPose(0.5, 55, 112, 54, 81),
      nearFoot: footPose(0, 39, 120, 41, 83),
      farArm: 15 * armSwing,
      nearArm: -18 * armSwing,
      slapArm: carrying ? nearCarryArm : undefined,
      farReach: carrying ? farCarryArm : undefined
    };
  }

  function poseValues(poses, progress) {
    const next = poses.findIndex((pose) => pose.at >= progress);
    const from = poses[next - 1];
    const to = poses[next];
    const t = (progress - from.at) / (to.at - from.at);
    const eased = t * t * (3 - 2 * t);
    return (name) => from[name] + (to[name] - from[name]) * eased;
  }

  function kickPose(poses, progress, full) {
    const value = poseValues(poses, progress);
    const footY = value("footY");
    return {
      angry: full,
      trail: full ? Math.max(0, 1 - Math.abs(progress - 0.48) / 0.13) : 0,
      bounce: value("bounce"),
      lean: value("lean"),
      farFoot: standingFoot(55, 112),
      nearFoot: {
        x: value("footX"), y: footY, groundY: 120,
        lift: Math.min(1, (120 - footY) / 24),
        angle: value("shoe"),
        knee: { x: value("kneeX"), y: value("kneeY") }
      },
      nearArm: value("nearArm"),
      farArm: value("farArm")
    };
  }

  function handStrikePose(progress, punch = false) {
    const value = poseValues(punch ? punchPoses : slapPoses, progress);
    return {
      farFoot: standingFoot(55, 112),
      nearFoot: standingFoot(39, 120),
      farArm: value("farArm"),
      bounce: value("bounce"),
      lean: value("lean"),
      trail: punch ? 0 : Math.max(0, 1 - Math.abs(progress - 0.5) / 0.13),
      slapArm: {
        elbow: { x: value("elbowX"), y: value("elbowY") },
        hand: { x: value("handX"), y: value("handY") },
        angle: value("angle"),
        fist: punch
      }
    };
  }

  function puffPose(progress) {
    const value = poseValues(puffPoses, progress);
    const lean = value("lean");
    return {
      bounce: value("bounce"),
      lean,
      headTilt: -0.7 * lean,
      farFoot: standingFoot(55, 112),
      nearFoot: { ...standingFoot(39, 120), knee: { x: value("kneeX"), y: 102 } },
      nearArm: value("nearArm"),
      farArm: value("farArm")
    };
  }

  function grabPose(progress, carrying) {
    if (progress > grabContactAt && !carrying) progress = grabContactAt * (1 - progress) / (1 - grabContactAt);
    const lift = Math.max(0, (progress - grabContactAt) / (1 - grabContactAt));
    const reach = Math.sin(Math.min(1, progress / grabContactAt) * Math.PI / 2) * (1 - lift);
    const blend = (x, y, target) => ({ x: x + (target.x - x) * lift, y: y + (target.y - y) * lift });
    return {
      bounce: 7 * reach,
      lean: 0.24 * reach,
      headTilt: -0.13 * reach,
      farFoot: standingFoot(55, 112),
      nearFoot: { ...standingFoot(39, 120), knee: { x: 42 - 8 * reach, y: 103 } },
      farArm: -6 * reach,
      slapArm: {
        elbow: blend(37 + 12 * reach, 73 + 9 * reach, nearCarryArm.elbow),
        hand: blend(37 + 28 * reach, 82 + 17 * reach, nearCarryArm.hand),
        angle: (1.5 - 1.12 * reach) * (1 - lift) + nearCarryArm.angle * lift
      },
      farReach: lift > 0 ? {
        elbow: blend(60, 72, farCarryArm.elbow),
        hand: blend(60, 81, farCarryArm.hand),
        angle: 1.5 * (1 - lift) + farCarryArm.angle * lift
      } : undefined
    };
  }

  function throwPose(progress, carrying) {
    if (progress > throwReleaseAt && carrying) {
      progress = throwReleaseAt * (1 - progress) / (1 - throwReleaseAt);
    }
    const reach = progress < throwReleaseAt ? progress / throwReleaseAt : 1;
    const recovery = Math.max(0, (progress - throwReleaseAt) / (1 - throwReleaseAt));
    const arm = (raised, elbow, hand, restX) => {
      const point = (start, extended, rest) => ({
        x: (start.x + (extended.x - start.x) * reach) * (1 - recovery) + rest.x * recovery,
        y: (start.y + (extended.y - start.y) * reach) * (1 - recovery) + rest.y * recovery
      });
      return {
        elbow: point(raised.elbow, elbow, { x: restX, y: 73 }),
        hand: point(raised.hand, hand, { x: restX, y: 82 }),
        angle: raised.angle * (1 - reach) + 1.5 * recovery
      };
    };
    return {
      bounce: -1.8 * reach * (1 - recovery),
      lean: 0.15 * reach * (1 - recovery),
      farFoot: standingFoot(55, 112),
      nearFoot: standingFoot(39, 120),
      slapArm: arm(nearCarryArm, { x: 48, y: 33 }, { x: 66, y: 15 }, 37),
      farReach: arm(farCarryArm, { x: 70, y: 31 }, { x: 80, y: 15 }, 62)
    };
  }

  function createPuffTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 72;
    const ctx = canvas.getContext("2d");
    ctx.translate(47, 37);
    ctx.scale(3.8, 3.5);
    paint(ctx, art.puffCloud, "#b6c99a");
    ellipse(ctx, -3, -2, 6, 4.5, "#d3dfb6");
    ellipse(ctx, 3, -3, 4.5, 4, "#d3dfb6");
    stroke(ctx, art.puffSwirl, "#9bb089", .85);
    return canvas;
  }

  function drawPose(ctx, { farFoot, nearFoot, farArm, nearArm, bounce, hipOffset = 0, lean = 0, headTilt = 0, angry = false, trail = 0, slapArm, farReach, grounded = true }, expression, effort) {
    if (grounded) {
      softShadow(ctx, 50, 119.5, 24, 8.5, 0.31);
      drawFootShadow(ctx, farFoot);
      drawFootShadow(ctx, nearFoot);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (trail > 0) {
      const path = slapArm ? art.slapTrail : art.kickTrail;
      stroke(ctx, path, `rgba(96, 58, 36, ${trail * 0.6})`, 4.8);
      stroke(ctx, path, `rgba(255, 219, 132, ${trail})`, 2.8);
    }
    drawLeg(ctx, { x: 54 + hipOffset, y: 81 + bounce }, farFoot, false);
    drawLeg(ctx, { x: 41 + hipOffset, y: 83 + bounce }, nearFoot, true);
    ctx.translate(47 + hipOffset, 83 + bounce);
    ctx.rotate(lean);
    ctx.translate(-47, -83);
    const farShoulder = { x: 63, y: 60 };
    if (farReach) drawGestureArm(ctx, farShoulder, farReach, false);
    else drawArm(ctx, farShoulder, farArm, false);
    paint(ctx, art.jacket, "#ffc951", 2.5);
    paint(ctx, art.jacketShade, "#e39b32");
    paint(ctx, art.pocket, "#ffd76b");
    stroke(ctx, art.zipper, "#9a5f36", 1.65);
    ellipse(ctx, 57.7, 63, 1.4, 2, "#524338");
    const nearShoulder = { x: 40, y: 61 };
    if (slapArm) drawGestureArm(ctx, nearShoulder, slapArm);
    else drawArm(ctx, nearShoulder, nearArm, true);
    paint(ctx, art.neck, "#e5a481", 1.9);
    paint(ctx, art.hood, "#ffd363", 2.2);
    paint(ctx, art.collar, "#568d81");
    drawHead(ctx, angry, headTilt, expression, effort);
  }

  const actions = {
    kick: { duration: 0.65, contact: 0.5, pose: (progress) => kickPose(kickPoses, progress, false) },
    "full-kick": { duration: 0.77, contact: 0.44, pose: (progress) => kickPose(fullKickPoses, progress, true) },
    slap: { duration: 0.54, contact: 0.5, pose: handStrikePose },
    punch: { duration: 0.38, contact: 0.43, pose: (progress) => handStrikePose(progress, true) },
    puff: { duration: 0.75, contact: 0.4, pose: puffPose },
    grab: { duration: 0.6, contact: grabContactAt, pose: grabPose },
    throw: { duration: 0.36, contact: throwReleaseAt, pose: throwPose }
  };

  function runPhase(frame) {
    return (1 / 6 + frame / runFrameCount) % 1;
  }

  function blendFoot(foot, running, amount, hip) {
    const knee = legKnee(hip, foot);
    return {
      x: foot.x + (running.x - foot.x) * amount,
      y: foot.y + (running.y - foot.y) * amount,
      groundY: foot.groundY,
      lift: foot.lift + (running.lift - foot.lift) * amount,
      angle: foot.angle + (running.angle - foot.angle) * amount,
      knee: {
        x: knee.x + (running.knee.x - knee.x) * amount,
        y: knee.y + (running.knee.y - knee.y) * amount
      }
    };
  }

  function tuckFoot(foot, rise, bend) {
    foot.y -= rise;
    foot.lift = Math.min(1, foot.lift + rise / 22);
    foot.angle -= bend;
    if (foot.knee) foot.knee.y -= rise * 0.55;
  }

  function workoutArm(elbowX, elbowY, handX, handY, angle = 0) {
    return { elbow: { x: elbowX, y: elbowY }, hand: { x: handX, y: handY }, angle, fist: true };
  }

  function drawWorkoutWeight(ctx, hand) {
    ctx.save();
    ctx.translate(hand.x + 1, hand.y);
    ctx.rotate(-0.17);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = "#a5afb6";
    ctx.stroke();
    ellipse(ctx, -9, 0, 3.2, 6.2, "#3b515b", 1.4);
    ellipse(ctx, 9, 0, 3.2, 6.2, "#3b515b", 1.4);
    ctx.restore();
  }

  function drawBenchPress(ctx, phase) {
    // Spend more of each rep lowering the bar, then drive it back up.
    const lowerUntil = .62;
    const effort = phase < lowerUntil
      ? (1 + Math.cos(Math.PI * phase / lowerUntil)) / 2
      : (1 - Math.cos(Math.PI * (phase - lowerUntil) / (1 - lowerUntil))) / 2;
    const barX = 48 + 2 * effort;
    const barY = 68 - 31 * effort;
    const slope = .08;
    const grip = (offset) => ({ x: barX + offset, y: barY + offset * slope });
    const leftHand = grip(-22);
    const rightHand = grip(22);

    softShadow(ctx, 48, 68, 22, 28, .35);
    softShadow(ctx, 26, 117, 12, 4, .33);
    softShadow(ctx, 73, 117, 12, 4, .33);
    drawLeg(ctx, { x: 53, y: 82 }, {
      ...standingFoot(69, 112), angle: .18, knee: { x: 64, y: 97 }
    }, false);
    drawLeg(ctx, { x: 42, y: 82 }, {
      ...standingFoot(29, 112), angle: .18, facingLeft: true, knee: { x: 33, y: 98 }
    }, true);

    limb(ctx, { x: 59, y: 61 }, { x: 79 - 14 * effort, y: 78 - 26 * effort }, rightHand, "#c98d33", 8, true);
    paint(ctx, art.benchHoodie, "#ffc951", 2.5);
    paint(ctx, art.benchHoodieShade, "#e39b32");
    stroke(ctx, art.benchZipper, "#9a5f36", 1.45);
    limb(ctx, { x: 36, y: 63 }, { x: 18 + 11 * effort, y: 76 - 27 * effort }, leftHand, "#f8ba46", 9, true);

    ctx.save();
    ctx.translate(16, 26);
    ctx.scale(.62, .62);
    drawHead(ctx, false, -.17, "press", effort);
    ctx.restore();

    ctx.save();
    ctx.translate(barX, barY);
    ctx.rotate(Math.atan(slope));
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(36, 0);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = "#c8d6d9";
    ctx.lineWidth = 3.5;
    ctx.stroke();
    for (const x of [-35, 35]) {
      ellipse(ctx, x, 0, 5.2, 9, "#ac574b", 1.9);
      ellipse(ctx, x - 1, -1, 2.4, 6.5, "#d98366");
    }
    ctx.restore();
    ellipse(ctx, rightHand.x, rightHand.y, 4.7, 4.2, "#e5a481", 1.5);
    ellipse(ctx, leftHand.x, leftHand.y, 5, 4.4, "#f4bd94", 1.5);
  }

  function drawTreadmillRun(ctx, phase, elapsed) {
    const bounce = -2 * Math.pow(Math.sin(phase * tau), 2);
    const sway = 1.2 * Math.sin(phase * tau);
    const legs = [-1, 1].map((side, index) => {
      const stride = runningFoot(phase + index / 2, 0, 0);
      return { side, x: 48 + side * 8, y: 106 - .57 * stride.x + .18 * stride.y, lift: stride.lift };
    });
    for (const { x, y, lift } of legs) softShadow(ctx, x, y + 3, 7, 3, .3 - .17 * lift);
    for (const { side, x, y, lift } of legs.sort((a, b) => a.y - b.y)) {
      const hip = { x: 48 + side * 7 + sway, y: 83 + bounce };
      const knee = { x: x + side * (2 + lift), y: (hip.y + y) * .5 };
      limb(ctx, hip, knee, { x, y }, "#3e596d", 9, true);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(side * .09);
      paint(ctx, art.rearShoe, "#a76340", 1.7);
      paint(ctx, art.rearShoeHeel, "#f2d4a1");
      ctx.restore();
    }

    ctx.translate(sway, bounce);
    for (const side of [-1, 1]) {
      const swing = side * Math.cos(phase * tau);
      const hand = { x: 48 + side * (22 + 2 * swing), y: 73 + 12 * swing };
      limb(ctx, { x: 48 + side * 15, y: 61 }, { x: 48 + side * 24, y: 74 + 5 * swing }, hand, "#f8ba46", 8, true);
      ellipse(ctx, hand.x, hand.y + 1.5, 4, 4.3, "#edb086", 1.55);
    }
    paint(ctx, art.rearJacket, "#ffc951", 2.5);
    paint(ctx, art.rearJacketShade, "#e39b32");
    paint(ctx, art.rearHood, "#ffd363", 2.3);
    stroke(ctx, art.rearHoodSeam, "#d89135", 1.5);
    ellipse(ctx, 48, 53, 12, 8, "#e5a481", 1.6);
    // A brief look over the shoulder reveals the panting face during the run.
    const glance = Math.max(0, Math.min(1, (elapsed - .85) / .28, (2.4 - elapsed) / .28));
    if (glance > .5) {
      ctx.translate(48 + 4 * glance, 55);
      ctx.scale(.64 + .36 * glance, 1);
      ctx.translate(-50, -55);
      drawHead(ctx, false, -.1, "run", .5 + .5 * Math.sin(phase * tau));
      return;
    }
    ctx.translate(48, 55);
    ctx.scale(1 - .36 * glance, 1);
    ctx.translate(-48, -55);
    for (const x of [24, 72]) ellipse(ctx, x, 46, 4.8, 6, "#f4c098", 1.7);
    paint(ctx, art.rearHair, "#62402f", 2.5);
    paint(ctx, art.rearHairLight, "#9b6039");
    stroke(ctx, art.rearHairStrand, "#b87843", 1.6);
  }

  function drawSitUp(ctx, effort) {
    const hip = { x: 50, y: 95 };
    softShadow(ctx, 49, 100, 41, 3.5, .24);
    softShadow(ctx, 21 + 18 * effort, 98, 16 - 9 * effort, 3, .28 * (1 - effort));

    // Hold the bent legs in profile so there is a fixed reference for the curl.
    for (const far of [true, false]) {
      const dx = far ? 4 : 0, dy = far ? -3 : 0;
      limb(ctx, { x: hip.x + dx, y: hip.y + dy },
        { x: 64 + dx, y: 74 + dy }, { x: 76 + dx, y: 96 + dy },
        far ? "#293d51" : "#3e596d", far ? 7 : 8.5, true);
      ctx.save();
      ctx.translate(78 + dx, 97 + dy);
      ctx.scale(.66, .64);
      paint(ctx, art.shoe, far ? "#7b4a38" : "#a76340", 2);
      paint(ctx, art.sole, far ? "#c9ad86" : "#f2d4a1");
      stroke(ctx, art.laces, "#f1c07d", 1.4);
      ctx.restore();
    }
    ellipse(ctx, hip.x, hip.y, 6.5, 4.8, "#3e596d", 1.8);

    ctx.save();
    ctx.translate(hip.x, hip.y);
    ctx.rotate(-1.38 + 1.66 * effort);
    ctx.scale(.62, .62);
    ctx.translate(-47, -85);
    paint(ctx, art.jacket, "#ffc951", 2.5);
    paint(ctx, art.jacketShade, "#e39b32");
    paint(ctx, art.hood, "#ffd363", 2.2);
    limb(ctx, { x: 59, y: 62 }, { x: 65, y: 74 }, { x: 48, y: 65 }, "#c98d33", 7, true);
    limb(ctx, { x: 39, y: 62 }, { x: 40, y: 75 }, { x: 55, y: 65 }, "#f8ba46", 8, true);
    ellipse(ctx, 55, 65, 4, 3.5, "#f4bd94", 1.5);
    drawHead(ctx, false, .09 + .26 * effort, "situps", effort);
    ctx.restore();
  }

  function drawWeightedSquat(ctx, effort) {
    const pose = idlePose();
    pose.bounce = 19 * effort;
    pose.hipOffset = -8 * effort;
    pose.lean = .31 * effort;
    pose.nearFoot = { ...standingFoot(32, 120), angle: .09, knee: { x: 38 + 17 * effort, y: 103 + 4 * effort } };
    pose.farFoot = { ...standingFoot(55, 112), angle: .08, knee: { x: 54 + 14 * effort, y: 99 + 5 * effort } };
    pose.slapArm = workoutArm(44, 76, 58, 66);
    pose.farReach = workoutArm(74, 73, 76, 64);
    drawPose(ctx, pose, "squats", effort);
    ellipse(ctx, 67, 66, 10.5, 12, "#7b6b94", 1.8);
    ellipse(ctx, 67, 66, 7.2, 8.1, "#4f485f", 1.2);
    ellipse(ctx, 67, 66, 3.1, 3.5, "#bcc4ce", 1.4);
    ellipse(ctx, 57.6, 66, 3.2, 3.7, "#f4bd94", 1.45);
    ellipse(ctx, 76, 64, 3, 3.3, "#e5a481", 1.3);
  }

  function drawPushUpArm(ctx, shoulder, wrist, near) {
    // Two equal arm segments fold the elbow toward the feet while the palm stays put.
    const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
    const distance = Math.hypot(dx, dy);
    const bend = Math.sqrt(Math.max(0, 18.5 ** 2 - (distance / 2) ** 2));
    const elbow = {
      x: (shoulder.x + wrist.x) / 2 - dy / distance * bend,
      y: (shoulder.y + wrist.y) / 2 + dx / distance * bend
    };
    limb(ctx, shoulder, elbow, wrist, near ? "#f8ba46" : "#c98d33", near ? 6.5 : 5.5, true);
    ellipse(ctx, wrist.x + 2.8, wrist.y + 1, 5.7, 2.4, near ? "#f4bd94" : "#e5a481", 1.3);
  }

  function drawPushUp(ctx, effort) {
    // Viewed from the side, the straight plank pivots at the feet.
    const ankle = { x: 10, y: 92 };
    const angle = -.52 + .41 * effort;
    const shoulder = {
      x: ankle.x + 56 * Math.cos(angle),
      y: ankle.y + 56 * Math.sin(angle)
    };
    softShadow(ctx, 44, 100, 41, 3.4, .19 + .13 * effort);
    drawPushUpArm(ctx, { x: shoulder.x + 2, y: shoulder.y - 2 }, { x: 65, y: 94 }, false);

    for (const far of [true, false]) {
      ctx.save();
      ctx.translate(ankle.x + (far ? 3 : 0), ankle.y - (far ? 3 : 0));
      ctx.rotate(.96);
      ctx.scale(.58, .66);
      paint(ctx, art.shoe, far ? "#7b4a38" : "#a76340", 2);
      paint(ctx, art.sole, "#f2d4a1");
      stroke(ctx, art.laces, "#f1c07d", 1.4);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(ankle.x, ankle.y);
    ctx.rotate(angle);
    limb(ctx, { x: 30, y: 0 }, { x: 15, y: 0 }, { x: 0, y: 0 }, "#3e596d", 7.5);
    ctx.save();
    ctx.translate(29, 0);
    ctx.rotate(Math.PI / 2);
    ctx.scale(.47, .96);
    ctx.translate(-47, -85);
    paint(ctx, art.benchHoodie, "#ffc951", 2.5);
    paint(ctx, art.benchHoodieShade, "#e39b32");
    paint(ctx, art.hood, "#ffd363", 2);
    ctx.restore();

    ctx.translate(68, -1);
    ctx.rotate(1.48);
    ctx.scale(.44, .44);
    ctx.translate(-52, -40);
    drawHead(ctx, false, 0, "pushups", effort);
    ctx.restore();

    drawPushUpArm(ctx, shoulder, { x: 61, y: 98 }, true);
  }

  function drawWorkout(ctx, key, phase, elapsed) {
    if (key === "press") {
      ctx.translate(48, 112);
      ctx.scale(.9, .9);
      ctx.translate(-48, -112);
      drawBenchPress(ctx, phase);
      return;
    }
    if (key === "run") {
      drawTreadmillRun(ctx, phase, elapsed);
      return;
    }
    if (key === "boxing") {
      drawPose(ctx, handStrikePose(Math.max(.001, phase), true), key, Math.sin(Math.PI * phase) ** 2);
      return;
    }
    const effort = (1 - Math.cos(phase * tau)) / 2;
    if (key === "pushups") {
      drawPushUp(ctx, effort);
      return;
    }
    if (key === "situps") {
      drawSitUp(ctx, effort);
      return;
    }
    if (key === "squats") {
      drawWeightedSquat(ctx, effort);
      return;
    }
    const pose = idlePose();
    if (key === "shoulders") {
      // Leave space around the head, then bring the weights inward at lockout.
      const inward = Math.max(0, (effort - .76) / .24);
      ctx.translate(48, 120);
      ctx.scale(.90, .90);
      ctx.translate(-48, -120);
      pose.nearFoot = standingFoot(33, 120);
      pose.farFoot = standingFoot(59, 116);
      pose.slapArm = workoutArm(13 + 11 * effort, 65 - 32 * effort, 13 + 17 * inward, 49 - 51 * effort);
      pose.farReach = workoutArm(88 - 9 * effort, 63 - 32 * effort, 87 - 12 * inward, 47 - 51 * effort);
      drawPose(ctx, pose, key, effort);
      for (const arm of [pose.farReach, pose.slapArm]) {
        drawWorkoutWeight(ctx, arm.hand);
        ellipse(ctx, arm.hand.x, arm.hand.y + .4, 4.1, 3.6, "#f4bd94", 1.4);
      }
      return;
    }
    if (key === "curls") {
      pose.slapArm = workoutArm(36, 68, 43, 82 - 32 * effort, -0.35);
      pose.farReach = workoutArm(72, 68, 72, 79 - 28 * effort, 0.4);
      pose.bounce = -1.3 * effort;
      drawPose(ctx, pose, key, effort);
      drawWorkoutWeight(ctx, pose.slapArm.hand);
      drawWorkoutWeight(ctx, pose.farReach.hand);
      return;
    }
    drawPose(ctx, pose);
  }

  function createActionRenderer() {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    return {
      canvas,
      draw(key, progress, step, runBlend, carrying, airborne = 0) {
        const pose = progress <= 0 || progress >= 1
          ? idlePose(carrying)
          : actions[key].pose(progress, carrying);
        const kick = key === "kick" || key === "full-kick";
        if (runBlend > 0) {
          const gait = runPose(runPhase(step), carrying);
          // Blend in the stride without overriding the striking leg during the kick.
          const strike = kick ? Math.min(1, 1.25 * Math.sin(Math.PI * progress)) : 0;
          const nearAmount = runBlend * (1 - strike);
          pose.bounce += gait.bounce * runBlend * (1 - 0.6 * strike);
          if (nearAmount > 0) {
            pose.nearFoot = blendFoot(pose.nearFoot, gait.nearFoot, nearAmount, { x: 41, y: 83 + pose.bounce });
          }
          pose.farFoot = blendFoot(pose.farFoot, gait.farFoot, runBlend * (1 - 0.6 * strike), { x: 54, y: 81 + pose.bounce });
          pose.lean = (pose.lean || 0) + gait.lean * runBlend * 0.45;
        }
        if (airborne > 0) {
          pose.grounded = false;
          tuckFoot(pose.farFoot, 9 * airborne, 0.23 * airborne);
          if (!kick) tuckFoot(pose.nearFoot, 15 * airborne, 0.34 * airborne);
          if (!key && !carrying) {
            pose.nearArm = 11 * airborne;
            pose.farArm = -8 * airborne;
          }
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(scale, scale);
        const expression = key === "puff" || key === "slap" ? key : airborne > 0 && !key ? "jump" : null;
        const intensity = key ? .65 + .35 * Math.sin(progress * Math.PI) : .6 + .4 * airborne;
        drawPose(ctx, pose, expression, intensity);
        ctx.restore();
      },
      drawWorkout(key, phase, elapsed = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(scale, scale);
        drawWorkout(ctx, key, phase, elapsed);
        ctx.restore();
      }
    };
  }

  function createAtlas() {
    const canvas = document.createElement("canvas");
    const frameWidth = width * scale;
    const frameHeight = height * scale;
    const padding = 1;
    const cellWidth = frameWidth + 2 * padding;
    const cellHeight = frameHeight + 2 * padding;
    const frameCount = 3 + 2 * runFrameCount;
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

    const idleFrame = addFrame(() => drawPose(ctx, idlePose()));
    const carryIdleFrame = addFrame(() => drawPose(ctx, idlePose(true)));
    const liftedDummyFrame = addFrame(() => drawPose(ctx, idlePose(false, false)));
    const runFrames = [];
    const carryRunFrames = [];
    for (let step = 0; step < runFrameCount; step++) {
      const phase = runPhase(step);
      const breath = .55 + .35 * Math.cos(phase * tau);
      runFrames.push(addFrame(() => drawPose(ctx, runPose(phase), "sprint", breath)));
      carryRunFrames.push(addFrame(() => drawPose(ctx, runPose(phase, true), "sprint", breath)));
    }
    return { canvas, frames, idleFrame, runFrames, runFps, carryIdleFrame, carryRunFrames, liftedDummyFrame };
  }

  return { createAtlas, createActionRenderer, createPuffTexture, actions };
})();

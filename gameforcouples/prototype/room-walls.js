const RoomscapeWalls = (() => {
  const outlineWidth = (wall) => wall.width + 6;
  const layers = [
    { width: outlineWidth, color: () => "#17151b" },
    { width: (wall) => wall.width, color: (wall) => wall.stroke || "#672b38" },
    { width: (wall) => Math.max(5, wall.width * 0.42), color: () => "#251b25" }
  ];

  function joinedSegments(segments, defaultWidth = 26) {
    const walls = segments.map((wall) => {
      const dx = Number(wall.x2) - Number(wall.x1);
      const dy = Number(wall.y2) - Number(wall.y1);
      const length = Math.hypot(dx, dy);
      return {
        ...wall,
        x1: Number(wall.x1), y1: Number(wall.y1), x2: Number(wall.x2), y2: Number(wall.y2),
        width: Number(wall.width) || defaultWidth,
        length, ux: length ? dx / length : 0, uy: length ? dy / length : 0
      };
    });

    return walls.map((wall) => {
      let start = 0, end = wall.length;
      let startGap = Infinity, endGap = Infinity;
      for (const other of walls) {
        if (wall === other) continue;
        const cross = wall.ux * other.uy - wall.uy * other.ux;
        if (Math.abs(cross) < 0.35) continue;
        const dx = other.x1 - wall.x1, dy = other.y1 - wall.y1;
        const along = (dx * other.uy - dy * other.ux) / cross;
        const alongOther = (dx * wall.uy - dy * wall.ux) / cross;
        const reach = Math.min(24, (wall.width + other.width) / 2 + 1);
        if (alongOther < -reach || alongOther > other.length + reach) continue;
        const gapStart = Math.abs(along), gapEnd = Math.abs(along - wall.length);
        if (gapStart <= reach && gapStart <= gapEnd && gapStart < startGap) {
          start = along;
          startGap = gapStart;
        } else if (gapEnd <= reach && gapEnd < gapStart && gapEnd < endGap) {
          end = along;
          endGap = gapEnd;
        }
      }
      if (end <= start) return wall;
      return {
        ...wall,
        x1: wall.x1 + start * wall.ux, y1: wall.y1 + start * wall.uy,
        x2: wall.x1 + end * wall.ux, y2: wall.y1 + end * wall.uy
      };
    });
  }

  return { layers, outlineWidth, joinedSegments };
})();

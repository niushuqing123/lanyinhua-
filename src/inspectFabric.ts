import { BOARD, designSvg, imageFromUrl, svgUrl, type CutOperation, type Impression, type Point, type Station, type Sweep, type WorkshopState } from './workshopModel';
export type FabricInspection = { station: Station; title: string; detail: string; x: number; y: number };
function pixels(image: HTMLImageElement) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = BOARD;
  const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0, BOARD, BOARD);
  return context.getImageData(0, 0, BOARD, BOARD).data;
}
function alpha(data: Uint8ClampedArray, x: number, y: number) {
  if (x < 0 || y < 0 || x >= BOARD || y >= BOARD) return 0;
  const ix = Math.round(x), iy = Math.round(y); let strongest = 0;
  for (let offsetY = -2; offsetY <= 2; offsetY++) for (let offsetX = -2; offsetX <= 2; offsetX++) {
    const xx = ix + offsetX, yy = iy + offsetY;
    if (xx >= 0 && xx < BOARD && yy >= 0 && yy < BOARD) strongest = Math.max(strongest, data[(yy * BOARD + xx) * 4 + 3]);
  }
  return strongest;
}
function sourcePoint(point: Point, impression: Impression): Point {
  const angle = -impression.rotation * Math.PI / 180;
  const dx = point.x - BOARD / 2 - impression.x; const dy = point.y - BOARD / 2 - impression.y;
  return { x: BOARD / 2 + dx * Math.cos(angle) - dy * Math.sin(angle), y: BOARD / 2 + dx * Math.sin(angle) + dy * Math.cos(angle) };
}
function segmentDistance(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x; const dy = b.y - a.y; const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / Math.max(1, dx * dx + dy * dy)));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
function strokeDistance(point: Point, points: Point[]) { return points.length === 1 ? Math.hypot(point.x - points[0].x, point.y - points[0].y) : points.length < 1 ? Infinity : Math.min(...points.slice(1).map((value, index) => segmentDistance(point, points[index], value))); }
function nearestCut(point: Point, cuts: CutOperation[]) {
  let nearest = -1; let distance = Infinity;
  cuts.forEach((cut, index) => {
    if (cut.tool === 'bridge') return;
    const first = cut.points[0]; const last = cut.points[cut.points.length - 1] || first;
    const value = cut.tool === 'area' ? Math.hypot(point.x - (first.x + last.x) / 2, point.y - (first.y + last.y) / 2) : cut.tool === 'dot' ? Math.hypot(point.x - first.x, point.y - first.y) : strokeDistance(point, cut.points);
    if (value < distance) { distance = value; nearest = index; }
  });
  return nearest >= 0 ? `第 ${nearest + 1} 刀附近` : '刻版区域';
}
function nearestSweep(point: Point, impression: Impression) {
  let nearest: Sweep | null = null; let distance = Infinity; let index = -1;
  for (let position = 0; position < impression.sweeps.length; position++) {
    const sweep = impression.sweeps[position];
    const value = strokeDistance(point, sweep.points);
    if (value < distance) { distance = value; nearest = sweep; index = position; }
  }
  return { sweep: nearest, index, distance };
}
export async function inspectFabricPoint(state: WorkshopState, x: number, y: number): Promise<FabricInspection> {
  const [designImage, stencilImage, printImage] = await Promise.all([
    imageFromUrl(svgUrl(designSvg(state.design, '#fff'))), imageFromUrl(state.stencilMask), imageFromUrl(state.printMask),
  ]);
  const designData = pixels(designImage), stencilData = pixels(stencilImage), printData = pixels(printImage);
  const clicked = { x, y }; const printAlpha = alpha(printData, x, y);
  let designFound = false; let stencilFound = false; let chosen: { impression: Impression; local: Point; number: number } | null = null;
  state.impressions.forEach((impression, index) => {
    const local = sourcePoint(clicked, impression);
    if (alpha(designData, local.x, local.y) > 20) designFound = true;
    if (alpha(stencilData, local.x, local.y) > 20) { stencilFound = true; if (!chosen) chosen = { impression, local, number: index + 1 }; }
  });
  if (printAlpha > 20 && chosen) {
    const picked: { impression: Impression; local: Point; number: number } = chosen;
    const { sweep, index } = nearestSweep(clicked, picked.impression);
    const light = printAlpha < 140;
    return { station: 'print', title: light ? '这里的白纹较浅' : '这里成功留下白纹', detail: `${nearestCut(picked.local, state.cuts)}开出孔洞，第 ${picked.number} 处花版的第 ${index + 1} 刮经过这里。${sweep ? `当时力度 ${sweep.pressure ?? 3} 级，起始浆量 ${sweep.load ?? 100}%，速度 ${sweep.speed ?? 300} 格/秒。` : ''}${light ? '可回上浆台补刮，或调整浆料后重新制作。' : ''}`, x, y };
  }
  if (stencilFound) return { station: 'print', title: '这里有刻口，却没有形成白纹', detail: '花版在这里已镂空，但刮板没有有效留下浆痕。返回上浆台补刮后，需要重新浸染。', x, y };
  if (designFound) return { station: 'stencil', title: '纹样在这里，还没有有效开孔', detail: '构图里有这处纹样，花版却未刻穿；也可能被连接点保留。返回刻版台检查刀路。', x, y };
  return { station: 'design', title: '这里是蓝底留白区', detail: '此处没有纹样。可回设计台增加部件或手绘线条，再重新制作花版。', x, y };
}

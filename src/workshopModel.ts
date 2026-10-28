export const BOARD = 400;
export type Point = { x: number; y: number };
export type MotifKind = 'flower' | 'leaf' | 'butterfly' | 'fish' | 'cloud' | 'diamond' | 'petal' | 'sprig' | 'curl' | 'seed';
export type RepeatMode = 'single' | 'mirror' | 'horizontal' | 'tile';
export type MotifItem = { id: string; kind: MotifKind; x: number; y: number; scale: number; rotation: number; flip: boolean };
export type DesignStroke = { id: string; points: Point[]; width: number };
export type Design = { items: MotifItem[]; strokes: DesignStroke[]; repeat: RepeatMode };
export type CutTool = 'line' | 'dot' | 'area' | 'bridge';
export type CutOperation = { id: string; tool: CutTool; points: Point[]; width: number };
export type Mix = { bean: number; lime: number; water: number; turns: number };
export type Sweep = { id: string; points: Point[]; width: number; pressure?: number; speed?: number; load?: number; durationMs?: number };
export type Impression = { id: string; x: number; y: number; rotation: number; sweeps: Sweep[] };
export type DyeCycle = { soakMs: number; agitation: number; gain: number };
export type Product = 'scarf' | 'bag' | 'bookmark';
export type Station = 'design' | 'stencil' | 'mix' | 'print' | 'dye' | 'finish';
export type WorkshopState = {
  station: Station;
  design: Design;
  designHistory: Design[];
  designIndex: number;
  cuts: CutOperation[];
  stencilMask: string;
  stencilCoverage: number;
  strayCut: number;
  stencilRisk: number;
  mix: Mix;
  pasteLoad: number;
  impressions: Impression[];
  printMask: string;
  printCoverage: number;
  printWaste: number;
  dyeCycles: DyeCycle[];
  dyeDepth: number;
  revealed: boolean;
  product: Product;
  title: string;
};

export const STORAGE_KEY = 'yibu-yiran-workshop-v3';
export const STATIONS: { id: Station; name: string; short: string }[] = [
  { id: 'design', name: '纹样设计', short: '设计' },
  { id: 'stencil', name: '油纸刻版', short: '刻版' },
  { id: 'mix', name: '防染浆配制', short: '配浆' },
  { id: 'print', name: '拷花上浆', short: '上浆' },
  { id: 'dye', name: '靛蓝浸染', short: '浸染' },
  { id: 'finish', name: '成品工坊', short: '成品' },
];
export const MOTIFS: { kind: MotifKind; name: string; cue: string }[] = [
  { kind: 'flower', name: '团花', cue: '花瓣围心' },
  { kind: 'leaf', name: '枝叶', cue: '叶脉相生' },
  { kind: 'butterfly', name: '蝶影', cue: '双翼照映' },
  { kind: 'fish', name: '游鱼', cue: '鱼尾轻摆' },
  { kind: 'cloud', name: '云纹', cue: '曲线回旋' },
  { kind: 'diamond', name: '菱格', cue: '几何连印' },
];
export const PARTS: { kind: MotifKind; name: string; cue: string }[] = [
  { kind: 'petal', name: '单瓣', cue: '一瓣一瓣长出花' },
  { kind: 'sprig', name: '细枝', cue: '连接花与叶' },
  { kind: 'curl', name: '卷草', cue: '曲线与回旋' },
  { kind: 'seed', name: '点心', cue: '花蕊与边饰' },
];
export const REPEATS: { id: RepeatMode; name: string }[] = [
  { id: 'single', name: '独幅' }, { id: 'mirror', name: '镜像对称' },
  { id: 'horizontal', name: '横向连续' }, { id: 'tile', name: '四方连续' },
];

const initialDesign: Design = { items: [], strokes: [], repeat: 'single' };
export const initialWorkshop: WorkshopState = {
  station: 'design', design: initialDesign, designHistory: [initialDesign], designIndex: 0,
  cuts: [], stencilMask: '', stencilCoverage: 0, strayCut: 0, stencilRisk: 0,
  mix: { bean: 35, lime: 25, water: 25, turns: 0 },
  pasteLoad: 100, impressions: [], printMask: '', printCoverage: 0, printWaste: 0,
  dyeCycles: [], dyeDepth: 0, revealed: false, product: 'scarf', title: '我的蓝印',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;
const coord = (point: Point) => `${round(point.x)} ${round(point.y)}`;
export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const petal = `<path d="M50 46 C36 35 39 20 50 9 C61 20 64 35 50 46Z"/>`;
const flower = Array.from({ length: 6 }, (_, index) => `<g transform="rotate(${index * 60} 50 50)">${petal}</g>`).join('') + `<circle cx="50" cy="50" r="8"/>`;
const leaf = `<path d="M18 85 Q45 52 78 18" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M42 62 C12 61 15 35 35 34 C49 40 48 51 42 62Z M57 44 C55 20 76 17 88 26 C86 43 68 49 57 44Z M28 74 C7 76 8 60 22 55 C35 55 35 65 28 74Z"/>`;
const wing = `<path d="M48 49 C39 24 22 13 13 22 C5 34 19 51 45 53Z M45 55 C21 52 12 70 24 80 C39 86 48 68 48 57Z"/>`;
const butterfly = `<g>${wing}<g transform="translate(100 0) scale(-1 1)">${wing}</g><path d="M50 42 C55 51 54 67 50 76 C46 67 45 51 50 42Z"/><path d="M49 45 Q38 23 33 19 M51 45 Q62 23 67 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></g>`;
const fish = `<path d="M11 51 C28 24 62 25 78 50 C61 76 29 78 11 51Z M76 50 Q92 31 94 23 Q86 50 94 77 Q90 69 76 54Z M43 32 Q53 17 68 23 L64 38 M43 68 Q55 82 67 77 L64 63"/><circle cx="28" cy="48" r="3" fill="#142f47"/><path d="M10 62 Q6 69 3 73" fill="none" stroke="currentColor" stroke-width="3"/>`;
const cloud = `<path d="M13 57 C18 42 30 44 32 51 C31 30 55 25 59 42 C64 29 85 34 84 50 C91 55 89 67 78 68 H28 C17 69 11 65 13 57Z"/><path d="M21 76 Q41 67 54 78 T82 77" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`;
const diamond = `<path d="M50 7 L91 50 L50 93 L9 50Z M50 25 L75 50 L50 75 L25 50Z" fill-rule="evenodd"/><circle cx="50" cy="50" r="8"/><path d="M50 6 V20 M50 80 V94 M6 50 H20 M80 50 H94" fill="none" stroke="currentColor" stroke-width="4"/>`;
const singlePetal = `<path d="M50 83 C12 59 20 25 50 11 C80 25 88 59 50 83Z"/>`;
const sprig = `<path d="M18 84 Q46 51 79 15" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M47 53 C22 53 20 34 35 30 C48 32 53 44 47 53Z M57 43 C57 25 77 21 84 31 C80 44 67 48 57 43Z"/>`;
const curl = `<path d="M17 73 C26 28 84 16 85 51 C85 75 51 80 45 58 C41 44 62 35 69 47 C73 54 65 59 59 55" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>`;
const seed = `<circle cx="50" cy="50" r="16"/><circle cx="50" cy="18" r="5"/><circle cx="50" cy="82" r="5"/><circle cx="18" cy="50" r="5"/><circle cx="82" cy="50" r="5"/>`;
export const MOTIF_ART: Record<MotifKind, string> = { flower, leaf, butterfly, fish, cloud, diamond, petal: singlePetal, sprig, curl, seed };

function itemMarkup(item: MotifItem) {
  return `<g transform="translate(${round(item.x)} ${round(item.y)}) rotate(${round(item.rotation)}) scale(${round(item.scale * (item.flip ? -1 : 1))} ${round(item.scale)}) translate(-50 -50)">${MOTIF_ART[item.kind]}</g>`;
}
export function strokePath(points: Point[]) { return points.map((point, index) => `${index ? 'L' : 'M'} ${coord(point)}`).join(' '); }
export function designSvg(design: Design, color = '#f7f3e8', background = 'none') {
  const art = design.items.map(itemMarkup).join('') + (design.strokes || []).map(stroke => `<path d="${strokePath(stroke.points)}" fill="none" stroke="currentColor" stroke-width="${round(stroke.width)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const repeated = design.repeat === 'mirror' ? `${art}<g transform="translate(400 0) scale(-1 1)">${art}</g>`
    : design.repeat === 'horizontal' ? `<g transform="translate(0 100) scale(.5)">${art}</g><g transform="translate(200 100) scale(.5)">${art}</g>`
      : design.repeat === 'tile' ? [[0, 0], [200, 0], [0, 200], [200, 200]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(.5)">${art}</g>`).join('') : art;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><rect width="400" height="400" fill="${background}"/><g color="${color}" fill="currentColor">${repeated}</g></svg>`;
}
export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
export function motifUrl(kind: MotifKind) {
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e9e1d2"/><g color="#315b6f" fill="currentColor">${MOTIF_ART[kind]}</g></svg>`);
}

function cutMarkup(cut: CutOperation) {
  const first = cut.points[0]; const last = cut.points[cut.points.length - 1] || first;
  if (cut.tool === 'dot') return `<circle cx="${round(first.x)}" cy="${round(first.y)}" r="${round(clamp(Math.hypot(last.x - first.x, last.y - first.y), cut.width / 2, 45))}"/>`;
  if (cut.tool === 'area') return `<ellipse cx="${round((first.x + last.x) / 2)}" cy="${round((first.y + last.y) / 2)}" rx="${round(Math.max(4, Math.abs(last.x - first.x) / 2))}" ry="${round(Math.max(4, Math.abs(last.y - first.y) / 2))}"/>`;
  const d = cut.points.map((point, index) => `${index ? 'L' : 'M'} ${coord(point)}`).join(' ');
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${round(cut.width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
export function cutsSvg(cuts: CutOperation[]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><g color="#fff" fill="currentColor">${cuts.map(cutMarkup).join('')}</g></svg>`;
}

async function imageFromSvg(svg: string) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('图形渲染失败')); image.src = svgUrl(svg); });
  return image;
}
export async function imageFromUrl(url: string) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('图像加载失败')); image.src = url; });
  return image;
}
function canvas() { const surface = document.createElement('canvas'); surface.width = BOARD; surface.height = BOARD; return surface; }
function alphaCount(pixels: Uint8ClampedArray) { let count = 0; for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 20) count++; return count; }
export async function makeStencil(design: Design, cuts: CutOperation[]) {
  const bridges = cuts.filter(cut => cut.tool === 'bridge');
  const [targetImage, cutImage, bridgeImage] = await Promise.all([
    imageFromSvg(designSvg(design, '#fff')),
    imageFromSvg(cutsSvg(cuts.filter(cut => cut.tool !== 'bridge'))),
    imageFromSvg(cutsSvg(bridges.map(cut => ({ ...cut, tool: 'line' as CutTool })))),
  ]);
  const target = canvas(); const targetContext = target.getContext('2d')!; targetContext.drawImage(targetImage, 0, 0);
  const cut = canvas(); const cutContext = cut.getContext('2d')!; cutContext.drawImage(cutImage, 0, 0);
  const bridge = canvas(); const bridgeContext = bridge.getContext('2d')!; bridgeContext.drawImage(bridgeImage, 0, 0);
  const targetPixels = targetContext.getImageData(0, 0, BOARD, BOARD).data;
  const rawPixels = cutContext.getImageData(0, 0, BOARD, BOARD).data;
  const total = alphaCount(targetPixels); const raw = alphaCount(rawPixels);
  cutContext.globalCompositeOperation = 'destination-in'; cutContext.drawImage(target, 0, 0); cutContext.globalCompositeOperation = 'source-over';
  const before = cutContext.getImageData(0, 0, BOARD, BOARD).data;
  const validBefore = alphaCount(before);
  const bridgePixels = bridgeContext.getImageData(0, 0, BOARD, BOARD).data;
  const visited = new Uint8Array(BOARD * BOARD);
  let risk = 0;
  for (let index = 0; index < visited.length; index++) {
    if (visited[index] || before[index * 4 + 3] <= 20) continue;
    let area = 0; let supported = false; const queue = [index]; visited[index] = 1;
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head]; area++;
      if (bridgePixels[current * 4 + 3] > 20) supported = true;
      const x = current % BOARD; const y = Math.floor(current / BOARD);
      const neighbors = [x > 0 ? current - 1 : -1, x < BOARD - 1 ? current + 1 : -1, y > 0 ? current - BOARD : -1, y < BOARD - 1 ? current + BOARD : -1];
      for (const neighbor of neighbors) if (neighbor >= 0 && !visited[neighbor] && before[neighbor * 4 + 3] > 20) { visited[neighbor] = 1; queue.push(neighbor); }
    }
    if (area > 1800 && !supported) risk++;
  }
  cutContext.globalCompositeOperation = 'destination-out'; cutContext.drawImage(bridge, 0, 0); cutContext.globalCompositeOperation = 'source-over';
  const valid = alphaCount(cutContext.getImageData(0, 0, BOARD, BOARD).data);
  return { mask: cut.toDataURL('image/png'), coverage: Math.round(valid / Math.max(1, total) * 100), stray: Math.round((raw - validBefore) / Math.max(1, raw) * 100), risk, pixels: valid };
}

// Teaching-only bands: virtual "parts" are deliberately not a historical recipe.
export function mixQuality(mix: Mix) {
  const solids = Math.max(1, mix.bean + mix.lime);
  const waterRatio = mix.water / solids;
  const beanShare = mix.bean / solids;
  const waterPenalty = waterRatio < .55 ? (.55 - waterRatio) * 90 : waterRatio > 1.25 ? (waterRatio - 1.25) * 80 : 0;
  const balancePenalty = Math.abs(beanShare - .58) * 80;
  const stirPenalty = mix.turns < 1 ? 24 : mix.turns < 2 ? 10 : 0;
  const score = Math.round(clamp(100 - waterPenalty - balancePenalty - stirPenalty, 15, 100));
  const state = waterRatio < .55 ? '偏稠' : waterRatio > 1.25 ? '偏稀' : mix.turns < 1 ? '尚未搅匀' : '可用';
  return { score, state, waterRatio: round(waterRatio) };
}

function strokeSweep(context: CanvasRenderingContext2D, sweep: Sweep, simulate = true) {
  const first = sweep.points[0]; if (!first) return;
  context.strokeStyle = '#fff'; context.fillStyle = '#fff'; context.lineWidth = sweep.width; context.lineCap = 'round'; context.lineJoin = 'round';
  const pressure = clamp(sweep.pressure ?? 3, 1, 5);
  const speed = Math.max(0, sweep.speed ?? 300);
  const load = clamp(sweep.load ?? 100, 0, 100);
  const strength = simulate ? clamp((.32 + pressure * .15 - Math.min(.28, Math.max(0, speed - 360) / 6000)) * load / 100, .02, 1) : 1;
  if (sweep.points.length === 1) { context.globalAlpha = strength; context.beginPath(); context.arc(first.x, first.y, sweep.width / 2, 0, Math.PI * 2); context.fill(); context.globalAlpha = 1; return; }
  for (let index = 1; index < sweep.points.length; index++) {
    context.globalAlpha = strength * (simulate ? 1 - .38 * index / sweep.points.length : 1);
    context.beginPath(); context.moveTo(sweep.points[index - 1].x, sweep.points[index - 1].y);
    context.lineTo(sweep.points[index].x, sweep.points[index].y); context.stroke();
  }
  context.globalAlpha = 1;
}
export async function makePrint(stencilMask: string, impressions: Impression[], quality: number) {
  if (!stencilMask || !impressions.length) return { mask: '', coverage: 0, waste: 0, pixels: 0 };
  const stencilImage = await imageFromUrl(stencilMask);
  const combined = canvas(); const combinedContext = combined.getContext('2d')!;
  let targetPixels = 0; let coveredPixels = 0; let sweepCount = 0; let missedSweeps = 0;
  for (const impression of impressions) {
    const target = canvas(); const targetContext = target.getContext('2d')!;
    targetContext.translate(BOARD / 2 + impression.x, BOARD / 2 + impression.y);
    targetContext.rotate(impression.rotation * Math.PI / 180);
    targetContext.drawImage(stencilImage, -BOARD / 2, -BOARD / 2);
    targetContext.setTransform(1, 0, 0, 1, 0, 0);
    const pass = canvas(); const passContext = pass.getContext('2d')!;
    impression.sweeps.forEach(sweep => {
      strokeSweep(passContext, sweep);
      const single = canvas(); const singleContext = single.getContext('2d')!;
      strokeSweep(singleContext, sweep, false);
      singleContext.globalCompositeOperation = 'destination-in';
      singleContext.drawImage(target, 0, 0);
      sweepCount++;
      if (alphaCount(singleContext.getImageData(0, 0, BOARD, BOARD).data) < 8) missedSweeps++;
    });
    const targetData = targetContext.getImageData(0, 0, BOARD, BOARD).data;
    targetPixels += alphaCount(targetData);
    passContext.globalCompositeOperation = 'destination-in'; passContext.drawImage(target, 0, 0); passContext.globalCompositeOperation = 'source-over';
    coveredPixels += alphaCount(passContext.getImageData(0, 0, BOARD, BOARD).data);
    combinedContext.drawImage(pass, 0, 0);
  }
  const image = combinedContext.getImageData(0, 0, BOARD, BOARD);
  const strength = .36 + .64 * quality / 100;
  const loss = (100 - quality) / 100 * .32;
  for (let y = 0; y < BOARD; y++) for (let x = 0; x < BOARD; x++) {
    const index = (y * BOARD + x) * 4;
    if (image.data[index + 3] === 0) continue;
    const grain = ((x * 17 + y * 37 + Math.floor(x / 9) * 71 + Math.floor(y / 11) * 43) % 101) / 100;
    const local = grain < loss ? .18 : 1;
    image.data[index] = 248; image.data[index + 1] = 244; image.data[index + 2] = 231;
    image.data[index + 3] = Math.round(image.data[index + 3] * strength * local);
  }
  combinedContext.putImageData(image, 0, 0);
  return { mask: combined.toDataURL('image/png'), coverage: Math.round(coveredPixels / Math.max(1, targetPixels) * 100), waste: Math.round(missedSweeps / Math.max(1, sweepCount) * 100), pixels: coveredPixels };
}

export function dyeColor(depth: number) {
  const stops = [{ depth: 0, rgb: [232, 232, 219] }, { depth: 20, rgb: [75, 119, 153] }, { depth: 50, rgb: [36, 78, 114] }, { depth: 100, rgb: [15, 45, 79] }];
  const safe = clamp(depth, 0, 100);
  const upper = stops.findIndex(stop => stop.depth >= safe);
  const left = stops[Math.max(0, upper - 1)]; const right = stops[upper < 0 ? stops.length - 1 : upper];
  const t = left === right ? 0 : (safe - left.depth) / (right.depth - left.depth);
  const values = left.rgb.map((value, index) => Math.round(value + (right.rgb[index] - value) * t));
  return `rgb(${values.join(',')})`;
}
export function dyeGain(soakMs: number, agitation: number) {
  return Math.round(clamp(14 + Math.min(3000, soakMs) / 130 + Math.min(220, agitation) / 16, 14, 48));
}
export function workshopScore(state: WorkshopState) {
  const diversity = new Set(state.design.items.map(item => item.kind)).size;
  const design = clamp(45 + state.design.items.length * 8 + diversity * 5 + (state.design.strokes || []).length * 4, 0, 100);
  const stencil = clamp(state.stencilCoverage * .55 + (100 - state.strayCut) * .25 + Math.max(0, 100 - (state.stencilRisk || 0) * 20) * .2, 0, 100);
  const paste = mixQuality(state.mix).score;
  const sweeps = state.impressions.flatMap(impression => impression.sweeps);
  const handling = sweeps.length ? sweeps.reduce((sum, sweep) => sum + clamp((sweep.load ?? 100) * .65 + (sweep.pressure ?? 3) * 7 - Math.max(0, (sweep.speed ?? 300) - 500) / 40, 0, 100), 0) / sweeps.length : 0;
  const print = clamp(state.printCoverage * .65 + (100 - state.printWaste) * .15 + handling * .2, 0, 100);
  const dye = clamp(state.dyeDepth * .8 + Math.min(2, state.dyeCycles.length) * 10, 0, 100);
  const total = Math.round(design * .2 + stencil * .2 + paste * .2 + print * .25 + dye * .15);
  return { total, design: Math.round(design), stencil: Math.round(stencil), paste, print: Math.round(print), dye: Math.round(dye) };
}

export function loadWorkshop(): WorkshopState {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<WorkshopState> | null;
    if (!value || !value.design || !Array.isArray(value.design.items)) return initialWorkshop;
    const kinds = new Set([...MOTIFS, ...PARTS].map(item => item.kind));
    const normalizeDesign = (source: Partial<Design>): Design => ({
      items: Array.isArray(source.items) ? source.items.slice(0, 60).filter(item => item && kinds.has(item.kind) && typeof item.id === 'string' && [item.x, item.y, item.scale, item.rotation].every(Number.isFinite)) : [],
      strokes: Array.isArray(source.strokes) ? source.strokes.slice(0, 120).filter(stroke => stroke && typeof stroke.id === 'string' && Number.isFinite(stroke.width) && Array.isArray(stroke.points) && stroke.points.length >= 2 && stroke.points.length <= 1200 && stroke.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) : [],
      repeat: REPEATS.some(item => item.id === source.repeat) ? source.repeat! : 'single',
    });
    const design = normalizeDesign(value.design);
    const history = Array.isArray(value.designHistory) && value.designHistory.length ? value.designHistory.slice(-60).map(normalizeDesign) : [design];
    return {
      ...initialWorkshop, ...value, design,
      designHistory: history,
      designIndex: Number.isInteger(value.designIndex) ? clamp(value.designIndex!, 0, history.length - 1) : 0,
      cuts: Array.isArray(value.cuts) ? value.cuts.slice(0, 200) : [],
      stencilRisk: Number.isFinite(value.stencilRisk) ? Math.max(0, value.stencilRisk!) : 0,
      mix: value.mix && [value.mix.bean, value.mix.lime, value.mix.water, value.mix.turns].every(Number.isFinite) ? value.mix : initialWorkshop.mix,
      pasteLoad: Number.isFinite(value.pasteLoad) ? clamp(value.pasteLoad!, 0, 100) : 100,
      impressions: Array.isArray(value.impressions) ? value.impressions.slice(0, 12) : [],
      dyeCycles: Array.isArray(value.dyeCycles) ? value.dyeCycles.slice(0, 8) : [],
      dyeDepth: Number.isFinite(value.dyeDepth) ? clamp(value.dyeDepth!, 0, 100) : 0,
      station: STATIONS.some(item => item.id === value.station) ? value.station! : 'design',
      product: ['scarf', 'bag', 'bookmark'].includes(value.product || '') ? value.product! : 'scarf',
      title: typeof value.title === 'string' ? value.title.slice(0, 16) : initialWorkshop.title,
    };
  } catch { return initialWorkshop; }
}

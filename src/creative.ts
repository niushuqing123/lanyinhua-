export type Point = { x: number; y: number };
export type Tool = 'line' | 'petal' | 'dot';
export type Layout = 'single' | 'mirror' | 'tile';
export type Theme = 'flower' | 'butterfly' | 'fish' | 'geometry';
export type Mark = { id: string; tool: Tool; points: Point[]; size: number };

export const SIZE = 400;
export const themes: { id: Theme; name: string; cue: string; glyph: string; hint: string }[] = [
  { id: 'flower', name: '花卉', cue: '从一瓣开始', glyph: '✿', hint: '试试画一片花瓣，再为它添上茎和花心。' },
  { id: 'butterfly', name: '蝶影', cue: '让两翼不同', glyph: '⋈', hint: '从两侧的弧线出发，用点与细线构成自己的蝶影。' },
  { id: 'fish', name: '游鱼', cue: '画一尾灵动', glyph: '◈', hint: '先画身形的曲线，再用短线和圆点补充细节。' },
  { id: 'geometry', name: '几何', cue: '让秩序生长', glyph: '◇', hint: '把线、点与留白组合起来，寻找自己的节奏。' },
];
export const layouts: { id: Layout; name: string; description: string }[] = [
  { id: 'single', name: '独幅', description: '保留原样' },
  { id: 'mirror', name: '对印', description: '左右照映' },
  { id: 'tile', name: '四方', description: '四角连印' },
];

const n = (value: number) => Math.round(value * 10) / 10;
const p = (point: Point) => `${n(point.x)} ${n(point.y)}`;

export function markShape(mark: Mark): { tag: 'path' | 'circle'; props: Record<string, string | number> } {
  const points = mark.points;
  const first = points[0] || { x: 0, y: 0 };
  const last = points[points.length - 1] || first;
  if (mark.tool === 'dot') {
    const radius = Math.max(mark.size / 2, Math.hypot(last.x - first.x, last.y - first.y));
    return { tag: 'circle', props: { cx: n(first.x), cy: n(first.y), r: n(Math.min(50, radius)), fill: 'currentColor' } };
  }
  if (mark.tool === 'petal') {
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length * Math.min(32, mark.size * 1.45);
    const ny = dx / length * Math.min(32, mark.size * 1.45);
    const one = { x: first.x + dx * .34 + nx, y: first.y + dy * .34 + ny };
    const two = { x: first.x + dx * .66 + nx, y: first.y + dy * .66 + ny };
    const three = { x: first.x + dx * .66 - nx, y: first.y + dy * .66 - ny };
    const four = { x: first.x + dx * .34 - nx, y: first.y + dy * .34 - ny };
    return { tag: 'path', props: { d: `M ${p(first)} C ${p(one)} ${p(two)} ${p(last)} C ${p(three)} ${p(four)} ${p(first)} Z`, fill: 'currentColor' } };
  }
  const d = points.length <= 2 ? `M ${p(first)} L ${p(last)}` : `M ${p(first)} ` + points.slice(1, -1).map((point, index) => {
    const next = points[index + 2];
    return `Q ${p(point)} ${p({ x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 })}`;
  }).join(' ') + ` L ${p(last)}`;
  return { tag: 'path', props: { d, fill: 'none', stroke: 'currentColor', 'stroke-width': n(mark.size), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } };
}

function shapeMarkup(mark: Mark) {
  const shape = markShape(mark);
  const attributes = Object.entries(shape.props).map(([key, value]) => `${key}="${value}"`).join(' ');
  return `<${shape.tag} ${attributes}/>`;
}

export function artworkSvg(marks: Mark[], layout: Layout = 'single', color = '#f7f2e8', background = 'none', scale = 1, rotation = 0) {
  const content = `<g transform="translate(200 200) rotate(${rotation}) scale(${scale}) translate(-200 -200)">${marks.map(shapeMarkup).join('')}</g>`;
  const repeats = layout === 'mirror'
    ? `<g>${content}</g><g transform="translate(400 0) scale(-1 1)">${content}</g>`
    : layout === 'tile'
      ? [[0, 0], [200, 0], [0, 200], [200, 200]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(.5)">${content}</g>`).join('')
      : content;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><rect width="400" height="400" fill="${background === 'none' ? 'none' : background}"/><g color="${color}">${repeats}</g></svg>`;
}

export const dataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export async function maskFromMarks(marks: Mark[], layout: Layout, scale = 1, rotation = 0): Promise<string> {
  const image = new Image();
  const src = dataUrl(artworkSvg(marks, layout, '#ffffff', 'none', scale, rotation));
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('花版生成失败')); image.src = src; });
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  canvas.getContext('2d')?.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function cleanMarks(input: unknown): Mark[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 120).filter((value): value is Mark => {
    if (!value || typeof value !== 'object') return false;
    const mark = value as Mark;
    return typeof mark.id === 'string' && ['line', 'petal', 'dot'].includes(mark.tool) &&
      Number.isFinite(mark.size) && mark.size > 0 && mark.size <= 48 &&
      Array.isArray(mark.points) && mark.points.length > 0 && mark.points.length <= 500 &&
      mark.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= SIZE && point.y >= 0 && point.y <= SIZE);
  });
}

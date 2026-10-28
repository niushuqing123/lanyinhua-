import { useRef, useState } from 'react';
import { type Mark, type Point, type Tool, markShape, SIZE } from './creative';

type Props = {
  marks: Mark[];
  guide?: Mark[];
  tool: Tool;
  size: number;
  mode: 'sketch' | 'carve';
  onAdd: (mark: Mark) => void;
};

function MarkView({ mark, opacity = 1 }: { mark: Mark; opacity?: number }) {
  const shape = markShape(mark);
  return shape.tag === 'circle'
    ? <circle key={mark.id} cx={Number(shape.props.cx)} cy={Number(shape.props.cy)} r={Number(shape.props.r)} fill="currentColor" opacity={opacity} />
    : <path key={mark.id} d={String(shape.props.d)} fill={String(shape.props.fill)} stroke={shape.props.stroke ? 'currentColor' : undefined} strokeWidth={shape.props['stroke-width'] ? Number(shape.props['stroke-width']) : undefined} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
}

export default function GestureBoard({ marks, guide = [], tool, size, mode, onAdd }: Props) {
  const origin = useRef<Point | null>(null);
  const sampled = useRef<Point[]>([]);
  const [draft, setDraft] = useState<Mark | null>(null);
  const pointOf = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(SIZE, (event.clientX - rect.left) * SIZE / rect.width)), y: Math.max(0, Math.min(SIZE, (event.clientY - rect.top) * SIZE / rect.height)) };
  };
  function begin(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointOf(event);
    origin.current = point;
    sampled.current = [point];
    setDraft({ id: 'draft', tool, points: [point, point], size });
  }
  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (!origin.current) return;
    event.preventDefault();
    const point = pointOf(event);
    if (tool === 'line') {
      const previous = sampled.current[sampled.current.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 2) sampled.current.push(point);
    } else sampled.current = [origin.current, point];
    setDraft({ id: 'draft', tool, points: [...sampled.current], size });
  }
  function finish(event: React.PointerEvent<SVGSVGElement>) {
    if (!origin.current) return;
    event.preventDefault();
    const point = pointOf(event);
    if (tool === 'line') sampled.current.push(point);
    else sampled.current = [origin.current, point];
    const points = sampled.current;
    const travel = Math.hypot(point.x - origin.current.x, point.y - origin.current.y);
    if (tool === 'dot' || travel >= 6) onAdd({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, tool, points: [...points], size });
    origin.current = null; sampled.current = []; setDraft(null);
  }
  return <div className={`gesture-board ${mode}`}>
    <div className="board-topline"><span>{mode === 'sketch' ? '你的纹样，从这里开始' : '你刻出的每一刀，都会留在花版上'}</span><span>{String(marks.length).padStart(2, '0')} 笔</span></div>
    <svg className="gesture-svg" viewBox="0 0 400 400" role="img" aria-label={mode === 'sketch' ? '空白起稿纸，选择工具后在这里亲手创作' : '花版刻制区，沿草稿或自由刻出自己的刀路'} onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { origin.current = null; sampled.current = []; setDraft(null); }}>
      <defs><pattern id={`paper-grain-${mode}`} width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 .5 H9 M.5 0 V9" stroke={mode === 'sketch' ? '#9e9584' : '#887c65'} strokeOpacity=".14" strokeWidth=".5" /></pattern></defs>
      <rect width="400" height="400" fill={mode === 'sketch' ? '#f5efe2' : '#c9b99d'} />
      <rect width="400" height="400" fill={`url(#paper-grain-${mode})`} />
      <path d="M200 20 V380 M20 200 H380" stroke={mode === 'sketch' ? '#aa9c87' : '#897d68'} strokeWidth=".7" strokeDasharray="5 7" opacity=".35" />
      <rect x="18" y="18" width="364" height="364" fill="none" stroke={mode === 'sketch' ? '#b2a891' : '#806f57'} strokeWidth="1" opacity=".58" />
      {mode === 'carve' && <g className="sketch-guide" color="#584f42">{guide.map(mark => <MarkView key={mark.id} mark={mark} opacity={.2} />)}</g>}
      <g color={mode === 'sketch' ? '#30576a' : '#224b62'}>{marks.map(mark => <MarkView key={mark.id} mark={mark} />)}{draft && <MarkView mark={draft} opacity={.7} />}</g>
    </svg>
    {marks.length === 0 && <div className="board-empty" aria-hidden="true"><span>{mode === 'sketch' ? '落 下 第 一 笔' : '从第一道刀路开始'}</span><small>{mode === 'sketch' ? '线 · 瓣 · 点，由你组合' : '浅色线条只是草稿，你可以改刻法'}</small></div>}
    <div className="board-bottomline"><span>400 × 400 / {mode === 'sketch' ? '起稿纸' : '花版'}</span><span>↗ 触摸或鼠标绘制</span></div>
  </div>;
}

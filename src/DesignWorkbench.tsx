import { useMemo, useRef, useState } from 'react';
import { BOARD, MOTIFS, MOTIF_ART, PARTS, REPEATS, designSvg, motifUrl, newId, strokePath, svgUrl, type Design, type DesignStroke, type MotifItem, type Point } from './workshopModel';

type Props = { design: Design; canUndo: boolean; canRedo: boolean; onCommit: (design: Design) => void; onUndo: () => void; onRedo: () => void; onNext: () => void };
type Drag = { type: 'item'; original: MotifItem; start: Point } | { type: 'stroke'; original: DesignStroke; start: Point };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export default function DesignWorkbench({ design, canUndo, canRedo, onCommit, onUndo, onRedo, onNext }: Props) {
  const [mode, setMode] = useState<'select' | 'draw'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<MotifItem | null>(null);
  const [draftStroke, setDraftStroke] = useState<DesignStroke | null>(null);
  const [drawWidth, setDrawWidth] = useState(9);
  const drag = useRef<Drag | null>(null);
  const drawing = useRef<Point[] | null>(null);
  const display: Design = {
    ...design,
    items: draftItem ? design.items.map(item => item.id === draftItem.id ? draftItem : item) : design.items,
    strokes: draftStroke && drawing.current ? [...design.strokes, draftStroke] : draftStroke ? design.strokes.map(stroke => stroke.id === draftStroke.id ? draftStroke : stroke) : design.strokes,
  };
  const selectedItem = display.items.find(item => item.id === selectedId) || null;
  const selectedStroke = display.strokes.find(stroke => stroke.id === selectedId) || null;
  const preview = useMemo(() => svgUrl(designSvg(display, '#f8f4e8', '#194467')), [display]);
  const point = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) * BOARD / rect.width, 0, BOARD), y: clamp((event.clientY - rect.top) * BOARD / rect.height, 0, BOARD) };
  };
  function add(kind: MotifItem['kind'], part = false) {
    const index = design.items.length;
    const item: MotifItem = { id: newId(), kind, x: part ? 200 + ((index % 3) - 1) * 58 : 150 + (index % 2) * 100, y: part ? 200 + (Math.floor(index / 3) % 3 - 1) * 58 : 150 + (Math.floor(index / 2) % 2) * 100, scale: part ? .78 : 1.15, rotation: 0, flip: false };
    onCommit({ ...design, items: [...design.items, item] }); setSelectedId(item.id); setMode('select');
  }
  function patchItem(value: Partial<MotifItem>) {
    if (!selectedItem) return;
    onCommit({ ...design, items: design.items.map(item => item.id === selectedItem.id ? { ...item, ...value } : item) });
  }
  function patchStroke(value: Partial<DesignStroke>) {
    if (!selectedStroke) return;
    onCommit({ ...design, strokes: design.strokes.map(stroke => stroke.id === selectedStroke.id ? { ...stroke, ...value } : stroke) });
  }
  function begin(event: React.PointerEvent<SVGSVGElement>) {
    const p = point(event);
    if (mode === 'draw') {
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      drawing.current = [p]; setDraftStroke({ id: 'draft', points: [p, p], width: drawWidth }); setSelectedId(null); return;
    }
    const target = event.target as Element;
    const itemHit = target.closest('[data-motif-id]'); const strokeHit = target.closest('[data-stroke-id]');
    if (!itemHit && !strokeHit) { setSelectedId(null); return; }
    if (itemHit) {
      const item = design.items.find(value => value.id === itemHit.getAttribute('data-motif-id'));
      if (!item) return;
      drag.current = { type: 'item', original: item, start: p }; setSelectedId(item.id);
    } else {
      const stroke = design.strokes.find(value => value.id === strokeHit?.getAttribute('data-stroke-id'));
      if (!stroke) return;
      drag.current = { type: 'stroke', original: stroke, start: p }; setSelectedId(stroke.id);
    }
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent<SVGSVGElement>) {
    const p = point(event);
    if (drawing.current) {
      event.preventDefault(); const last = drawing.current[drawing.current.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 2) drawing.current.push(p);
      setDraftStroke({ id: 'draft', points: [...drawing.current, p], width: drawWidth }); return;
    }
    if (!drag.current) return;
    event.preventDefault(); const { start, original } = drag.current;
    const dx = p.x - start.x; const dy = p.y - start.y;
    if (drag.current.type === 'item') setDraftItem({ ...(original as MotifItem), x: clamp((original as MotifItem).x + dx, 12, 388), y: clamp((original as MotifItem).y + dy, 12, 388) });
    else setDraftStroke({ ...(original as DesignStroke), points: (original as DesignStroke).points.map(value => ({ x: clamp(value.x + dx, 0, 400), y: clamp(value.y + dy, 0, 400) })) });
  }
  function finish(event: React.PointerEvent<SVGSVGElement>) {
    if (drawing.current) {
      event.preventDefault(); const p = point(event); const points = [...drawing.current, p]; drawing.current = null; setDraftStroke(null);
      const length = points.slice(1).reduce((sum, value, index) => sum + Math.hypot(value.x - points[index].x, value.y - points[index].y), 0);
      if (length > 7) { const stroke = { id: newId(), points, width: drawWidth }; onCommit({ ...design, strokes: [...design.strokes, stroke] }); setSelectedId(stroke.id); }
      return;
    }
    if (!drag.current) return;
    event.preventDefault(); const p = point(event); const current = drag.current; drag.current = null;
    const dx = p.x - current.start.x; const dy = p.y - current.start.y;
    if (Math.hypot(dx, dy) > 2) {
      if (current.type === 'item') onCommit({ ...design, items: design.items.map(item => item.id === current.original.id ? { ...item, x: clamp(item.x + dx, 12, 388), y: clamp(item.y + dy, 12, 388) } : item) });
      else onCommit({ ...design, strokes: design.strokes.map(stroke => stroke.id === current.original.id ? { ...stroke, points: stroke.points.map(value => ({ x: clamp(value.x + dx, 0, 400), y: clamp(value.y + dy, 0, 400) })) } : stroke) });
    }
    setDraftItem(null); setDraftStroke(null);
  }
  const count = design.items.length + design.strokes.length;
  return <section className="wb-panel design-workbench">
    <div className="wb-intro"><span>01 / DESIGN DESK</span><h1>纹样设计台</h1><p>可以使用完整传统风格纹样，也能从单瓣、枝条等部件搭建，或亲手画出一条线。每个元素会进入花版与成品。</p></div>
    <div className="wb-section-label"><strong>纹样素材 / 6 款</strong><span>作为构图起点</span></div>
    <div className="motif-tray">{MOTIFS.map(item => <button key={item.kind} type="button" aria-label={`添加${item.name}`} onClick={() => add(item.kind)}><img src={motifUrl(item.kind)} alt=""/><strong>{item.name}</strong><small>{item.cue}</small></button>)}</div>
    <div className="wb-section-label"><strong>拆开来做 / 4 种部件</strong><span>逐个拼成自己的纹样</span></div>
    <div className="motif-parts">{PARTS.map(item => <button key={item.kind} aria-label={`添加${item.name}`} onClick={() => add(item.kind, true)}><img src={motifUrl(item.kind)} alt=""/><span>{item.name}</span></button>)}</div>
    <div className="wb-section-label"><strong>自由构图画布</strong><span>{count} 个元素</span></div>
    <div className="design-mode-row"><button className={mode === 'select' ? 'active' : ''} onClick={() => setMode('select')}>▣ 选择与移动</button><button className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')}>✎ 亲手画线</button></div>
    {mode === 'draw' && <div className="design-pen-control"><label htmlFor="design-pen-width">线条粗细 <b>{drawWidth}</b></label><input id="design-pen-width" type="range" min="4" max="24" value={drawWidth} onChange={event => setDrawWidth(Number(event.target.value))}/></div>}
    <div className="design-canvas-wrap"><svg className={`design-editor-canvas mode-${mode}`} viewBox="0 0 400 400" role="img" aria-label="纹样编辑画布，可拖动部件或手绘线条" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { drag.current = null; drawing.current = null; setDraftItem(null); setDraftStroke(null); }}>
      <defs><pattern id="design-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 H0 V20" fill="none" stroke="#b7b6a9" strokeOpacity=".3" strokeWidth=".6"/></pattern></defs>
      <rect width="400" height="400" fill="#efe9dc"/><rect width="400" height="400" fill="url(#design-grid)"/>
      <path d="M200 0 V400 M0 200 H400" stroke="#aa9a7d" strokeOpacity=".45" strokeDasharray="5 6"/>
      {display.items.map(item => <g key={item.id} data-motif-id={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.scale * (item.flip ? -1 : 1)} ${item.scale}) translate(-50 -50)`} fill={item.id === selectedId ? '#173f60' : '#4d6870'} color={item.id === selectedId ? '#173f60' : '#4d6870'} dangerouslySetInnerHTML={{ __html: MOTIF_ART[item.kind] }} />)}
      {display.strokes.map(stroke => <g key={stroke.id} data-stroke-id={stroke.id}><path d={strokePath(stroke.points)} fill="none" stroke={stroke.id === selectedId ? '#173f60' : '#4d6870'} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round"/><path d={strokePath(stroke.points)} fill="none" stroke="transparent" strokeWidth={Math.max(24, stroke.width + 12)} strokeLinecap="round" strokeLinejoin="round" pointerEvents="stroke"/></g>)}
      {selectedItem && <g pointerEvents="none"><rect x={selectedItem.x - 55 * selectedItem.scale} y={selectedItem.y - 55 * selectedItem.scale} width={110 * selectedItem.scale} height={110 * selectedItem.scale} fill="none" stroke="#b07750" strokeWidth="2" strokeDasharray="5 5"/><circle cx={selectedItem.x} cy={selectedItem.y} r="4" fill="#b07750"/></g>}
    </svg>{count === 0 && <div className="canvas-placeholder">从素材或部件开始<br/><small>也可以选择“亲手画线”</small></div>}</div>
    <div className="edit-actions"><button onClick={onUndo} disabled={!canUndo}>↶ 撤销</button><button onClick={onRedo} disabled={!canRedo}>↷ 重做</button><button onClick={() => { if (selectedItem) patchItem({ flip: !selectedItem.flip }); else if (selectedStroke) { const center = selectedStroke.points.reduce((sum, p) => sum + p.x, 0) / selectedStroke.points.length; patchStroke({ points: selectedStroke.points.map(p => ({ x: clamp(center * 2 - p.x, 0, 400), y: p.y })) }); } }} disabled={!selectedId}>⇄ 镜像</button><button onClick={() => { if (selectedItem) { const copy = { ...selectedItem, id: newId(), x: clamp(selectedItem.x + 24, 12, 388), y: clamp(selectedItem.y + 24, 12, 388) }; onCommit({ ...design, items: [...design.items, copy] }); setSelectedId(copy.id); } else if (selectedStroke) { const copy = { ...selectedStroke, id: newId(), points: selectedStroke.points.map(p => ({ x: clamp(p.x + 24, 0, 400), y: clamp(p.y + 24, 0, 400) })) }; onCommit({ ...design, strokes: [...design.strokes, copy] }); setSelectedId(copy.id); } }} disabled={!selectedId}>⧉ 复制</button><button onClick={() => { if (!selectedId) return; onCommit({ ...design, items: design.items.filter(item => item.id !== selectedId), strokes: design.strokes.filter(stroke => stroke.id !== selectedId) }); setSelectedId(null); }} disabled={!selectedId}>⌫ 删除</button></div>
    {selectedItem && <div className="transform-controls"><div><label htmlFor="motif-scale">大小 <b>{Math.round(selectedItem.scale * 100)}%</b></label><input id="motif-scale" type="range" min="0.3" max="1.6" step="0.05" value={selectedItem.scale} onChange={event => patchItem({ scale: Number(event.target.value) })}/></div><div><label htmlFor="motif-rotation">旋转 <b>{selectedItem.rotation}°</b></label><input id="motif-rotation" type="range" min="-180" max="180" step="5" value={selectedItem.rotation} onChange={event => patchItem({ rotation: Number(event.target.value) })}/></div></div>}
    {selectedStroke && <div className="transform-controls one"><div><label htmlFor="stroke-width">所选手绘线粗细 <b>{selectedStroke.width}</b></label><input id="stroke-width" type="range" min="4" max="24" value={selectedStroke.width} onChange={event => patchStroke({ width: Number(event.target.value) })}/></div></div>}
    <div className="wb-section-label"><strong>排列方式</strong><span>影响花版与最终印布</span></div>
    <div className="repeat-options">{REPEATS.map(item => <button key={item.id} className={design.repeat === item.id ? 'active' : ''} aria-pressed={design.repeat === item.id} onClick={() => onCommit({ ...design, repeat: item.id })}>{item.name}</button>)}</div>
    <div className="live-preview"><div><strong>局部试染样片</strong><small>只露出布面一角。完整图案会随着刻版、上浆与浸染逐渐形成。</small></div><div className="preview-swatch"><img src={preview} alt="当前构图的局部蓝白试染预览"/></div></div>
    <div className="wb-footer"><p>{mode === 'draw' ? '在画布上按住并画线；画完可选中、移动、调粗细或撤销。' : selectedItem ? '已选中部件，拖动可调整位置。' : selectedStroke ? '已选中手绘线，拖动可移动整条线。' : '选择素材或部件，也可以用笔迹自己塑造形状。'}</p><button className="wb-primary" onClick={onNext} disabled={!count}>带着设计进入刻版台 ↗</button></div>
  </section>;
}

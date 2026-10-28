import { useRef, useState } from 'react';
import { BOARD, mixQuality, newId, type Impression, type Mix, type Point, type Sweep } from './workshopModel';

type Props = { stencilMask: string; mix: Mix; impressions: Impression[]; printMask: string; coverage: number; waste: number; pasteLoad: number; busy: boolean; onChange: (impressions: Impression[]) => void; onPasteLoad: (load: number) => void; onNext: () => void };
type Mode = 'place' | 'scrape' | 'inspect';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function PrintWorkbench({ stencilMask, mix, impressions, printMask, coverage, waste, pasteLoad, busy, onChange, onPasteLoad, onNext }: Props) {
  const [mode, setMode] = useState<Mode>('place');
  const [pressure, setPressure] = useState(3);
  const [draftPosition, setDraftPosition] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [feedback, setFeedback] = useState('拖动花版，决定纹样在布上的位置。');
  const positionStart = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const sweepPoints = useRef<Point[]>([]);
  const sweepStarted = useRef(0);
  const current = impressions[impressions.length - 1];
  const placement = draftPosition || { x: current?.x || 0, y: current?.y || 0 };
  const quality = mixQuality(mix);
  const lastSweep = current?.sweeps[current.sweeps.length - 1];
  const boardPoint = (event: React.PointerEvent<HTMLElement>): Point => { const rect = event.currentTarget.getBoundingClientRect(); return { x: clamp((event.clientX - rect.left) * BOARD / rect.width, 0, BOARD), y: clamp((event.clientY - rect.top) * BOARD / rect.height, 0, BOARD) }; };
  function commitPlacement(x: number, y: number) {
    if (!current) return;
    onChange(impressions.map(item => item.id === current.id ? { ...item, x, y } : item));
  }
  function finishSweep() {
    if (!current || !sweepPoints.current.length) return;
    const points = [...sweepPoints.current];
    const distance = points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
    const durationMs = Math.max(80, Math.round(performance.now() - sweepStarted.current));
    const speed = Math.round(distance / durationMs * 1000);
    const sweep: Sweep = { id: newId(), points, width: 38 + pressure * 14, pressure, speed, load: pasteLoad, durationMs };
    onChange(impressions.map(item => item.id === current.id ? { ...item, sweeps: [...item.sweeps, sweep] } : item));
    onPasteLoad(Math.max(0, pasteLoad - Math.round(distance / 8 + pressure * 4)));
    sweepPoints.current = []; setCursor(null);
    setFeedback(speed > 900 ? `这次推进较快（${speed} 格/秒），白纹可能偏浅；可放慢或补刮。` : `这次推进 ${speed} 格/秒、力度 ${pressure} 级。抬版可检查实际浆痕。`);
  }
  return <section className="wb-panel print-workbench"><div className="wb-intro"><span>04 / STENCIL PRINTING</span><h1>拷花上浆台</h1><p>先在白布上摆放花版，再调刮板力度、蘸浆并从一侧推过。速度、力度与剩余浆量会改变实际白纹厚薄。</p></div>
    <div className="print-tool-shelf"><div><i>▱</i><span>白棉布</span></div><div><i>▤</i><span>你的油纸版</span></div><div><i>▰</i><span>木刮板</span></div><div><i>◍</i><span>浆质 {quality.score}</span></div></div>
    <div className="print-board" onPointerDown={event => { if (mode !== 'place' || !current) return; if (current.sweeps.length) { setFeedback('这一处已经上浆。若要换位置，请点“再印一处”。'); return; } event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); positionStart.current = { clientX: event.clientX, clientY: event.clientY, x: current.x, y: current.y }; }} onPointerMove={event => { if (!positionStart.current || mode !== 'place') return; event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); const scale = BOARD / rect.width; setDraftPosition({ x: clamp(positionStart.current.x + (event.clientX - positionStart.current.clientX) * scale, -95, 95), y: clamp(positionStart.current.y + (event.clientY - positionStart.current.clientY) * scale, -95, 95) }); }} onPointerUp={event => { if (!positionStart.current || mode !== 'place') return; event.preventDefault(); positionStart.current = null; if (draftPosition) { commitPlacement(draftPosition.x, draftPosition.y); setDraftPosition(null); setFeedback('花版位置已确定。按“压版”后拖动刮板上浆。'); } }} onPointerCancel={() => { positionStart.current = null; setDraftPosition(null); }}>
      <div className="print-cloth"><div className="fabric-weave"/>{printMask && <img src={printMask} alt="已落在布上的白浆"/>}</div>
      {mode !== 'inspect' && <div className={`placed-stencil ${mode}`} style={{ transform: `translate(calc(-50% + ${placement.x / 4}%), calc(-50% + ${placement.y / 4}%)) rotate(${current?.rotation || 0}deg)` }}><img src={stencilMask} alt="刻好的油纸花版"/><span>花版 {impressions.length}</span></div>}
      {mode === 'scrape' && <div className="scrape-capture" role="img" aria-label="按住布面拖动木刮板通过花版" onPointerDown={event => { if (pasteLoad < 8) { setFeedback('刮板已经缺浆，先点击“蘸浆”。'); return; } event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const p = boardPoint(event); sweepPoints.current = [p]; sweepStarted.current = performance.now(); setCursor(p); }} onPointerMove={event => { if (!sweepPoints.current.length) return; event.preventDefault(); const p = boardPoint(event); const last = sweepPoints.current[sweepPoints.current.length - 1]; if (Math.hypot(p.x - last.x, p.y - last.y) > 2) sweepPoints.current.push(p); setCursor(p); }} onPointerUp={event => { event.preventDefault(); finishSweep(); }} onPointerCancel={finishSweep} />}
      {cursor && <div className="print-squeegee" style={{ left: `${cursor.x / 4}%`, top: `${cursor.y / 4}%` }}>木刮板</div>}
      {mode === 'inspect' && <div className="inspection-label">花版已抬起 · 检查实际浆痕</div>}
    </div>
    <div className="print-mode-controls"><button className={mode === 'place' ? 'active' : ''} onClick={() => setMode('place')}>① 放版</button><button className={mode === 'scrape' ? 'active' : ''} onClick={() => { setMode('scrape'); setFeedback('从花版一侧拖到另一侧。每次经过都记录为一次刮浆。'); }}>② 压版刮浆</button><button className={mode === 'inspect' ? 'active' : ''} onClick={() => setMode('inspect')}>③ 抬版检查</button></div>
    <div className="print-position-controls"><label htmlFor="print-rotation">花版角度 <b>{current?.rotation || 0}°</b></label><input id="print-rotation" type="range" min="-35" max="35" step="5" value={current?.rotation || 0} disabled={Boolean(current?.sweeps.length)} onChange={event => { if (!current) return; const rotation = Number(event.target.value); onChange(impressions.map(item => item.id === current.id ? { ...item, rotation } : item)); }}/></div>
    <div className="squeegee-settings"><div><label htmlFor="squeegee-pressure">刮板力度 <b>{pressure} / 5</b></label><input id="squeegee-pressure" type="range" min="1" max="5" step="1" value={pressure} onChange={event => setPressure(Number(event.target.value))}/></div><div className="paste-reservoir"><span>刮板剩余浆量 <b>{pasteLoad}%</b></span><div className="paste-reservoir-track"><i style={{ width: `${pasteLoad}%` }}/></div><button onClick={() => { onPasteLoad(100); setFeedback('刮板已重新蘸浆。慢而稳地经过刻口会留下更饱满的白纹。'); }} disabled={pasteLoad >= 100}>蘸浆 ↗</button></div></div>
    <div className="craft-metrics"><div><span>实际覆盖刻口</span><strong>{coverage}%</strong><small>未覆盖区域会染成蓝色</small></div><div><span>无效刮板动作</span><strong>{waste}%</strong><small>刮板未经过刻口</small></div></div>
    <div className="print-feedback">{busy ? '正在计算浆痕…' : feedback}{coverage > 0 && coverage < 70 ? ' 当前仍有明显漏刮。' : ''}{lastSweep && <small> 上一刮：力度 {lastSweep.pressure ?? 3} · 速度 {lastSweep.speed ?? 300} 格/秒 · 起始浆量 {lastSweep.load ?? 100}%</small>}</div>
    <div className="print-operations"><button onClick={() => { if (!current?.sweeps.length) return; onChange(impressions.map(item => item.id === current.id ? { ...item, sweeps: item.sweeps.slice(0, -1) } : item)); }}>↶ 撤销一刮</button><button onClick={() => { if (impressions.length >= 4) { setFeedback('一块布最多演示四处印花。'); return; } onChange([...impressions, { id: newId(), x: 0, y: 0, rotation: 0, sweeps: [] }]); setMode('place'); setFeedback('新花版已放到白布上，可拖动到另一处再印。'); }}>＋ 再印一处</button></div>
    <div className="wb-footer"><p>已经印了 {impressions.filter(item => item.sweeps.length).length} 处。浆料质量 {quality.score} 分会影响成品白纹的浓淡与瑕疵。</p><button className="wb-primary" disabled={!printMask || coverage === 0 || busy} onClick={onNext}>带着花布去染缸 ↗</button></div>
  </section>;
}

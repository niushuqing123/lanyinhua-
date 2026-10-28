import { useEffect, useRef, useState } from 'react';
import { dyeColor, dyeGain, type DyeCycle } from './workshopModel';

type Props = { mask: string; cycles: DyeCycle[]; depth: number; onCycle: (cycle: DyeCycle) => void; onNext: () => void };
type Phase = 'ready' | 'immersed' | 'air';
export default function DyeWorkbench({ mask, cycles, depth, onCycle, onNext }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [height, setHeight] = useState(13);
  const [agitation, setAgitation] = useState(0);
  const [soak, setSoak] = useState(0);
  const [air, setAir] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(0); const movement = useRef(0); const last = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (phase !== 'immersed') return;
    const timer = window.setInterval(() => setSoak(Math.min(8000, performance.now() - start.current)), 80);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'air') return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / 1450);
      setAir(progress);
      if (progress >= 1) {
        window.clearInterval(timer);
        const soakMs = Math.round(soak); const moved = Math.round(agitation);
        onCycle({ soakMs, agitation: moved, gain: dyeGain(soakMs, moved) });
        setPhase('ready'); setHeight(13); setSoak(0); setAgitation(0); movement.current = 0; setAir(0);
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [phase]);
  const depthPreview = phase === 'air' ? Math.min(100, depth + dyeGain(soak, agitation) * air) : depth;
  function locate(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(9, Math.min(56, (event.clientY - rect.top) / rect.height * 100 - 12));
  }
  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (phase === 'air' || cycles.length >= 4) return;
    if (!(event.target as Element).closest('.vat-cloth')) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY }; setDragging(true);
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    event.preventDefault();
    const y = locate(event); setHeight(y);
    if (phase === 'immersed' && last.current) {
      movement.current += Math.abs(event.clientX - last.current.x) + Math.abs(event.clientY - last.current.y) * .25;
      setAgitation(Math.min(220, Math.round(movement.current)));
    }
    last.current = { x: event.clientX, y: event.clientY };
  }
  function release(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const y = locate(event); setDragging(false); last.current = null;
    if (phase === 'ready' && y > 39) { setPhase('immersed'); setHeight(50); start.current = performance.now(); }
    else if (phase === 'immersed' && y < 31) { setHeight(13); setSoak(Math.max(soak, performance.now() - start.current)); setPhase('air'); }
    else setHeight(phase === 'immersed' ? 50 : 13);
  }
  return <section className="wb-panel dye-workbench"><div className="wb-intro"><span>05 / INDIGO VAT</span><h1>靛蓝浸染台</h1><p>抓住布上方的木杆拖入染缸，停留并轻晃，再亲手提到空气中。出缸显色完成后还可重复浸染。</p></div>
    <div className="dye-dashboard"><div><span>已浸染</span><strong>{cycles.length} 次</strong></div><div><span>模拟蓝色深度</span><strong data-testid="dye-depth">{depth} / 100</strong></div><div><span>本次浸染</span><strong>{(soak / 1000).toFixed(1)} 秒</strong></div></div>
    <div className={`vat-scene ${phase}`} aria-label="染缸操作区" onPointerDown={startDrag} onPointerMove={move} onPointerUp={release} onPointerCancel={() => setDragging(false)}>
      <div className="vat-scene-wall"/><div className="vat-rope"/>
      <div className="vat-cloth" style={{ top: `${height}%`, backgroundColor: dyeColor(depthPreview) }}><div className="vat-rod"/><div className="vat-cloth-weave"/><img src={mask} alt="上浆后留下的纹样"/><span className="vat-grip">↕ 拖动木杆与布</span></div>
      <div className="vat-body"><div className="vat-liquid"><i/><i/><i/></div><div className="vat-front-new"><span>靛 蓝 染 缸</span></div></div>
      {phase === 'air' && <div className="air-indicator">接触空气 · 显色 {Math.round(air * 100)}%</div>}
      {phase === 'immersed' && <div className="soak-indicator">浸染中 · 拖动轻晃后向上提出</div>}
    </div>
    <div className="dye-process"><div className={phase === 'ready' ? 'active' : ''}>① 拖入染缸</div><div className={phase === 'immersed' ? 'active' : ''}>② 停留与轻晃</div><div className={phase === 'air' ? 'active' : ''}>③ 提出显色</div></div>
    <div className="dye-history"><strong>浸染记录</strong>{cycles.length ? cycles.map((cycle, index) => <div key={index}><span>第 {index + 1} 次 · {(cycle.soakMs / 1000).toFixed(1)} 秒 · 晃动 {cycle.agitation}</span><b>＋{cycle.gain} 深度</b></div>) : <p>还没有浸染。停留时间、晃动与次数共同影响最终蓝色。</p>}</div>
    <div className="wb-footer"><p>{phase === 'air' ? '布面正与空气接触，颜色会逐渐显现。' : cycles.length >= 4 ? '教学模拟最多进行四次浸染。' : phase === 'immersed' ? '可以再停留，也可以向上提布出缸。' : '出缸后可再次入缸；下一次会继续累积蓝色深度。'}</p><button className="wb-primary" disabled={!cycles.length || phase !== 'ready'} onClick={onNext}>去浆显花，看见成品 ↗</button></div>
  </section>;
}

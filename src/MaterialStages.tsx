import { useEffect, useRef, useState } from 'react';
import { SIZE } from './creative';

export function Fabric({ mask, tone = 'blue', className = '' }: { mask: string; tone?: 'cotton' | 'wet' | 'blue'; className?: string }) {
  return <div className={`made-fabric ${tone} ${className}`} role="img" aria-label="由亲手刻版和上浆形成的花布"><div className="fabric-weave" />{mask && <img src={mask} alt="" draggable={false} />}</div>;
}

export function PasteBoard({ cutMask, value, onChange }: { cutMask: string; value: string; onChange: (mask: string, percent: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cutRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const inkRef = useRef(100);
  const [ink, setInk] = useState(100);
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let active = true;
    setReady(false);
    const mask = new Image();
    mask.onload = () => {
      if (!active) return;
      cutRef.current = mask;
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (context && canvas) {
        context.clearRect(0, 0, SIZE, SIZE);
        if (value) {
          const saved = new Image();
          saved.onload = () => { if (active) { context.drawImage(saved, 0, 0, SIZE, SIZE); setReady(true); } };
          saved.src = value;
        } else setReady(true);
      }
    };
    mask.src = cutMask;
    return () => { active = false; };
  }, [cutMask, value]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(SIZE, (event.clientX - rect.left) * SIZE / rect.width)), y: Math.max(0, Math.min(SIZE, (event.clientY - rect.top) * SIZE / rect.height)) };
  };
  function applyPaste(next: { x: number; y: number }) {
    const context = canvasRef.current?.getContext('2d');
    const before = drag.current;
    if (!context || !before || !cutRef.current || inkRef.current <= 0) return;
    const distance = Math.hypot(next.x - before.x, next.y - before.y);
    context.save();
    context.strokeStyle = '#f5efdf';
    context.fillStyle = '#f5efdf';
    context.lineWidth = 85;
    context.lineCap = 'square';
    context.beginPath(); context.moveTo(before.x, before.y); context.lineTo(next.x, next.y); context.stroke();
    if (distance < 2) context.fillRect(next.x - 41, next.y - 17, 82, 34);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(cutRef.current, 0, 0, SIZE, SIZE);
    context.restore();
    inkRef.current = Math.max(0, inkRef.current - Math.max(1, distance * .13));
    setInk(Math.round(inkRef.current));
    drag.current = next;
  }
  function save() {
    const canvas = canvasRef.current;
    const cut = cutRef.current;
    if (!canvas || !cut) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const coverage = document.createElement('canvas'); coverage.width = SIZE; coverage.height = SIZE;
    const maskContext = coverage.getContext('2d');
    if (!maskContext) return;
    maskContext.drawImage(cut, 0, 0, SIZE, SIZE);
    const a = context.getImageData(0, 0, SIZE, SIZE).data;
    const b = maskContext.getImageData(0, 0, SIZE, SIZE).data;
    let active = 0; let total = 0;
    for (let i = 3; i < a.length; i += 4) { if (b[i] > 24) { total++; if (a[i] > 24) active++; } }
    onChange(canvas.toDataURL('image/png'), Math.round(active / Math.max(1, total) * 100));
  }
  return <>
    <div className="paste-board">
      <div className="paste-underlay"><div className="fabric-weave" /><img src={cutMask} alt="花版镂空区域" draggable={false} /></div>
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="paste-canvas" role="img" aria-label="蘸浆后按住并拖动刮板，让防染浆穿过你刻开的花版" onPointerDown={event => { if (!ready || inkRef.current <= 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const next = point(event); drag.current = next; setCursor(next); applyPaste(next); }} onPointerMove={event => { if (!drag.current) return; event.preventDefault(); const next = point(event); setCursor(next); applyPaste(next); }} onPointerUp={event => { if (!drag.current) return; event.preventDefault(); drag.current = null; setCursor(null); save(); }} onPointerCancel={() => { drag.current = null; setCursor(null); save(); }} />
      {cursor && <div className="squeegee-cursor" style={{ left: `${cursor.x / 4}%`, top: `${cursor.y / 4}%` }} aria-hidden="true"><span>木刮板</span></div>}
      {!ready && <div className="material-loading">正在铺好花版…</div>}
    </div>
    <div className="ink-dock"><div className="ink-icon" aria-hidden="true">▰</div><div><strong>防染浆</strong><span>刮板余量 {ink}%</span><div className="ink-track"><i style={{ width: `${ink}%` }} /></div></div><button type="button" onClick={() => { inkRef.current = 100; setInk(100); }}>蘸浆 ↻</button></div>
  </>;
}

export function DyeStage({ mask, done, onDone }: { mask: string; done: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<'lower' | 'swish' | 'lift' | 'done'>(done ? 'done' : 'lower');
  const [shift, setShift] = useState(0);
  const [swing, setSwing] = useState(0);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const phaseNow = done ? 'done' : phase;
  const y = phaseNow === 'lower' ? shift : phaseNow === 'done' ? 0 : phaseNow === 'lift' ? Math.max(0, 130 + shift) : 130;
  const label = phaseNow === 'lower' ? '按住布，慢慢沉入染缸' : phaseNow === 'swish' ? '在染液中左右轻晃布面' : phaseNow === 'lift' ? '向上提起，让蓝色在空气中显现' : '布料已染成蓝色';
  return <div className={`creative-dye ${phaseNow}`}>
    <div className="dye-scene-label"><span>入蓝 / 染缸</span><strong>{label}</strong></div>
    <div className="dye-guide-line" />
    <div className="creative-dye-cloth" style={{ transform: `translate(-50%, ${y}px) rotate(${swing}deg)` }} onPointerDown={event => { if (phaseNow === 'done') return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); start.current = { x: event.clientX, y: event.clientY, base: shift }; }} onPointerMove={event => { if (!start.current || phaseNow === 'done') return; event.preventDefault(); const dy = event.clientY - start.current.y; const dx = event.clientX - start.current.x; if (phaseNow === 'lower') setShift(Math.max(0, Math.min(130, start.current.base + dy))); if (phaseNow === 'swish') { setSwing(Math.max(-8, Math.min(8, dx / 12))); if (Math.abs(dx) >= 65) setPhase('lift'); } if (phaseNow === 'lift') setShift(Math.max(-130, Math.min(0, dy))); }} onPointerUp={event => { if (!start.current) return; event.preventDefault(); start.current = null; setSwing(0); if (phaseNow === 'lower') { if (shift >= 100) { setShift(0); setPhase('swish'); } else setShift(0); } else if (phaseNow === 'lift') { if (shift <= -95) { setPhase('done'); setShift(0); onDone(); } else setShift(0); } }} onPointerCancel={() => { start.current = null; setSwing(0); if (phaseNow === 'lower' || phaseNow === 'lift') setShift(0); }}>
      <span className="cloth-hanger" /><Fabric mask={mask} tone={phaseNow === 'done' ? 'blue' : phaseNow === 'lower' ? 'cotton' : 'wet'} /><div className="cloth-instruction">{phaseNow === 'lower' ? '↓ 向下' : phaseNow === 'swish' ? '↔ 左右晃动' : phaseNow === 'lift' ? '↑ 向上提' : '染色完成'}</div>
    </div>
    <div className="creative-vat-back" /><div className="creative-vat-water"><i /><i /><i /></div><div className="creative-vat-front"><span>靛 蓝 染 缸</span></div>
    <div className="dye-steps"><i className="active">沉布</i><i className={phaseNow !== 'lower' ? 'active' : ''}>轻晃</i><i className={phaseNow === 'done' || phaseNow === 'lift' ? 'active' : ''}>提起</i></div>
  </div>;
}

export function RevealStage({ mask, peeled, hung, onPeeled, onHung }: { mask: string; peeled: boolean; hung: boolean; onPeeled: () => void; onHung: () => void }) {
  const [progress, setProgress] = useState(peeled ? 1 : 0);
  const [lift, setLift] = useState(0);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const hangStart = useRef<number | null>(null);
  return <>
    <div className="peel-stage">
      <div className="peel-heading"><span>去浆显花</span><strong>{peeled ? '你刻下的线条显现了' : '拉住浆层边缘，慢慢揭开'}</strong></div>
      <div className="peel-cloth" onPointerDown={event => { if (peeled) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); start.current = { x: event.clientX, y: event.clientY, base: progress }; }} onPointerMove={event => { if (!start.current || peeled) return; event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); setProgress(Math.max(0, Math.min(1, start.current.base + (start.current.x - event.clientX) / (rect.width * .75)))); }} onPointerUp={event => { if (!start.current || peeled) return; event.preventDefault(); start.current = null; if (progress >= .88) { setProgress(1); onPeeled(); } }} onPointerCancel={() => { start.current = null; }}>
        <Fabric mask={mask} /><div className="paste-film" style={{ width: `${(1 - progress) * 100}%` }}><span>白浆层</span></div>{!peeled && <div className="film-tab" style={{ left: `${(1 - progress) * 100}%` }}>‹ 拉开</div>}
      </div>
      <div className="peel-scale"><span>蓝白显现</span><strong>{Math.round(progress * 100)}%</strong></div>
    </div>
    {peeled && <div className={`creative-hang ${hung ? 'hung' : ''}`}><div className="hang-instruction"><span>晾晒 / 最后一程</span><strong>{hung ? '花布已经晾好' : '把花布挂到晾杆上'}</strong></div><div className="creative-hang-rod" /><div className="creative-hang-cloth" style={{ transform: `translate(-50%, ${hung ? -70 : lift}px)` }} onPointerDown={event => { if (hung) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); hangStart.current = event.clientY; }} onPointerMove={event => { if (hangStart.current === null || hung) return; event.preventDefault(); setLift(Math.max(-80, Math.min(0, event.clientY - hangStart.current))); }} onPointerUp={event => { if (hangStart.current === null || hung) return; event.preventDefault(); hangStart.current = null; if (lift <= -55) { setLift(-70); onHung(); } else setLift(0); }} onPointerCancel={() => { hangStart.current = null; setLift(0); }}><Fabric mask={mask} /><span>↑ 向上挂</span></div></div>}
  </>;
}

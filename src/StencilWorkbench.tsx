import { useRef, useState } from 'react';
import { BOARD, cutsSvg, designSvg, newId, svgUrl, type CutOperation, type CutTool, type Design, type Point } from './workshopModel';

type Props = { design: Design; cuts: CutOperation[]; mask: string; coverage: number; stray: number; risk: number; busy: boolean; onChange: (cuts: CutOperation[]) => void; onNext: () => void };
const cutTools: { id: CutTool; name: string; guide: string }[] = [
  { id: 'line', name: '刻线', guide: '沿图案划出连续刀路' },
  { id: 'dot', name: '凿点', guide: '按下或拖动决定点的大小' },
  { id: 'area', name: '刻面', guide: '对角拖出一块椭圆镂空' },
  { id: 'bridge', name: '留连接点', guide: '在宽大孔洞中补回窄纸桥' },
];
export default function StencilWorkbench({ design, cuts, mask, coverage, stray, risk, busy, onChange, onNext }: Props) {
  const [tool, setTool] = useState<CutTool>('line');
  const [width, setWidth] = useState(18);
  const [draft, setDraft] = useState<CutOperation | null>(null);
  const start = useRef<Point | null>(null);
  const points = useRef<Point[]>([]);
  const point = (event: React.PointerEvent<SVGSVGElement>) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(BOARD, (event.clientX - rect.left) * BOARD / rect.width)), y: Math.max(0, Math.min(BOARD, (event.clientY - rect.top) * BOARD / rect.height)) }; };
  function begin(event: React.PointerEvent<SVGSVGElement>) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); start.current = p; points.current = [p]; setDraft({ id: 'draft', tool, points: [p, p], width }); }
  function move(event: React.PointerEvent<SVGSVGElement>) { if (!start.current) return; event.preventDefault(); const p = point(event); if (tool === 'line' || tool === 'bridge') { const last = points.current[points.current.length - 1]; if (Math.hypot(p.x - last.x, p.y - last.y) > 2) points.current.push(p); } else points.current = [start.current, p]; setDraft({ id: 'draft', tool, points: [...points.current], width }); }
  function finish(event: React.PointerEvent<SVGSVGElement>) { if (!start.current) return; event.preventDefault(); const p = point(event); const distance = Math.hypot(p.x - start.current.x, p.y - start.current.y); if (tool === 'line' || tool === 'bridge') points.current.push(p); else points.current = [start.current, p]; if (tool === 'dot' || distance > 6) onChange([...cuts, { id: newId(), tool, points: [...points.current], width }]); start.current = null; points.current = []; setDraft(null); }
  return <section className="wb-panel stencil-workbench"><div className="wb-intro"><span>02 / OILED-PAPER STENCIL</span><h1>油纸刻版台</h1><p>淡线是设计，深色为已刻开的孔洞。宽大开孔可用“留连接点”补回一条纸桥；有效镂空、偏刀与结构风险都会进入评价。</p></div>
    <div className="cut-tool-row">{cutTools.map(item => <button key={item.id} className={tool === item.id ? 'active' : ''} aria-pressed={tool === item.id} onClick={() => setTool(item.id)}><strong>{item.name}</strong><small>{item.guide}</small></button>)}</div>
    <div className="stencil-board"><img className="stencil-guide" src={svgUrl(designSvg(design, '#564c3f'))} alt="待加工纹样参考线"/>{mask && <img className="stencil-holes" src={mask} alt="实际镂空区域"/>}<svg viewBox="0 0 400 400" className="stencil-input" role="img" aria-label="油纸花版，可用刻线、凿点、刻面和留桥工具加工" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { start.current = null; points.current = []; setDraft(null); }}><rect width="400" height="400" fill="transparent"/>{draft && <image href={svgUrl(cutsSvg([draft]))} width="400" height="400" opacity=".55" style={draft.tool === 'bridge' ? { filter: 'sepia(1) saturate(5) hue-rotate(310deg)' } : undefined}/>}</svg><div className="stencil-corner">油纸版 / {cuts.length} 刀 · {cuts.filter(cut => cut.tool === 'bridge').length} 桥</div></div>
    <div className="stencil-controls"><label htmlFor="knife-width">刀口大小 <b>{width}</b></label><input id="knife-width" type="range" min="5" max="42" value={width} onChange={event => setWidth(Number(event.target.value))}/><button onClick={() => onChange(cuts.slice(0, -1))} disabled={!cuts.length}>↶ 撤销一刀</button><button onClick={() => onChange([])} disabled={!cuts.length}>清空花版</button></div>
    <div className="craft-metrics three"><div><span>有效镂空</span><strong>{coverage}%</strong><small>刀路 ∩ 纹样</small></div><div><span>偏离刀路</span><strong>{stray}%</strong><small>过大的刻面会增加误刻</small></div><div><span>待加固开孔</span><strong>{risk}</strong><small>教学模型：大孔需留桥</small></div></div>
    <div className="stencil-result"><strong>花版镂空检查</strong><div>{mask ? <img src={mask} alt="最终花版透明掩膜"/> : <span>刻下第一刀后在这里检查</span>}</div></div>
    <div className="wb-footer"><p>{busy ? '正在计算花版…' : coverage === 0 ? '先在纹样上刻出可过浆的区域。' : risk > 0 ? `有 ${risk} 处较大的开孔尚未留桥。可用“留连接点”跨过开孔，减少模拟结构风险。` : stray > 35 ? '有较多刀路偏离设计纹样。可撤销重刻，或保留手作误差继续。' : '花版可以使用；刀路、连接点和缺口都会传到上浆台。'}</p><button className="wb-primary" disabled={coverage === 0 || busy} onClick={onNext}>带着花版去配浆 ↗</button></div>
  </section>;
}

import { useRef, useState } from 'react';
import { mixQuality, type Mix } from './workshopModel';

type Props = { mix: Mix; onChange: (mix: Mix) => void; onNext: () => void };
const materials: { key: 'bean' | 'lime' | 'water'; name: string; unit: string; glyph: string }[] = [
  { key: 'bean', name: '黄豆粉', unit: '虚拟份', glyph: '豆' },
  { key: 'lime', name: '石灰粉', unit: '虚拟份', glyph: '灰' },
  { key: 'water', name: '水', unit: '虚拟份', glyph: '水' },
];
export default function MixWorkbench({ mix, onChange, onNext }: Props) {
  const quality = mixQuality(mix);
  const stirring = useRef<{ angle: number; accumulated: number } | null>(null);
  const [swirl, setSwirl] = useState(0);
  function angle(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2);
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!stirring.current) return;
    event.preventDefault();
    const next = angle(event);
    let delta = next - stirring.current.angle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    stirring.current.angle = next;
    stirring.current.accumulated += Math.abs(delta);
    setSwirl(value => value + delta * 14);
    if (stirring.current.accumulated >= Math.PI * 2) {
      stirring.current.accumulated -= Math.PI * 2;
      onChange({ ...mix, turns: Math.min(8, mix.turns + 1) });
    }
  }
  return <section className="wb-panel mix-workbench"><div className="wb-intro"><span>03 / PASTE PREPARATION</span><h1>防染浆配制台</h1><p>取黄豆粉、石灰粉与水，再围着碗边搅拌。浆料状态会影响后来白纹的饱满度与缺损。</p></div>
    <div className="recipe-note"><b>教学模拟规则</b><span>这里的“份”只用于交互计算，并非真实工艺配方或推荐用量。</span></div>
    <div className="material-tray">{materials.map(item => <div className={`material-cup ${item.key}`} key={item.key}><div className="cup-glyph">{item.glyph}</div><strong>{item.name}</strong><label htmlFor={`mix-${item.key}`}>{mix[item.key]} {item.unit}</label><input id={`mix-${item.key}`} type="range" min="0" max="100" step="5" value={mix[item.key]} onChange={event => onChange({ ...mix, [item.key]: Number(event.target.value), turns: 0 })}/></div>)}</div>
    <div className="mix-bowl-stage"><div className="mix-bowl" role="img" aria-label="按住并沿碗边画圈搅拌防染浆" onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); stirring.current = { angle: angle(event), accumulated: 0 }; }} onPointerMove={move} onPointerUp={() => { stirring.current = null; }} onPointerCancel={() => { stirring.current = null; }}>
      <div className={`paste-liquid ${quality.state === '偏稀' ? 'thin' : quality.state === '偏稠' ? 'thick' : ''}`} style={{ transform: `rotate(${swirl}deg)` }}><i/><i/><i/></div><div className="stir-handle" style={{ transform: `translate(-50%, -50%) rotate(${swirl}deg)` }}><span/></div><div className="bowl-center-label">沿碗边画圈<br/><b>{mix.turns} 圈</b></div>
    </div><div className="mix-bowl-shadow"/></div>
    <div className="paste-readout"><div><span>当前状态</span><strong className={quality.state === '可用' ? 'good' : ''}>{quality.state}</strong></div><div><span>模拟浆料质量</span><strong>{quality.score} / 100</strong></div></div>
    <div className="mix-advice">{quality.state === '偏稀' ? '水偏多，模拟上浆时容易出现边缘散开和留白较浅。' : quality.state === '偏稠' ? '水偏少，模拟上浆时浆料不易均匀穿过刻口。' : mix.turns < 1 ? '配比可以使用；再搅拌至少一圈，让浆料状态稳定。' : '浆料已可用。继续搅拌会改善模拟均匀度。'}</div>
    <div className="wb-footer"><p>调配结果会进入上浆计算。即使配比不佳也能继续，并在成品中看到差异。</p><button className="wb-primary" disabled={mix.turns < 1 || mix.bean + mix.lime === 0} onClick={onNext}>带着浆料去拷花 ↗</button></div>
  </section>;
}

import { useState } from 'react';
import { dyeColor, imageFromUrl, mixQuality, workshopScore, type Product, type Station, type WorkshopState } from './workshopModel';
import { inspectFabricPoint, type FabricInspection } from './inspectFabric';

type Props = { state: WorkshopState; onRevealed: () => void; onProduct: (product: Product) => void; onTitle: (title: string) => void; onNavigate: (station: Station) => void; onRestart: () => void };
const products: { id: Product; name: string; note: string }[] = [
  { id: 'scarf', name: '蓝印方巾', note: '日常佩戴' }, { id: 'bag', name: '帆布包', note: '随身携带' }, { id: 'bookmark', name: '纹样书签', note: '夹入书页' },
];
function cloth(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number, blue: string) {
  context.fillStyle = blue; context.fillRect(x, y, w, h);
  context.globalAlpha = .15;
  for (let line = 0; line < h; line += 7) { context.fillStyle = line % 2 ? '#fff' : '#193e57'; context.fillRect(x, y + line, w, 1); }
  context.globalAlpha = 1; context.drawImage(image, x, y, w, h);
}
async function exportCard(state: WorkshopState) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
  const context = canvas.getContext('2d')!; const image = await imageFromUrl(state.printMask);
  context.fillStyle = '#f7f3e9'; context.fillRect(0, 0, 1080, 1440);
  context.fillStyle = '#204963'; context.fillRect(0, 0, 1080, 92);
  context.fillStyle = '#f9f6ed'; context.font = '37px serif'; context.fillText('一 布 一 染', 68, 59);
  context.font = '24px sans-serif'; context.fillText('蓝印花布 · 我的数字染坊', 690, 57);
  const blue = dyeColor(state.dyeDepth);
  if (state.product === 'scarf') {
    context.save(); context.shadowColor = '#1a324944'; context.shadowBlur = 35; context.shadowOffsetY = 20;
    cloth(context, image, 115, 153, 850, 850, blue); context.restore();
    context.strokeStyle = '#e7e0d0'; context.lineWidth = 14; context.strokeRect(121, 159, 838, 838);
  } else if (state.product === 'bag') {
    context.strokeStyle = '#d5cbb7'; context.lineWidth = 42; context.beginPath(); context.moveTo(350, 370); context.lineTo(350, 205); context.quadraticCurveTo(540, 70, 730, 205); context.lineTo(730, 370); context.stroke();
    context.save(); context.beginPath(); context.moveTo(175, 320); context.lineTo(905, 320); context.lineTo(855, 1010); context.lineTo(225, 1010); context.closePath(); context.clip(); cloth(context, image, 175, 320, 730, 690, blue); context.restore();
    context.strokeStyle = '#d5cbb7'; context.lineWidth = 10; context.strokeRect(180, 326, 720, 680);
  } else {
    context.save(); context.shadowColor = '#1a324966'; context.shadowBlur = 25; context.shadowOffsetY = 18; cloth(context, image, 350, 155, 380, 850, blue); context.restore();
    context.fillStyle = '#b17d55'; context.beginPath(); context.arc(540, 200, 12, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#b17d55'; context.lineWidth = 5; context.beginPath(); context.moveTo(540, 200); context.lineTo(540, 90); context.stroke();
  }
  context.fillStyle = '#1b405b'; context.font = 'bold 61px serif'; context.fillText(state.title || '我的蓝印', 85, 1135);
  context.font = '26px sans-serif'; context.fillText(`${products.find(item => item.id === state.product)?.name}  ·  ${state.design.items.length + state.design.strokes.length} 个纹样元素  ·  ${state.dyeCycles.length} 次浸染`, 85, 1195);
  const score = workshopScore(state); context.fillText(`模拟工艺评价 ${score.total} / 100  ·  蓝色深度 ${state.dyeDepth} / 100`, 85, 1242);
  context.fillStyle = '#7d8f91'; context.font = '22px sans-serif'; context.fillText('原创矢量纹样 · 教学型工艺模拟 · 2026', 85, 1355);
  const link = document.createElement('a'); link.download = `一布一染-${state.product}-${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
}
export default function FinishWorkbench({ state, onRevealed, onProduct, onTitle, onNavigate, onRestart }: Props) {
  const [rinsing, setRinsing] = useState(false); const [notice, setNotice] = useState('');
  const [inspection, setInspection] = useState<FabricInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const score = workshopScore(state); const mix = mixQuality(state.mix);
  function inspectAt(x: number, y: number) {
    setInspecting(true);
    inspectFabricPoint(state, x, y).then(result => setInspection(result)).catch(() => setNotice('此处工艺记录读取失败，请再试一次')).finally(() => setInspecting(false));
  }
  function inspectClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(399, (event.clientX - rect.left - 11) / (rect.width - 22) * 400));
    const y = Math.max(0, Math.min(399, (event.clientY - rect.top - 11) / (rect.height - 22) * 400));
    inspectAt(x, y);
  }
  return <section className="wb-panel finish-workbench"><div className="wb-intro"><span>06 / THE FINISHED CLOTH</span><h1>成品工坊</h1><p>去浆显花后，眼前的蓝白纹样由你的构图、刀路、浆料、刮板与浸染记录共同决定。</p></div>
    {!state.revealed && <div className="reveal-workbench"><div className={`reveal-bath ${rinsing ? 'rinsing' : ''}`}><div className="reveal-water"/><div className="reveal-cloth" style={{ backgroundColor: dyeColor(state.dyeDepth) }}><img src={state.printMask} alt="待去浆的染布"/></div></div><p>{rinsing ? '模拟清洗中，浆料正从布面离开。' : '染布已出缸。按工艺顺序完成去浆与晾晒。'}</p><div className="reveal-actions"><button onClick={() => setRinsing(true)} disabled={rinsing}>① 入水去浆</button><button disabled={!rinsing} onClick={onRevealed}>② 提布晾晒 · 显花</button></div></div>}
    {state.revealed && <><div className="final-art-header"><span>MY INDIGO PRINT / {state.dyeCycles.length} DIPS</span><b>模拟评价 {score.total} 分</b></div>
      <div className="final-fabric" data-testid="final-fabric" role="button" tabIndex={0} aria-label="点按布面追溯此处的工艺记录" onClick={inspectClick} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspectAt(200, 200); } }} style={{ backgroundColor: dyeColor(state.dyeDepth) }}><div className="fabric-weave"/><img src={state.printMask} alt="由你的花版与上浆形成的最终白色纹样"/>{inspection && <span className="fabric-inspect-marker" style={{ left: `${inspection.x / 4}%`, top: `${inspection.y / 4}%` }}/>}</div>
      <div className="process-inspector" data-testid="process-inspector"><div className="process-inspector-heading"><strong>点按布面 · 追溯这一处</strong><span>DESIGN → STENCIL → PASTE</span></div>{inspecting ? <p>正在读取这处的刀路与刮板记录…</p> : inspection ? <><h3>{inspection.title}</h3><p>{inspection.detail}</p><button onClick={() => onNavigate(inspection.station)}>返回{inspection.station === 'design' ? '设计' : inspection.station === 'stencil' ? '刻版' : '上浆'}台调整 ↗</button></> : <p>白纹、漏刮和蓝底各有不同原因。点选布面任意位置，看看它怎样形成。</p>}</div>
      <div className="finish-score"><strong>这块布的工艺记录</strong><div><span>纹样构图</span><b>{score.design}</b></div><div><span>花版镂空</span><b>{score.stencil} · 待加固 {state.stencilRisk} 处</b></div><div><span>防染浆</span><b>{score.paste} · {mix.state}</b></div><div><span>上浆覆盖</span><b>{score.print} · {state.printCoverage}%</b></div><div><span>靛蓝浸染</span><b>{score.dye} · 深度 {state.dyeDepth}</b></div></div>
      <div className="wb-section-label"><strong>让纹样走进生活</strong><span>切换文创载体</span></div><div className="product-tabs">{products.map(item => <button key={item.id} className={state.product === item.id ? 'active' : ''} aria-pressed={state.product === item.id} onClick={() => onProduct(item.id)}>{item.name}<small>{item.note}</small></button>)}</div>
      <div className={`product-stage product-${state.product}`} data-testid="product-preview"><div className="product-visual"><div className="product-pattern" style={{ backgroundColor: dyeColor(state.dyeDepth) }}><img src={state.printMask} alt={`${products.find(item => item.id === state.product)?.name}上的个人纹样`}/></div></div><span>{products.find(item => item.id === state.product)?.name} · 用你的实际印花预览</span></div>
      <label className="finish-name" htmlFor="finish-title">为作品题名</label><input id="finish-title" maxLength={16} value={state.title} onChange={event => onTitle(event.target.value)}/>
      <div className="finish-actions"><button className="wb-primary" onClick={() => exportCard(state).then(() => setNotice('已导出 1080 × 1440 PNG 成品卡')).catch(() => setNotice('导出失败，请再试一次'))}>保存高清成品卡 PNG</button><button onClick={onRestart}>再做一块</button></div>{notice && <div className="export-notice" role="status">{notice}</div>}
    </>}
  </section>;
}

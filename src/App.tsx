import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import DesignWorkbench from './DesignWorkbench';
import StencilWorkbench from './StencilWorkbench';
import MixWorkbench from './MixWorkbench';
import PrintWorkbench from './PrintWorkbench';
import DyeWorkbench from './DyeWorkbench';
import FinishWorkbench from './FinishWorkbench';
import { STORAGE_KEY, STATIONS, initialWorkshop, loadWorkshop, makePrint, makeStencil, mixQuality, newId, type CutOperation, type Design, type DyeCycle, type Impression, type Mix, type Product, type Station, type WorkshopState } from './workshopModel';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="fatal"><h1>工作台暂时无法打开</h1><p>可刷新页面重新载入保存在本机的项目。</p><button onClick={() => location.reload()}>刷新工作台</button></div> : this.props.children; }
}
const stationIndex = (station: Station) => STATIONS.findIndex(item => item.id === station);
function AppBody() {
  const [state, setState] = useState<WorkshopState>(loadWorkshop);
  const [entered, setEntered] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));
  const [busyStencil, setBusyStencil] = useState(false);
  const [busyPrint, setBusyPrint] = useState(false);
  const stencilRevision = useRef(0); const printRevision = useRef(0);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  const index = stationIndex(state.station);
  function go(station: Station) { setState(current => ({ ...current, station, impressions: station === 'print' && !current.impressions.length ? [{ id: newId(), x: 0, y: 0, rotation: 0, sweeps: [] }] : current.impressions })); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function clearAfterDesign(current: WorkshopState) { return { ...current, cuts: [], stencilMask: '', stencilCoverage: 0, strayCut: 0, stencilRisk: 0, pasteLoad: 100, impressions: [], printMask: '', printCoverage: 0, printWaste: 0, dyeCycles: [], dyeDepth: 0, revealed: false }; }
  function commitDesign(design: Design) {
    ++stencilRevision.current; ++printRevision.current; setBusyStencil(false); setBusyPrint(false);
    setState(current => {
      const history = [...current.designHistory.slice(0, current.designIndex + 1), design].slice(-60);
      return { ...clearAfterDesign(current), design, designHistory: history, designIndex: history.length - 1 };
    });
  }
  function travelDesign(delta: number) {
    ++stencilRevision.current; ++printRevision.current; setBusyStencil(false); setBusyPrint(false);
    setState(current => {
      const designIndex = Math.max(0, Math.min(current.designHistory.length - 1, current.designIndex + delta));
      return { ...clearAfterDesign(current), designIndex, design: current.designHistory[designIndex] };
    });
  }
  function changeCuts(cuts: CutOperation[]) {
    const revision = ++stencilRevision.current; ++printRevision.current;
    setBusyStencil(true); setBusyPrint(false);
    setState(current => ({ ...current, cuts, stencilMask: '', stencilCoverage: 0, strayCut: 0, stencilRisk: 0, pasteLoad: 100, impressions: [], printMask: '', printCoverage: 0, printWaste: 0, dyeCycles: [], dyeDepth: 0, revealed: false }));
    makeStencil(state.design, cuts).then(result => {
      if (revision !== stencilRevision.current) return;
      setState(current => ({ ...current, stencilMask: result.mask, stencilCoverage: result.coverage, strayCut: result.stray, stencilRisk: result.risk }));
      setBusyStencil(false);
    }).catch(() => { if (revision === stencilRevision.current) setBusyStencil(false); });
  }
  function changeMix(mix: Mix) {
    ++printRevision.current;
    setBusyPrint(false);
    setState(current => ({ ...current, mix, pasteLoad: 100, impressions: [], printMask: '', printCoverage: 0, printWaste: 0, dyeCycles: [], dyeDepth: 0, revealed: false }));
  }
  function changeImpressions(impressions: Impression[]) {
    const revision = ++printRevision.current; setBusyPrint(true);
    setState(current => ({ ...current, impressions, printMask: '', printCoverage: 0, printWaste: 0, dyeCycles: [], dyeDepth: 0, revealed: false }));
    makePrint(state.stencilMask, impressions, mixQuality(state.mix).score).then(result => {
      if (revision !== printRevision.current) return;
      setState(current => ({ ...current, printMask: result.mask, printCoverage: result.coverage, printWaste: result.waste }));
      setBusyPrint(false);
    }).catch(() => { if (revision === printRevision.current) setBusyPrint(false); });
  }
  function next(station: Station) { go(station); }
  function addCycle(cycle: DyeCycle) {
    setState(current => ({ ...current, dyeCycles: [...current.dyeCycles, cycle], dyeDepth: Math.min(100, current.dyeDepth + cycle.gain), revealed: false }));
  }
  function reachable(station: Station) {
    const target = stationIndex(station);
    if (target === 0) return true;
    if (!state.design.items.length && !state.design.strokes.length) return false;
    if (target === 1) return true;
    if (!state.stencilMask || state.stencilCoverage === 0) return false;
    if (target === 2) return true;
    if (state.mix.turns < 1) return false;
    if (target === 3) return true;
    if (!state.printMask || state.printCoverage === 0) return false;
    if (target === 4) return true;
    return state.dyeCycles.length > 0;
  }
  function restart() {
    if (!window.confirm('重新开始会清空当前纹样与工艺记录。确定吗？')) return;
    ++stencilRevision.current; ++printRevision.current;
    setState({ ...initialWorkshop, design: { items: [], strokes: [], repeat: 'single' }, designHistory: [{ items: [], strokes: [], repeat: 'single' }] });
    setEntered(true); window.scrollTo(0, 0);
  }
  return <main className="app-shell"><span className="desktop-ornament left">一布一染</span><span className="desktop-ornament right">蓝白之间</span><div className="phone-frame workshop-frame"><div className="page-grain"/>
    <header className="topbar"><button className="text-button back" onClick={() => entered ? (index > 0 ? go(STATIONS[index - 1].id) : setEntered(false)) : undefined}>{entered ? '← 返回' : '蓝印花布'}</button><div className="topbar-center">一 布 <i>·</i> 一 染</div><button className="text-button reset" title="重新开始" aria-label="重新开始" onClick={restart}>↺</button></header>
    {!entered ? <section className="workshop-home"><span className="home-kicker">TONGXIANG · INDIGO PRINTING</span><div className="workshop-home-art"><div className="home-art-frame"><div className="home-art-pattern">❀<span>◇</span>❀</div><div className="home-art-pattern reverse">◇<span>❀</span>◇</div><div className="home-art-pattern">❀<span>◇</span>❀</div></div><div className="home-art-seal">一布<br/>一染</div></div><h1>从空白开始，<br/><em>亲手做一方蓝印。</em></h1><p>构图、刻版、调浆、上浆、浸染，每一步都留下真实的操作记录。最终布样会随着你的决定而变化。</p><button className="wb-primary" onClick={() => { setEntered(true); go(state.station); }}>走进数字染坊 ↗</button><div className="home-workflow">{STATIONS.map((item, position) => <span key={item.id}>{String(position + 1).padStart(2, '0')} {item.short}</span>)}</div><small>教学型视觉模拟 · 工艺说明参考 <a href="https://www.ihchina.cn/project_details/14299/" target="_blank" rel="noreferrer">中国非遗网</a></small></section> : <>
      <nav className="workshop-navigation" aria-label="六个工作台">{STATIONS.map((item, position) => <button key={item.id} className={`${state.station === item.id ? 'active' : ''} ${reachable(item.id) ? 'reachable' : ''}`} disabled={!reachable(item.id)} onClick={() => go(item.id)} title={item.name}><span>{String(position + 1).padStart(2, '0')}</span><b>{item.short}</b></button>)}</nav>
      <div className="workshop-content" key={state.station}>
        {state.station === 'design' && <DesignWorkbench design={state.design} canUndo={state.designIndex > 0} canRedo={state.designIndex < state.designHistory.length - 1} onCommit={commitDesign} onUndo={() => travelDesign(-1)} onRedo={() => travelDesign(1)} onNext={() => next('stencil')}/>}
        {state.station === 'stencil' && <StencilWorkbench design={state.design} cuts={state.cuts} mask={state.stencilMask} coverage={state.stencilCoverage} stray={state.strayCut} risk={state.stencilRisk} busy={busyStencil} onChange={changeCuts} onNext={() => next('mix')}/>}
        {state.station === 'mix' && <MixWorkbench mix={state.mix} onChange={changeMix} onNext={() => next('print')}/>}
        {state.station === 'print' && <PrintWorkbench stencilMask={state.stencilMask} mix={state.mix} impressions={state.impressions} printMask={state.printMask} coverage={state.printCoverage} waste={state.printWaste} pasteLoad={state.pasteLoad} busy={busyPrint} onChange={changeImpressions} onPasteLoad={pasteLoad => setState(current => ({ ...current, pasteLoad }))} onNext={() => next('dye')}/>}
        {state.station === 'dye' && <DyeWorkbench mask={state.printMask} cycles={state.dyeCycles} depth={state.dyeDepth} onCycle={addCycle} onNext={() => next('finish')}/>}
        {state.station === 'finish' && <FinishWorkbench state={state} onRevealed={() => setState(current => ({ ...current, revealed: true }))} onProduct={(product: Product) => setState(current => ({ ...current, product }))} onTitle={title => setState(current => ({ ...current, title }))} onNavigate={go} onRestart={restart}/>}
      </div></>}
    <footer className="footer-mark">一布一染 · 桐乡蓝印花布数字体验<span>课程项目 / 教学模拟</span></footer>
  </div></main>;
}
export default function App() { return <ErrorBoundary><AppBody/></ErrorBoundary>; }

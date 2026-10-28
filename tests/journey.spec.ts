import { test, expect, type Page } from '@playwright/test';
const KEY = 'yibu-yiran-workshop-v3';
async function drag(page: Page, selector: string, x1: number, y1: number, x2: number, y2: number, steps = 16) {
  const item = page.locator(selector); await item.scrollIntoViewIfNeeded();
  const box = await item.boundingBox(); if (!box) throw Error(`Missing ${selector}`);
  await page.mouse.move(box.x + box.width * x1, box.y + box.height * y1); await page.mouse.down();
  await page.mouse.move(box.x + box.width * x2, box.y + box.height * y2, { steps }); await page.mouse.up();
}
async function stored(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), KEY); }
async function begin(page: Page, motif = '团花') { await page.goto('/'); await page.getByRole('button', { name: '走进数字染坊' }).click(); await page.getByRole('button', { name: `添加${motif}` }).click(); }
async function carve(page: Page) {
  await page.getByRole('button', { name: /带着设计进入刻版台/ }).click();
  await page.getByRole('button', { name: /刻面/ }).click();
  await drag(page, '.stencil-input', .28, .28, .44, .44);
  await expect(page.getByRole('button', { name: /带着花版去配浆/ })).toBeEnabled();
}
async function stir(page: Page) {
  await page.getByRole('button', { name: /带着花版去配浆/ }).click();
  await stirBowl(page);
  await page.getByRole('button', { name: /带着浆料去拷花/ }).click();
}
async function stirBowl(page: Page) {
  const bowl = page.locator('.mix-bowl'); await bowl.scrollIntoViewIfNeeded(); const box = await bowl.boundingBox(); if (!box) throw Error('No bowl');
  for (let i = 0; i <= 34; i++) {
    const a = -Math.PI / 2 + 4 * Math.PI * i / 34;
    await page.mouse.move(box.x + box.width / 2 + Math.cos(a) * box.width * .31, box.y + box.height / 2 + Math.sin(a) * box.height * .31);
    if (i === 0) await page.mouse.down();
  }
  await page.mouse.up();
  await expect(page.getByRole('button', { name: /带着浆料去拷花/ })).toBeEnabled();
}
async function scrape(page: Page, y = .36) {
  await page.getByRole('button', { name: /压版刮浆/ }).click();
  await drag(page, '.scrape-capture', .18, y, .58, y);
  await expect(page.getByRole('button', { name: /带着花布去染缸/ })).toBeEnabled();
}
async function dip(page: Page, hold = 100) {
  const before = (await stored(page)).dyeCycles?.length || 0;
  await drag(page, '.vat-scene', .5, .25, .5, .75);
  await page.waitForTimeout(hold);
  await drag(page, '.vat-scene', .5, .55, .5, .2);
  await expect.poll(async () => (await stored(page)).dyeCycles?.length || 0).toBeGreaterThan(before);
  await expect(page.locator('.vat-scene.ready')).toBeVisible();
}
async function finish(page: Page) {
  await page.getByRole('button', { name: /去浆显花/ }).click();
  await page.getByRole('button', { name: /入水去浆/ }).click();
  await page.getByRole('button', { name: /提布晾晒/ }).click();
  await expect(page.locator('[data-testid="final-fabric"] img')).toBeVisible();
}
async function fullToPrint(page: Page, motif = '团花') { await begin(page, motif); await carve(page); await stir(page); }
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.clear()); });

test('A: 不同纹样经过同一工艺得到不同成品纹样', async ({ browser }) => {
  const results: string[] = [];
  for (const motif of ['团花', '游鱼']) {
    const context = await browser.newContext(); const page = await context.newPage(); await page.goto('/');
    await page.getByRole('button', { name: '走进数字染坊' }).click(); await page.getByRole('button', { name: `添加${motif}` }).click();
    await carve(page); await stir(page); await scrape(page);
    results.push((await stored(page)).printMask); await context.close();
  }
  expect(results[0]).toMatch(/^data:image\/png;base64,/); expect(results[1]).toMatch(/^data:image\/png;base64,/); expect(results[0]).not.toBe(results[1]);
});

test('B: 移动纹样会移动花版及布上实际浆痕', async ({ page }) => {
  await begin(page); const before = (await stored(page)).design.items[0].x;
  await drag(page, '.design-editor-canvas [data-motif-id]', .5, .5, 1.3, .5);
  expect((await stored(page)).design.items[0].x).toBeGreaterThan(before + 20);
  await page.getByRole('button', { name: /带着设计进入刻版台/ }).click();
  await page.getByRole('button', { name: /刻面/ }).click();
  await drag(page, '.stencil-input', .36, .28, .55, .44);
  await expect(page.getByRole('button', { name: /带着花版去配浆/ })).toBeEnabled();
  await stir(page); await scrape(page, .36);
  const saved = await stored(page); expect(saved.printCoverage).toBeGreaterThan(0);
  const centroid = await page.evaluate(async mask => { const image = new Image(); image.src = mask; await image.decode(); const c = document.createElement('canvas'); c.width = c.height = 400; const ctx = c.getContext('2d')!; ctx.drawImage(image,0,0); const d = ctx.getImageData(0,0,400,400).data; let sum=0,n=0; for(let y=0;y<400;y++)for(let x=0;x<400;x++){const a=d[(y*400+x)*4+3];if(a>20){sum+=x;n++;}}return sum/n; }, saved.printMask);
  expect(centroid).toBeGreaterThan(150);
});

test('C: 漏刮与补刮直接改变浆痕和最终白纹', async ({ page }) => {
  await fullToPrint(page); await scrape(page, .26); const first = await stored(page);
  await drag(page, '.scrape-capture', .18, .44, .58, .44);
  await expect.poll(async () => (await stored(page)).printCoverage || 0).toBeGreaterThan(first.printCoverage);
  const second = await stored(page);
  expect(second.printCoverage).toBeGreaterThan(first.printCoverage); expect(second.printMask).not.toBe(first.printMask);
  await page.getByRole('button', { name: /带着花布去染缸/ }).click(); await dip(page); await finish(page);
  expect(await page.locator('[data-testid="final-fabric"] img').getAttribute('src')).toBe(second.printMask);
});

test('D: 重复浸染累积深度并改变布色；E: 同纹样应用于方巾和帆布包及高清导出', async ({ page }) => {
  await fullToPrint(page); await scrape(page); await page.getByRole('button', { name: /带着花布去染缸/ }).click();
  await dip(page, 90); const first = await stored(page); const firstColor = await page.locator('.vat-cloth').evaluate(el => getComputedStyle(el).backgroundColor);
  await dip(page, 420); const second = await stored(page); const secondColor = await page.locator('.vat-cloth').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(second.dyeCycles.length).toBe(2); expect(second.dyeDepth).toBeGreaterThan(first.dyeDepth); expect(secondColor).not.toBe(firstColor);
  await finish(page);
  const scarf = await page.locator('.product-pattern img').getAttribute('src');
  await page.getByRole('button', { name: /帆布包/ }).click();
  const bag = await page.locator('.product-pattern img').getAttribute('src');
  expect(scarf).toBe(second.printMask); expect(bag).toBe(scarf); await expect(page.locator('.product-bag')).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: /保存高清成品卡 PNG/ }).click(); expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test('F: 手机触屏与电脑鼠标都能操作主要工作台', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await begin(page);
  const board = page.locator('.design-editor-canvas'); await board.scrollIntoViewIfNeeded(); const box = await board.boundingBox(); if(!box) throw Error('No board');
  const saved = await stored(page); const x = box.x + box.width * saved.design.items[0].x / 400, y = box.y + box.height * saved.design.items[0].y / 400;
  const session = await page.context().newCDPSession(page); const scroll = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x,y}] });
  for(let i=1;i<=8;i++) await session.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x:x+i*7,y}] });
  await session.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  expect((await stored(page)).design.items[0].x).toBeGreaterThan(saved.design.items[0].x + 20); expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await page.getByRole('button', { name: /带着设计进入刻版台/ }).click(); await page.getByRole('button', { name: /刻面/ }).click();
  const cut = page.locator('.stencil-input'); await cut.scrollIntoViewIfNeeded(); const cutBox = await cut.boundingBox(); if(!cutBox) throw Error('No stencil');
  const ax=cutBox.x+cutBox.width*.36, ay=cutBox.y+cutBox.height*.28;
  await session.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x:ax,y:ay}] });
  await session.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x:ax+cutBox.width*.2,y:ay+cutBox.height*.2}] });
  await session.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect(page.getByRole('button', { name: /带着花版去配浆/ })).toBeEnabled();
  await page.getByRole('button', { name: /带着花版去配浆/ }).click();
  const bowl = page.locator('.mix-bowl'); await bowl.scrollIntoViewIfNeeded(); const bb = await bowl.boundingBox(); if (!bb) throw Error('No bowl');
  for(let i=0;i<=28;i++) { const a=-Math.PI/2+Math.PI*4*i/28; const point={x:bb.x+bb.width/2+Math.cos(a)*bb.width*.31,y:bb.y+bb.height/2+Math.sin(a)*bb.height*.31}; await session.send('Input.dispatchTouchEvent', { type:i===0?'touchStart':'touchMove', touchPoints:[point] }); }
  await session.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect(page.getByRole('button', { name: /带着浆料去拷花/ })).toBeEnabled();
  await page.getByRole('button', { name: /带着浆料去拷花/ }).click();
  await page.getByRole('button', { name: /压版刮浆/ }).click();
  const print = page.locator('.scrape-capture'); await print.scrollIntoViewIfNeeded(); const pb = await print.boundingBox(); if(!pb) throw Error('No print board');
  await session.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x:pb.x+pb.width*.2,y:pb.y+pb.height*.36}] });
  for(let i=1;i<=12;i++) await session.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x:pb.x+pb.width*(.2+.5*i/12),y:pb.y+pb.height*.36}] });
  await session.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect(page.getByRole('button', { name: /带着花布去染缸/ })).toBeEnabled();
  await page.getByRole('button', { name: /带着花布去染缸/ }).click();
  const vat = page.locator('.vat-scene'); await vat.scrollIntoViewIfNeeded(); const vb=await vat.boundingBox(); if(!vb) throw Error('No vat'); const vatBox = vb;
  async function touchVat(from:number,to:number) { await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:vatBox.x+vatBox.width*.5,y:vatBox.y+vatBox.height*from}]}); for(let i=1;i<=12;i++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:vatBox.x+vatBox.width*.5,y:vatBox.y+vatBox.height*(from+(to-from)*i/12)}]}); await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
  await touchVat(.25,.75); await page.waitForTimeout(120); await touchVat(.55,.2);
  await expect.poll(async () => (await stored(page)).dyeDepth || 0).toBeGreaterThan(0);
});

test('同一纹样和花版改配浆后会生成不同的成品浆痕', async ({ page }) => {
  await fullToPrint(page); await scrape(page); const first = await stored(page);
  await page.getByRole('button', { name: /配浆/ }).click();
  await page.locator('#mix-water').fill('90');
  await stirBowl(page); await page.getByRole('button', { name: /带着浆料去拷花/ }).click();
  await scrape(page); const second = await stored(page);
  expect(second.stencilMask).toBe(first.stencilMask);
  expect(second.printMask).not.toBe(first.printMask);
  expect(second.mix.water).toBe(90);
});

test('编辑器复制保留变换，撤销与重做改变实际项目数据', async ({ page }) => {
  await begin(page); await page.locator('.design-editor-canvas [data-motif-id]').click();
  await page.locator('#motif-scale').fill('1.4');
  await page.getByRole('button', { name: /复制/ }).click();
  let design = (await stored(page)).design;
  expect(design.items).toHaveLength(2); expect(design.items[1].scale).toBe(1.4);
  await page.getByRole('button', { name: /撤销/ }).click();
  design = (await stored(page)).design; expect(design.items).toHaveLength(1);
  await page.getByRole('button', { name: /重做/ }).click();
  design = (await stored(page)).design; expect(design.items).toHaveLength(2);
});

test('部件和手绘线进入设计矢量，并能成为花版目标', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '走进数字染坊' }).click();
  await page.getByRole('button', { name: '添加单瓣' }).click();
  await page.getByRole('button', { name: /亲手画线/ }).click();
  await drag(page, '.design-editor-canvas', .15, .65, .72, .22);
  const design = (await stored(page)).design;
  expect(design.items[0].kind).toBe('petal'); expect(design.strokes).toHaveLength(1);
  expect(design.strokes[0].points.length).toBeGreaterThan(4);
  await page.getByRole('button', { name: /带着设计进入刻版台/ }).click();
  await page.getByRole('button', { name: /刻面/ }).click();
  await drag(page, '.stencil-input', .35, .3, .62, .62);
  await expect(page.getByRole('button', { name: /带着花版去配浆/ })).toBeEnabled();
});

test('只用手绘线也能完成纹样并进入后续工序', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '走进数字染坊' }).click();
  await page.getByRole('button', { name: /亲手画线/ }).click();
  await drag(page, '.design-editor-canvas', .2, .5, .8, .5);
  expect((await stored(page)).design.items).toHaveLength(0);
  expect((await stored(page)).design.strokes).toHaveLength(1);
  await expect(page.getByRole('button', { name: /带着设计进入刻版台/ })).toBeEnabled();
  await page.getByRole('button', { name: /带着设计进入刻版台/ }).click();
  await drag(page, '.stencil-input', .2, .5, .8, .5);
  await expect.poll(async () => (await stored(page)).stencilCoverage).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: /带着花版去配浆/ })).toBeEnabled();
});

test('留连接点会切实补回纸桥并降低大开孔风险', async ({ page }) => {
  await begin(page); await page.getByRole('button', { name: /带着设计进入刻版台/ }).click();
  await page.getByRole('button', { name: /刻面/ }).click();
  await drag(page, '.stencil-input', .18, .18, .58, .58);
  await expect.poll(async () => (await stored(page)).stencilCoverage || 0).toBeGreaterThan(0);
  const before = await stored(page); expect(before.stencilRisk).toBeGreaterThan(0);
  await page.getByRole('button', { name: /留连接点/ }).click();
  await drag(page, '.stencil-input', .22, .375, .53, .375);
  await expect.poll(async () => (await stored(page)).stencilRisk).toBeLessThan(before.stencilRisk);
  const after = await stored(page);
  expect(after.stencilMask).not.toBe(before.stencilMask);
  expect(after.stencilCoverage).toBeLessThan(before.stencilCoverage);
});

test('刮板力度、速度和蘸浆量改变实际浆痕', async ({ page }) => {
  await fullToPrint(page);
  await page.getByRole('button', { name: /压版刮浆/ }).click();
  await page.locator('#squeegee-pressure').fill('1');
  await drag(page, '.scrape-capture', .18, .36, .58, .36);
  await expect.poll(async () => (await stored(page)).printCoverage || 0).toBeGreaterThan(0);
  const first = await stored(page); const firstSweep = first.impressions[0].sweeps[0];
  expect(firstSweep.pressure).toBe(1); expect(first.pasteLoad).toBeLessThan(100);
  await page.getByRole('button', { name: /撤销一刮/ }).click();
  await page.getByRole('button', { name: /蘸浆/ }).click();
  await expect.poll(async () => (await stored(page)).pasteLoad).toBe(100);
  await page.locator('#squeegee-pressure').fill('5');
  const board = page.locator('.scrape-capture'); await board.scrollIntoViewIfNeeded(); const box = await board.boundingBox(); if (!box) throw Error('No board');
  await page.mouse.move(box.x + box.width*.18, box.y + box.height*.36); await page.mouse.down();
  for (let i=1;i<=12;i++) { await page.mouse.move(box.x + box.width*(.18+.4*i/12),box.y+box.height*.36); await page.waitForTimeout(35); }
  await page.mouse.up();
  await expect.poll(async () => (await stored(page)).printCoverage || 0).toBeGreaterThan(0);
  const second = await stored(page); const secondSweep = second.impressions[0].sweeps[0];
  expect(secondSweep.pressure).toBe(5); expect(secondSweep.speed).toBeLessThan(firstSweep.speed);
  expect(second.printMask).not.toBe(first.printMask);
});

test('成品布面点选可追溯成功白纹与漏刮，并返回对应工作台', async ({ page }) => {
  await fullToPrint(page); await scrape(page, .26); const saved = await stored(page);
  await page.getByRole('button', { name: /带着花布去染缸/ }).click(); await dip(page); await finish(page);
  const points = await page.evaluate(async ({ stencilMask, printMask }) => {
    async function data(src: string) { const image = new Image(); image.src = src; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 400; const context = canvas.getContext('2d')!; context.drawImage(image,0,0); return context.getImageData(0,0,400,400).data; }
    const stencil = await data(stencilMask), print = await data(printMask);
    let white: {x:number;y:number}|null = null, missed: {x:number;y:number}|null = null;
    for(let y=6;y<394;y+=2)for(let x=6;x<394;x+=2) {
      const i=(y*400+x)*4+3;
      if(!white && print[i]>100 && print[((y+2)*400+x+2)*4+3]>60) white={x,y};
      if(!missed && stencil[i]>100 && print[i]<5) { let clear=true; for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++)if(print[((y+dy)*400+x+dx)*4+3]>5) clear=false; if(clear) missed={x,y}; }
    }
    return { white, missed };
  }, { stencilMask:saved.stencilMask, printMask:saved.printMask });
  expect(points.white).not.toBeNull(); expect(points.missed).not.toBeNull();
  const fabric = page.locator('[data-testid="final-fabric"]'); await fabric.scrollIntoViewIfNeeded(); const box = await fabric.boundingBox(); if(!box || !points.white || !points.missed) throw Error('No fabric inspection point');
  async function clickAt(point:{x:number;y:number}) { await page.mouse.click(box!.x+11+point.x/400*(box!.width-22),box!.y+11+point.y/400*(box!.height-22)); }
  await clickAt(points.white); await expect(page.locator('.process-inspector h3')).toContainText('白纹');
  await clickAt(points.missed); await expect(page.locator('.process-inspector h3')).toContainText('有刻口');
  await page.getByRole('button', { name: /返回上浆台调整/ }).click(); await expect(page.getByRole('heading', { name: '拷花上浆台' })).toBeVisible();
});

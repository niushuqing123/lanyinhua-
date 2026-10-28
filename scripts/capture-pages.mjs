import { chromium } from '@playwright/test';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const directory = new URL('../course_assets/h5-pages/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const name of await readdir(directory)) if (name.endsWith('.jpg')) await unlink(new URL(name, directory));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
async function capture(file) { await page.screenshot({ path: fileURLToPath(new URL(file, directory)), type: 'jpeg', quality: 89, fullPage: true, animations: 'disabled' }); console.log(`已导出 ${file}`); }
async function draw(selector, x1, y1, x2, y2) {
  const node = page.locator(selector); await node.scrollIntoViewIfNeeded(); const box = await node.boundingBox(); if (!box) throw Error(`找不到 ${selector}`);
  await page.mouse.move(box.x + box.width*x1, box.y + box.height*y1); await page.mouse.down(); await page.mouse.move(box.x + box.width*x2, box.y + box.height*y2, { steps:20 }); await page.mouse.up();
}
try {
  await page.goto(baseUrl); await page.evaluate(() => localStorage.clear()); await page.reload();
  await capture('01-首页.jpg'); await page.getByRole('button', { name:'走进数字染坊' }).click();
  await page.getByRole('button', { name:'添加团花' }).click(); await page.getByRole('button', { name:'添加枝叶' }).click();
  await page.locator('.motif-parts button').first().click();
  await page.getByRole('button', { name:/亲手画线/ }).click();
  await draw('.design-editor-canvas', .13,.72,.42,.84);
  await page.getByRole('button', { name:'四方连续' }).click(); await capture('02-纹样设计.jpg');
  await page.getByRole('button', { name:/带着设计进入刻版台/ }).click();
  await page.getByRole('button', { name:/刻面/ }).click();
  for (const [x,y] of [[.08,.08],[.58,.08],[.08,.58],[.58,.58]]) await draw('.stencil-input', x,y,x+.34,y+.34);
  await page.getByRole('button', { name:/留连接点/ }).click(); await draw('.stencil-input', .11,.25,.43,.25);
  await capture('03-油纸刻版.jpg'); await page.getByRole('button', { name:/带着花版去配浆/ }).click();
  await page.locator('.mix-bowl').scrollIntoViewIfNeeded(); const box = await page.locator('.mix-bowl').boundingBox(); if (!box) throw Error('找不到搅拌碗');
  for (let i=0;i<=34;i++) { const a=-Math.PI/2+Math.PI*4*i/34; await page.mouse.move(box.x+box.width/2+Math.cos(a)*box.width*.31,box.y+box.height/2+Math.sin(a)*box.height*.31); if(i===0) await page.mouse.down(); } await page.mouse.up();
  await capture('04-防染浆配制.jpg'); await page.getByRole('button', { name:/带着浆料去拷花/ }).click();
  await page.getByRole('button', { name:/压版刮浆/ }).click(); for (const y of [.2,.38,.62,.8]) { if (Number((await page.locator('.paste-reservoir b').textContent())?.replace('%','')) < 8) await page.getByRole('button', { name:/蘸浆/ }).click(); await draw('.scrape-capture', .08,y,.92,y); }
  await capture('05-拷花上浆.jpg'); await page.getByRole('button', { name:/带着花布去染缸/ }).click();
  await draw('.vat-scene', .5,.25,.5,.75); await page.waitForTimeout(300); await capture('06-靛蓝浸染.jpg');
  await draw('.vat-scene', .5,.55,.5,.2); await page.getByRole('button', { name:/去浆显花/ }).click();
  await capture('07-去浆显花.jpg'); await page.getByRole('button', { name:/入水去浆/ }).click(); await page.getByRole('button', { name:/提布晾晒/ }).click();
  await capture('08-成品方巾.jpg'); await page.getByRole('button', { name:/帆布包/ }).click(); await capture('09-文创帆布包.jpg');
} finally { await browser.close(); }

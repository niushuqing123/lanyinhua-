# lanyinhua-
桐乡蓝印花布数字交互体验

---

## 一布一染｜桐乡蓝印花布数字交互体验

一个移动端优先的 H5 教学体验。使用者从空白纹样开始，依次完成纹样设计、油纸刻版、防染浆配制、拷花上浆、靛蓝浸染和去浆显花。它使用简化的二维规则展示工序之间的关系，**不能用于判断真实材料配比、染色化学或布料质量**。

## 技术栈与环境

- React 19、TypeScript、Vite 7；图形使用 SVG 与 Canvas 2D。
- 交互主要使用 Pointer Events，兼容鼠标与触屏；进度保存在当前浏览器的 `localStorage`，没有账号或后端。
- 推荐 Node.js 20.19+ 或 22.12+，以及 npm。自动化测试使用 Playwright 和 Chrome。

## 第一次运行

```bash
npm ci
npm run dev
```

打开终端输出的本地地址；Vite 默认端口通常为 `5173`，端口被占用时会变化。其他命令：

```bash
npm run build          # TypeScript 检查并生成 dist/
npm run preview        # 本机预览生产构建，默认端口通常为 4173
npm test               # Playwright 浏览器测试，需要 Chrome
npm run capture:pages  # 生成课程展示截图
```

如果测试机器没有 Chrome，先按 Playwright 提示安装浏览器，例如 `npx playwright install chrome`。测试配置在 `playwright.config.ts`，使用 `127.0.0.1:4173`。

## 目录结构

```text
src/                 六个工作台、状态模型、SVG/Canvas 计算与样式
tests/               Playwright 浏览器测试
scripts/             页面截图脚本
course_assets/       项目实际操作截图，供课程展示使用
index.html           H5 入口
package.json         依赖与命令
DESIGN_SPEC.md        交互和教学模型说明
CONTENT_SOURCES.md   文化内容来源与使用边界
TEST_REPORT.md       已记录的验收结果
HANDOFF.md           新负责人接手指南
```

仓库不包含 `node_modules/`、`dist/`、测试结果、个人环境文件和 PPT 制作缓存。克隆后用 `npm ci` 重新安装依赖。

## 当前功能

1. **纹样设计**：六种原创传统风格矢量纹样、四种拼搭部件、自由画线；支持拖动、缩放、旋转、镜像、复制、删除、撤销和重做，以及独幅、镜像、横向、四方连续排列。
2. **油纸刻版**：刻线、凿点、刻面和留桥；有效镂空由刀路与用户纹样相交并扣除留桥区域得到。
3. **防染浆配制**：调整黄豆粉、石灰粉、水的虚拟份数并搅拌；显示偏稀、偏稠等教学反馈。参数不是真实工艺的最佳配方。
4. **拷花上浆**：摆放、旋转花版，记录刮板轨迹、力度、速度和浆量；未覆盖的刻口在成品中不会留白。
5. **靛蓝浸染**：主动拖布入缸、停留、晃动、提出，支持重复浸染；颜色深浅由简化状态模型决定。
6. **成品工坊**：去浆显花、点选布面追溯工序原因、教学型评价、方巾/帆布包/书签数字预览，导出 1080 × 1440 PNG 成品卡。

`src/workshopModel.ts` 定义统一 `WorkshopState`，`src/App.tsx` 负责工作台之间的数据联动。修改上游工序会清除需重新制作的下游结果，避免沿用旧纹样。详细计算与边界见 [DESIGN_SPEC.md](DESIGN_SPEC.md)。

## 分支与接手

- `main`：本次上传的旧版基线。建议保留，便于对照与回退。
- `redesign-v2`：新版开发起点。新负责人可从此分支继续，按阶段提交。

接手步骤与注意事项见 [HANDOFF.md](HANDOFF.md)。

## 已知问题与边界

- 目前没有账号、云端同步或正式公开部署；不同浏览器/设备之间不会共享进度。
- 现有触屏验收是 Chrome 自动化模拟，尚未在实体 iPhone Safari 与 Android Chrome 上系统测试下载权限、字体和手势。
- 未完成真实用户访谈、课堂教学效果验证或工坊专家复核；教学评分不是技艺鉴定。
- 当前页面适合手机操作，在大屏上仍采用居中的 H5 画框。新版若要重设计桌面体验，需要重新规划布局。

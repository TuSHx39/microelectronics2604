# 微电子2604班最佳团日

原生 HTML / CSS / JavaScript，手机优先，支持本地离线打开。

直接双击 `index.html`，点击「开启团日」观看开场；选择篇章卡片后进入相应活动，再点击活动卡片展开正文与照片。

## 页面与文件

- `index.html`：开场、学校/书院页头、首页班徽、篇章卡片、页尾与弹窗。
- `css/style.css`：圆润卡片、书法标题、红蓝色系、开屏/切章/展开动画和响应式。
- `js/activities.js`：23项活动数据、双编号及照片清单。
- `content/stories.json`：按sourceId维护的展示文案，包含活动主旨、初衷、实践和收获思考。
- `js/main.js`：按篇章展示、活动展开、索引跳转、随机照片、灯箱、开场重播。
- `assets/logos/`、`assets/photos/`：3枚原徽章与59张照片。
- `assets/fonts/`：本地书法字体与开放字体许可。
- `tools/import-resources.ps1`：开发期导入，不参与网页运行。
- `HANDOFF.md`：第二阶段完成情况、编辑边界与后续事项。
- `docs/VALIDATION.md`：内容、资源和浏览器验收记录。
- `tools/complete-content.py`：从正式第二版及原始照片重建第二阶段内容和压缩副本。
- `tools/verify-site.mjs`、`check-importer.mjs`、`check-browser.cjs`：开发期验收脚本，不参与网页运行。

## 内容与资源维护

`boardId` 决定展示编号，`sourceId` 对应 Word 活动与网站照片文件名前缀。展示正文来自 `story.aim / why / actions / takeaway`：开头说明要做什么，下接“活动初衷”“实践回顾”“收获与思考”。准备、物资、人员分工与后期安排不在页面中罗列，原文详情仅作为开发资料保留在 `details` 中。

定性收获根据活动材料与照片整理，不新增未确认的参与人数、传播量或里程达成数据；`details.results` 暂保留为空。

`photos` 支持 `src`、`alt`、`position`、`fit`、`width`、`height`；`coverIndex` 选择封面。照片不展示逐张注释，`alt` 仅用于无障碍阅读。长幅光盘对比图使用 `contain`，灯箱完整显示原图比例。网站照片合计由74.8 MB降至25.0 MB，原始输入未修改。

**第15/16项照片已按用户纠正：** 原始14组实际为AI活动、原始15组实际为竞赛活动。网站副本的14/15两组内容已交换，编号数据及原始输入文件未改。导入脚本包含相同修正，避免重导入后放反。

`import-resources.ps1` 检测到已有数据会在写入任何文件前停止；`-Force` 仅用于明确恢复第一阶段原始数据，会覆盖第二阶段编辑及压缩资源。

`complete-content.py` 从原始材料重新生成展示文案、替代文本、封面与图片。再次执行会覆盖这些字段的手工修改；需要先备份 `js/activities.js`，并将要保留的编辑合入生成脚本。该工具需要Python和Pillow，网页运行不需要它们。

修改展示文案时，先编辑 `content/stories.json`（键为sourceId），再运行 `python tools/complete-content.py --stories-only`。这只更新展示文案、简介与注释状态，不重新处理照片。完整重建也会读取同一份文案，不会恢复策划书展示。

## 字体与部署

标题使用 [Ma Shan Zheng](https://github.com/google/fonts/tree/main/ofl/mashanzheng)，字体随项目本地保存，许可见 `assets/fonts/OFL.txt`。正文保留系统字体。

GitHub Pages：将本目录内容放入发布根目录或 `docs/`；如发布父目录，访问 `/microelectronics-2604/`。无需构建，不依赖 CDN、在线字体或后端。

## 开发验收

在本目录执行无依赖检查：

```powershell
node --check js/main.js
node --check js/activities.js
node tools/verify-site.mjs
node tools/check-importer.mjs
```

导入保护回归需要PowerShell 7（`pwsh`）。浏览器验收使用开发依赖，在本目录的父目录执行：

```powershell
npm.cmd install --prefix .qa --no-save --no-package-lock playwright
node microelectronics-2604/tools/check-browser.cjs
$env:PLAYWRIGHT_CHANNEL = 'chrome'
node microelectronics-2604/tools/check-browser.cjs
```

默认使用已安装的Edge。报告与截图写入 `docs/qa/`；包含375、390、430、768、1440px、全部活动与图片、离线字体、减少动态效果、灯箱、历史导航及重播。具体覆盖和设备边界见 `docs/VALIDATION.md`。

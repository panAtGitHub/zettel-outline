# Zettel Outline

根据 Markdown 文件名中的数字编号构建 Obsidian 右侧大纲树。支持桌面与移动端。

## 项目状态

本项目于 2026-10-15 从用户保留的 1.0.0 编译产物恢复。它是独立插件，不是 obsidian-zettelkasten-navigation 的分支。原始 TypeScript 源码、类型与注释未能找回；当前源码是从可读 bundle 拆分恢复的 JavaScript ES modules，保留原有逻辑。原始三文件保存在 recovery/original/，用于回归对照。

## 使用方式

默认文件名：标题+100、子标题+100-1、孙标题+100-1-3。数字每段最多四位，层级数不限；数字排序会把 2 放在 10 前面。可在设置中选择 ID 前置或后置，并配置标题分隔符和数字段分隔符。两种分隔符须为不同的非数字单字符。

通过左侧树图标或命令面板打开 Zettel Outline，默认位于右侧边栏。普通点击打开笔记，桌面端 Ctrl/Cmd 点击新标签打开。提供虚拟列表、索引缓存、文件变更增量更新、ID 冲突与忽略原因提示，以及中英文界面。

## 开发

使用 Node.js 22 或更高版本：

```powershell
npm ci
npm run build
npm test
npm run build:obsidian
```

- npm run dev：监听源码变更，构建至 dist/；不自动同步库。
- npm run build：生成 dist/main.js，并更新项目根目录 main.js。
- npm test：对照原始产物验证解析、索引与视图入口；请先构建。
- npm run build:obsidian：构建后同步三个运行文件到 C:\iWork\obsidian\.obsidian\plugins\zettel-outline，保留 data.json。之后在 Obsidian 重新加载插件。
- 可通过 OBSIDIAN_PLUGIN_DIR 环境变量指定完整插件目标目录。

## 源码结构

- src/main.js：生命周期、命令、侧栏入口和设置界面。
- src/index/Parser.js：文件名及数字编号解析。
- src/services/IndexService.js：索引、缓存、冲突处理和增量更新。
- src/view/：侧栏与虚拟树列表。
- src/settings/Settings.js：默认设置。
- src/i18n/i18n.js：中英文文案。
- src/utils/、src/perf/：散列、字符校验和性能记录。

## 安装

目前处于开发阶段，尚未上架 Obsidian 社区插件目录。

从源码安装：克隆本仓库，运行 `npm ci` 和 `npm run build`，将 `dist/` 中的 `main.js`、`manifest.json`、`styles.css` 复制到笔记库的 `.obsidian/plugins/zettel-outline/`，然后在 Obsidian 的第三方插件设置中启用 Zettel Outline。升级时保留已有 `data.json`。

## 项目仓库与上架准备

公开仓库：https://github.com/panAtGitHub/zettel-outline

GitHub Actions 会在推送和拉取请求时构建插件、运行回归测试，并保存三个运行文件作为构建产物。构建产物可用于手动测试，不代表正式版本发布。

上架前待办见 [恢复记录](docs/recovery-notes.md)。目前尚未提交上架申请，开源许可证待作者确定。

## 结构历史

通过样式二工具栏的历史按钮或“查看结构历史”命令，以左右两列比较修改前后的名称、编号和层级。可先预览再恢复结构，正文不会被覆盖。结构记录保存在独立的 history.json；详情与恢复边界见 [结构历史说明](docs/structure-history.md)。

# Obsidian Outliner 源码对照研究

研究日期：2026-10-16。
仓库：https://github.com/vslinko/obsidian-outliner
源码版本：b51918d4eaa75223780a404c40f2d9406df6a3c0。
只读参考目录：C:/iCode/obsidian-plugins/zettel-outline-outliner-reference。
本轮只研究与记录，不改动卡片笔记树的拖拽行为。

## 上下移动

ListsMovementCommands.ts 注册 Mod+Shift+ArrowUp / ArrowDown。MoveListUp.ts 与 MoveListDown.ts 将当前列表连同子列表一起移动。
有相邻同级时，直接插到相邻同级的前面或后面；没有相邻同级时，可进入父项相邻同级的末尾或开头。不是简单地移动光标，也不总限制于当前父级。
完成后保持相对光标位置，并调用 recalculateNumericBullets 重新计算有序列表编号。

## 鼠标拖动

DragAndDrop.ts 从列表 marker/bullet 上按下鼠标准备拖动。mousemove 开始拖拽，mouseup 完成，Escape 取消；不是整段文本都原生 draggable。
预先遍历结构树收集合法 DropVariant：before、after，以及可用的 inside。每个候选同时保存垂直位置、层级和最终移动位置。
先选择垂直距离最近的候选线；同线附近 4px 内的候选，再按横向距离选层级。因此鼠标在一条插入线上左右移动时能改变父级。
候选排除拖动分支内部：遍历时到达当前移动列表即不继续进入其子项。
视觉：源分支半透明；目标父行高亮；4px 插入线，左侧以虚线表示缩进空间。源码的反馈核心是准确落点线，而不是靠整行渐变判定语义。

## 与卡片笔记树的差异

1. 卡片笔记树用文件名编号决定层级和顺序，Outliner 改的是单份 Markdown 文本树。
2. 当前实现只能移到某父级末尾，不能 before/after，因此无论如何改动画都不能实现 Outliner 的实际位置移动。
3. 当前按目标行横坐标推算父级，没有预先枚举结构合法的插入边界。
4. 当前使用整行原生 HTML drag，Outliner 从 bullet 启动自定义鼠标拖动。

## 推荐重构次序

1. 明确顺序与编号的关系。保持现有“编号决定顺序”则上下调换要修改两棵分支编号，跨位置插入可能需要分配空号、腾挪编号或重编号；不能默默将所有兄弟重排为 1、2、3。
2. 增加 MoveBefore/MoveAfter 结构命令及可撤销的多分支编号事务；需要临时中转路径处理编号互换，避免文件冲突；排除文件与外部文件变化仍须校验。
3. 注册 Ctrl+Shift+上下移动命令，先验证相邻兄弟互换；对跨父级边界行为单独定义测试。
4. 拖拽改为编号作为把手，显式 before/after/inside 候选，用真实子树边界计算插入线，而不是标题行底部的随意线。
5. 插入线为主反馈，目标父行轻微渐变为辅；不让渐变时长决定是否能够落下。

## 待定决策

2015、2022 等顶层编号可能有年份含义。若上下调整顺序交换编号，文件语义也会改变；若希望编号不动而顺序任意，需要独立排序数据，并修改现有数字排序原则。不能在未明确时直接实施全局重编号。

## 源文件

- https://github.com/vslinko/obsidian-outliner/blob/b51918d4eaa75223780a404c40f2d9406df6a3c0/src/features/ListsMovementCommands.ts
- https://github.com/vslinko/obsidian-outliner/blob/b51918d4eaa75223780a404c40f2d9406df6a3c0/src/operations/MoveListUp.ts
- https://github.com/vslinko/obsidian-outliner/blob/b51918d4eaa75223780a404c40f2d9406df6a3c0/src/operations/MoveListDown.ts
- https://github.com/vslinko/obsidian-outliner/blob/b51918d4eaa75223780a404c40f2d9406df6a3c0/src/features/DragAndDrop.ts

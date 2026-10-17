# 恢复记录与后续事项

恢复日期：2026-10-15。基线：用户提供的 Zettel Outline 1.0.0 main.js、manifest.json、styles.css。原文件复制至 recovery/original/，未修改。

恢复方法：根据 bundle 中保留的 src/... 模块边界拆分，将 obsidian 运行时引用改回 ES imports，恢复模块依赖与导出，去除打包器包装。未尝试虚构丢失的 TypeScript 类型。重建保留编译期生成的局部变量及部分降级语法，后续可逐模块清理。

## 验证范围

- 构建完整运行插件。
- 文件名解析矩阵与原始 bundle 对照。
- 索引构建、数字排序、缺失祖先、重复编号与忽略统计对照。
- 验证构建入口能够创建插件并打开右侧栏。
- 尚未完成真实 Obsidian 桌面/移动端的交互验收。

## 已发现的原始问题，待完善

- 原分隔符回调遮蔽问题已随设置界面改造移除，原始产物仍保留作为恢复基线。
- 部分运行时 API 及 DOM 使用方式需要在正式上架准备时逐项审查。
- 作者于 2026-10-17 确认采用 MIT 许可证，已补充 LICENSE。
- 需完善截图、使用示例、兼容性验证、版本发布资料，并按提交时的 Obsidian 官方要求进行检查。
- GitHub 公开仓库：https://github.com/panAtGitHub/zettel-outline 。自动构建与回归测试由 GitHub Actions 执行；尚未发布正式 Release 或提交社区插件目录。

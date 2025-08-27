# 贡献指南

## 提交规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(scope): <description>

### 发布说明分类

自动生成的发布说明将按以下分类组织：

- ✨ 功能更新 (`feat`)
- 🐛 Bug修复 (`fix`)
- 📚 文档更新 (`docs`)
- 💄 样式优化 (`style`)
- ♻️ 代码重构 (`refactor`)
- ⚡ 性能优化 (`perf`)
- ✅ 测试 (`test`)
- 📦 构建 (`build`)
- 👷 CI/CD (`ci`)
- 🔧 其他更改 (`chore`)

### 示例

```bash
feat(commands): 添加订单自动查询功能
fix(api): 修复支付回调验证失败
docs(readme): 更新配置说明
refactor(database): 优化数据库查询逻辑
chore(deps): 更新依赖版本
```

### 重大变更

在类型后添加 `!` 触发 major 版本更新：

```bash
feat(api)!: 重构API接口
```

## 自动发布

- 推送到 `main`/`master` 分支自动发布
- `feat:` → minor 版本 (1.0.0 → 1.1.0)
- `fix:` → patch 版本 (1.0.0 → 1.0.1)
- `feat!:` → major 版本 (1.0.0 → 2.0.0)

## 开发

```bash
npm install    # 安装依赖
npm run build  # 构建项目
```
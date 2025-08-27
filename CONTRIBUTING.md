# 贡献指南

感谢您对 PayTool 项目的贡献！

## 提交规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，请按照以下格式提交代码：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 提交类型 (type)

| 类型 | 说明 | 版本影响 |
|---|---|---|
| `feat` | 新功能 | minor 版本 |
| `fix` | Bug修复 | patch 版本 |
| `docs` | 文档更新 | patch 版本 |
| `style` | 代码格式修改（不影响功能） | patch 版本 |
| `refactor` | 代码重构（不修复bug也不添加功能） | patch 版本 |
| `perf` | 性能优化 | patch 版本 |
| `test` | 测试相关 | - |
| `build` | 构建相关 | - |
| `ci` | CI/CD相关 | - |
| `chore` | 其他修改 | - |

### 重大变更

如果提交包含重大变更（breaking changes），在类型后添加 `!` 或在footer中添加 `BREAKING CHANGE:`，这将触发 major 版本更新。

### 提交示例

```bash
# 新功能 (minor 版本: 1.0.0 → 1.1.0)
feat: 添加订单自动查询功能
feat(payment): 支持新的支付方式配置

# Bug修复 (patch 版本: 1.0.0 → 1.0.1)
fix: 修复支付回调验证失败问题
fix(database): 解决订单查询超时问题

# 文档更新
docs: 更新配置说明文档
docs(readme): 修正安装步骤说明

# 重大变更 (major 版本: 1.0.0 → 2.0.0)
feat!: 重构API接口，移除旧版支持
feat: 新增用户认证

BREAKING CHANGE: API接口参数格式已变更，请参考新文档
```

## 自动发布

项目使用 [semantic-release](https://github.com/semantic-release/semantic-release) 进行自动版本管理和发布。

### 发布流程

1. **提交代码**: 按照上述规范提交代码到 `main` 或 `master` 分支
2. **自动分析**: GitHub Actions 自动分析提交历史
3. **确定版本**: 根据提交类型自动确定新版本号
4. **生成日志**: 自动生成 CHANGELOG.md
5. **自动发布**: 发布到 npm 仓库和 GitHub Releases

### 版本规则

- `feat:` 提交 → minor 版本增加 (1.0.0 → 1.1.0)
- `fix:` 提交 → patch 版本增加 (1.0.0 → 1.0.1)
- `feat!:` 或 `BREAKING CHANGE:` → major 版本增加 (1.0.0 → 2.0.0)

### 分支策略

- **main/master**: 稳定版本，自动发布正式版
- **develop**: 开发分支，自动发布beta版本
- **其他分支**: 不触发自动发布

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

## 开发环境设置

```bash
# 克隆项目
git clone <repository-url>
cd PayTool

# 安装依赖
npm install

# 构建项目
npm run build

# 清理构建产物
npm run clean
```

## 发布前检查

在提交代码前，请确保：

1. ✅ 代码符合项目风格
2. ✅ 所有测试通过
3. ✅ 构建成功 (`npm run build`)
4. ✅ 提交信息符合规范
5. ✅ 更新相关文档

## 问题反馈

如果在贡献过程中遇到问题，请：

1. 查看现有的 [Issues](https://github.com/WittF/PayTool/issues)
2. 如果没有相关问题，请创建新的 Issue
3. 详细描述问题和复现步骤

感谢您的贡献！🎉

## [1.1.0](https://github.com/WittF/PayTool/compare/v1.0.4...v1.1.0) (2025-08-28)

### ✨ 功能更新

* **config:** 添加跳转地址配置项支持return_url参数 ([e533d42](https://github.com/WittF/PayTool/commit/e533d42c8304699779916ed4a3b9efdc11236e6b))

## [1.0.4](https://github.com/WittF/PayTool/compare/v1.0.3...v1.0.4) (2025-08-28)

### ♻️ 代码重构

* **callback, commands:** 增强支付成功通知逻辑，添加调试日志以便于开发模式下的订单数据对比 ([0217b58](https://github.com/WittF/PayTool/commit/0217b58f9796086b5caf2d729be7d2c7cacc9862))
* **callback, commands:** 更新支付成功通知逻辑，增加触发源参数以增强日志信息 ([644f308](https://github.com/WittF/PayTool/commit/644f30814f066bfcfc59e187520dd43a35ed1119))
* **callback, commands:** 重构支付成功通知逻辑，简化消息发送流程并增强错误处理 ([dd292c1](https://github.com/WittF/PayTool/commit/dd292c1249d1a8e21b38da801fbf94973f1f00f0))

## [1.0.3](https://github.com/WittF/PayTool/compare/v1.0.2...v1.0.3) (2025-08-27)

### ♻️ 代码重构

* **callback, commands:** 重要操作日志始终显示，限制详细错误信息仅在devMode下显示 ([3220286](https://github.com/WittF/PayTool/commit/3220286f96d0d79d73865c8682e7315320ca312e))

## [1.0.2](https://github.com/WittF/PayTool/compare/v1.0.1...v1.0.2) (2025-08-27)

### 🐛 Bug修复

* **commands:** 限制详细错误信息仅在devMode下显示 ([ab44263](https://github.com/WittF/PayTool/commit/ab44263e5e5f8ff7c1002a594b458a63cab2b88a))

### 📚 文档更新

* **guide:** 更新贡献指南和README文件，调整提交信息格式 ([5e370a9](https://github.com/WittF/PayTool/commit/5e370a9e3de358f75be0965794d444c0e049655e))

## [1.0.1](https://github.com/WittF/PayTool/compare/v1.0.0...v1.0.1) (2025-08-27)

### 🐛 Bug修复

* 优化命令反馈逻辑，改为异步发送消息 ([e009927](https://github.com/WittF/PayTool/commit/e009927a1963d5ec8cce88501d60c7ef05e08ead))

### ♻️ 代码重构

* 优化消息发送逻辑，增强群聊和私聊通知处理 ([1ee4093](https://github.com/WittF/PayTool/commit/1ee40936905a1d60c06a766a0ddb048468da7cea))

### 🔧 其他更改

* 更新插件描述，增加对分配功能的说明 ([161b1a6](https://github.com/WittF/PayTool/commit/161b1a680b754dc7a7ff493f15bdef81df0015fc))

## 1.0.0 (2025-08-27)

### ✨ 功能更新

* 初始化PayTool易支付插件 ([d9d69bc](https://github.com/WittF/PayTool/commit/d9d69bc6a23bfd5e0c7ac35b4bf5320403dc9f79))

### 🐛 Bug修复

* 增强会话验证，确保用户ID存在 ([4647fb1](https://github.com/WittF/PayTool/commit/4647fb1f074c7cc7bd1f3c5bde328122c0eccacb))

### 📚 文档更新

* 更新 README 文件，添加徽章并移除示例部分 ([5645cb0](https://github.com/WittF/PayTool/commit/5645cb0ac2141c271543ea5e72132d5ba7e417f8))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

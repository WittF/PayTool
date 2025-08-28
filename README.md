# PayTool - Koishi 易支付插件

[![npm version](https://badge.fury.io/js/koishi-plugin-pay-tool.svg)](https://badge.fury.io/js/koishi-plugin-pay-tool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个适用于Koishi框架的易支付工具插件，支持订单创建、查询、退款、分配等功能，集成微信支付和支付宝支付。

## 功能特性

- ✅ 支付订单创建
- ✅ 订单状态查询
- ✅ 订单退款处理
- ✅ 订单分配功能
- ✅ 支付成功回调处理
- ✅ 多种支付方式支持（支付宝、微信支付、自定义）
- ✅ 数据库订单记录
- ✅ 安全的MD5签名验证

## 配置

在Koishi管理界面中配置以下选项：

### 插件配置
- **管理员QQ号**: 具有订单查询和退款权限的QQ号
- **回调路由**: 支付回调的路由前缀（默认：/paytool/callback/）
- **调试模式**: 启用详细日志输出，便于问题排查
- **主动查询模式**: 用于无法接收回调通知的环境，自动轮询订单状态
  - **等待时长**: 首次查询新订单需要等待的时间（默认：30秒）
  - **轮询间隔**: 每次查询订单后的等待时间（默认：30秒）
  - **订单过期时间**: 超过此时间将停止主动查询（默认：30分钟）

### 商户配置
- **接口地址**: 易支付平台的API地址 (如: https://your-epay-domain.com)
- **商户PID**: 易支付商户唯一标识
- **商户密钥**: 易支付商户密钥
- **商品名称**: 订单中显示的商品名称（默认：金币）
- **支付方式配置**: 自定义支付方式和显示名称（如：alipay -> 支付宝）
- **默认支付方式**: 创建订单时的默认支付方式代码（如：wxpay）
- **回调通知地址**: 完整的回调通知URL（默认：https://koishi.local/paytool/callback/）
- **跳转地址**: 交易完成后浏览器跳转地址（可选，留空则不跳转）

## 使用说明

所有指令均需要管理员权限。

### 创建支付订单
```
pay.create <金额> [支付方式]
```
### 查询订单
```
pay.query <订单号>      # 查询指定订单
pay.query @用户         # 查询用户所有订单  
```

### 申请退款
```
pay.refund <订单号>
```

### 分配订单
```
pay.provisioning <订单号> @用户
```

## 高级功能

- **自动回调处理**: 支付成功后自动更新订单状态
- **主动查询模式**: 可配置自动轮询订单状态
- **订单归属**: 支持将订单分配给指定用户
- **安全验证**: MD5签名验证，管理员权限控制

## 开发说明

### 贡献代码

如果您想为本项目贡献代码，请查看 [贡献指南](CONTRIBUTING.md) 了解：

项目使用 [semantic-release](https://github.com/semantic-release/semantic-release) 进行自动版本管理和发布。

## 许可证

MIT License

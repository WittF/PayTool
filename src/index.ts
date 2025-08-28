import { Context, Logger } from 'koishi'

// 导入配置和模块
export { Config, schema } from './config'
export const name = 'pay-tool'
export const inject = ['database', 'server']

import { Config } from './config'
import { setupDatabase, OrderDatabase } from './database'
import { EpayClient } from './api-client'
import { setupCommands, cleanupAllPollings } from './commands'
import { setupCallback } from './callback'

export function apply(ctx: Context, config: Config) {
  // 创建日志器
  const logger = new Logger('pay-tool')

  // 验证必要配置
  if (!config.apiUrl || !config.merchantPid || !config.merchantKey) {
    logger.error('配置不完整: 请检查接口地址、商户PID和商户密钥')
    return
  }

  if (!config.adminQQ) {
    logger.error('配置不完整: 请设置管理员QQ号')
    return
  }

  // 初始化数据库
  setupDatabase(ctx)
  if (config.devMode) {
    logger.info('数据库表已初始化')
  }

  // 创建核心实例
  const orderDb = new OrderDatabase(ctx)
  const epayClient = new EpayClient(config, logger)

  // 设置命令
  const payCmd = setupCommands(ctx, config, epayClient, orderDb, logger)
  if (config.devMode) {
    logger.info('支付命令已注册')
  }

  // 设置回调处理
  setupCallback(ctx, config, orderDb, logger)

  // 插件就绪
  ctx.on('ready', () => {
    logger.info('🚀 PayTool 支付插件已启动')
    
    if (config.devMode) {
      logger.info(`📋 支持的功能:`)
      logger.info(`• 创建订单: pay.create <金额> [支付方式]`)
      logger.info(`• 查询订单: pay.query <订单号|@用户>`)
      logger.info(`• 申请退款: pay.refund <订单号>`)
      logger.info(`• 分配订单: pay.provisioning <订单号> @用户`)
      logger.info(`📡 回调通知地址: ${config.notifyUrl}`)
      logger.info(`📍 回调路由: ${config.callbackRoute}`)
      logger.info(`🔗 跳转地址: ${config.returnUrl || '未配置'}`)
      logger.info(`👤 管理员QQ: ${config.adminQQ}`)
      logger.info(`🏪 商户PID: ${config.merchantPid}`)
      logger.info(`💳 默认支付方式: ${config.defaultPayment}`)
      logger.info(`🔄 主动查询模式: ${config.activeQueryEnabled ? '已启用' : '已禁用'}`)
      if (config.activeQueryEnabled) {
        logger.info(`⏱️ 等待时长: ${config.initialWaitTime || 30000}ms`)
        logger.info(`🔁 轮询间隔: ${config.pollingInterval || 30000}ms`)
      }
      logger.info(`🛠️ 调试模式: 已启用`)
    }
  })

  // 插件卸载清理
  ctx.on('dispose', () => {
    // 清理所有活跃的轮询
    cleanupAllPollings()
    logger.info('🧹 PayTool 插件已卸载')
  })

  // 全局错误处理
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`未处理的Promise拒绝: ${reason}`)
  })

  process.on('uncaughtException', (error) => {
    logger.error(`未捕获的异常: ${error.message}`)
  })
}

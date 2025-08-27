import { Context, h, Logger } from 'koishi'
import {} from '@koishijs/plugin-server'
import { Config } from './config'
import { OrderDatabase } from './database'
import { PaymentCallback } from './types'
import { verifySign, formatPaymentType } from './utils'

export function setupCallback(
  ctx: Context,
  config: Config,
  orderDb: OrderDatabase,
  logger: Logger
) {
  // 处理路由前缀，确保以/开始和结束
  let routePrefix = config.callbackRoute
  if (!routePrefix.startsWith('/')) {
    routePrefix = '/' + routePrefix
  }
  if (!routePrefix.endsWith('/')) {
    routePrefix = routePrefix + '/'
  }
  
  // 注册支付回调路由
  ctx.server.get(routePrefix, async (koaCtx: any) => {
    try {
      const callbackData: PaymentCallback = koaCtx.request.query

      if (config.devMode) {
        logger.info(`收到支付回调: ${JSON.stringify(callbackData)}`)
      }

      // 验证签名
      if (!verifySign(callbackData, config.merchantKey)) {
        logger.error('支付回调签名验证失败')
        koaCtx.status = 400
        koaCtx.body = 'fail'
        return
      }

      // 查询本地订单
      const localOrder = await orderDb.getOrderByOutTradeNo(callbackData.out_trade_no)
      if (!localOrder) {
        logger.error(`未找到订单: ${callbackData.out_trade_no}`)
        koaCtx.status = 404
        koaCtx.body = 'fail'
        return
      }

      // 验证订单金额
      if (parseFloat(localOrder.amount) !== parseFloat(callbackData.money)) {
        logger.error(`订单金额不匹配: 本地=${localOrder.amount}, 回调=${callbackData.money}`)
        koaCtx.status = 400
        koaCtx.body = 'fail'
        return
      }

      // 处理支付状态
      if (callbackData.trade_status === 'TRADE_SUCCESS') {
        // 避免重复处理
        if (localOrder.status === 'paid') {
          logger.info(`订单 ${callbackData.out_trade_no} 已处理过`)
          koaCtx.body = 'success'
          return
        }

        // 更新订单状态
        await orderDb.updateOrderStatus(callbackData.out_trade_no, 'paid')

        if (config.devMode) {
          logger.info(`订单 ${callbackData.out_trade_no} 支付成功`)
        }

        // 构建支付成功消息 - 使用创建订单时的支付方式，而不是API返回的
        const paymentTypeText = formatPaymentType(localOrder.payment_type, config.paymentMethods)

        const successMessages = [
          `🎉 支付成功！`,
          `📋 订单号: ${callbackData.out_trade_no}`,
          `💰 支付金额: ¥${callbackData.money}`,
          `💳 支付方式: ${paymentTypeText}`,
          `⏰ 支付时间: ${new Date().toLocaleString('zh-CN')}`
        ]

        // 如果订单有归属人，添加归属人信息
        if (localOrder.customer_qq) {
          successMessages.splice(4, 0, `👤 订单归属人: ${localOrder.customer_qq}`)
        }

        // 发送通知到原会话
        try {
          const targetChannelId = localOrder.channel_id
          const targetGuildId = localOrder.guild_id
          let messageSent = false

          for (const bot of ctx.bots) {
            try {
              if (targetGuildId && targetChannelId) {
                // 群聊通知
                await bot.sendMessage(targetChannelId, h('message', { forward: true }, [
                  h('message', {}, successMessages.join('\n'))
                ]))
                if (config.devMode) {
                  logger.info(`已发送支付成功通知到群聊 ${targetGuildId}:${targetChannelId}`)
                }
              } else {
                // 私聊通知
                await bot.sendPrivateMessage(localOrder.user_id, h('message', { forward: true }, [
                  h('message', {}, successMessages.join('\n'))
                ]))
                if (config.devMode) {
                  logger.info(`已发送支付成功通知到用户 ${localOrder.user_id}`)
                }
              }
              messageSent = true
              break // 成功发送后退出循环
            } catch (botError: any) {
              logger.warn(`Bot ${bot.platform}:${bot.selfId} 发送消息失败: ${botError?.message}`)
            }
          }

          if (!messageSent) {
            throw new Error('所有Bot都发送失败')
          }
        } catch (error: any) {
          logger.error(`发送支付成功通知失败: ${error?.message || '未知错误'}`)
        }

        koaCtx.body = 'success'
      } else {
        logger.warn(`订单 ${callbackData.out_trade_no} 支付状态异常: ${callbackData.trade_status}`)
        koaCtx.body = 'success' // 即使状态异常也要返回success避免重复通知
      }

    } catch (error: any) {
      logger.error(`处理支付回调失败: ${error?.message || '未知错误'}`, error)
      koaCtx.status = 500
      koaCtx.body = 'fail'
    }
  })

  if (config.devMode) {
    logger.info(`支付回调路由已注册: GET ${routePrefix}`)
  }
}

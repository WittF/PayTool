import { Context, Session, h, Logger } from 'koishi'
import { Config } from './config'
import { EpayClient } from './api-client'
import { OrderDatabase } from './database'
import { PaymentType } from './types'
import { isAdmin, formatAmount, generateOrderNo, formatPaymentType, normalizeQQId, isValidTradeNo, isValidAmount, validateAndConvertPaymentType, getAvailablePaymentMethods } from './utils'

// 简单的轮询跟踪
const activePollings = new Map<string, { 
  timer?: NodeJS.Timeout, 
  session: Session
}>()

/**
 * 通用消息发送函数，处理私聊和群聊的不同格式
 */
async function sendMessage(session: Session, content: any[], options?: { quote?: boolean }): Promise<string[]> {
  try {
    const shouldQuote = options?.quote !== false
    
    // 检查是否为私聊
    const isPrivate = session.channelId?.startsWith('private:')
    
    // 构建消息元素
    const elements = []
    if (shouldQuote) {
      elements.push(h.quote(session.messageId))
    }
    if (!isPrivate) {
      elements.push(h.at(session.userId), '\n')
    }
    elements.push(...content)
    
    return await session.send(elements)
  } catch (error: any) {
    throw new Error(`发送消息失败: ${error?.message || '未知错误'}`)
  }
}

export function setupCommands(
  ctx: Context, 
  config: Config, 
  epayClient: EpayClient, 
  orderDb: OrderDatabase,
  logger: Logger
) {
  // 支付指令组
  const payCmd = ctx.command('pay', '支付工具')

  // 创建订单指令
  payCmd.subcommand('.create <amount:number> [payment:string]', '创建支付订单')
    .action(async ({ session }, amount, payment) => {
      if (!session || !session.userId) return

      // 验证管理员权限
      if (!isAdmin(session.userId, config.adminQQ)) {
        return '❌ 此指令仅限管理员使用'
      }

      try {
        // 验证参数格式
        if (!amount || !isValidAmount(amount.toString())) {
          await sendMessage(session, ['❌ 参数错误：金额必须是大于0的数字（最大99999）\n📖 正确格式：pay create <金额> [支付方式]'])
          return
        }

        // 验证并确定支付方式
        let paymentType: PaymentType
        
        if (payment) {
          // 验证用户提供的支付方式
          const validatedPayment = validateAndConvertPaymentType(payment, config.paymentMethods)
          if (!validatedPayment) {
            const availableMethods = getAvailablePaymentMethods(config.paymentMethods)
            await sendMessage(session, [`❌ 参数错误：不支持的支付方式 "${payment}"\n📖 正确格式：pay create <金额> [支付方式]\n💳 支持的支付方式：${availableMethods}`])
            return
          }
          paymentType = validatedPayment
        } else {
          // 使用默认支付方式，但也要验证默认支付方式是否有效
          const defaultPayment = validateAndConvertPaymentType(config.defaultPayment, config.paymentMethods)
          if (!defaultPayment) {
            const availableMethods = getAvailablePaymentMethods(config.paymentMethods)
            await sendMessage(session, [`❌ 配置错误：默认支付方式 "${config.defaultPayment}" 无效\n📖 支持的支付方式：${availableMethods}`])
            return
          }
          paymentType = defaultPayment
        }
        
        // 使用配置的回调通知地址
        const notifyUrl = config.notifyUrl

        // 生成商户订单号
        const outTradeNo = generateOrderNo(session.userId)
        
        if (config.devMode) {
          logger.info(`用户 ${session.userId} 创建订单，金额: ${amount}，支付方式: ${paymentType}，订单号: ${outTradeNo}`)
        }

        // 调用API创建订单
        const orderResult = await epayClient.createOrder(
          amount,
          paymentType,
          outTradeNo,
          notifyUrl
        )

        // 保存订单到数据库
        await orderDb.createOrder(
          orderResult.trade_no,  // 易支付订单号
          outTradeNo,            // 我们生成的商户订单号
          session.userId,
          session.guildId || '',
          session.channelId || '',
          formatAmount(amount),
          paymentType
        )

        // 构建支付信息合并消息
        const paymentTypeText = formatPaymentType(paymentType, config.paymentMethods)

        const messages = [
          `✅ 订单创建成功！`,
          `📋 订单号: ${outTradeNo}`,
          `💰 订单金额: ¥${formatAmount(amount)}`,
          `💳 支付方式: ${paymentTypeText}`,
          `⏰ 请在30分钟内完成支付`
        ]

        // 发送订单创建成功消息
        if (orderResult.img) {
          await session.send(h('message', { forward: true }, [
            h('message', {}, messages.join('\n')),
            h('message', {}, ['💳 支付二维码:', h.image(orderResult.img)])
          ]))
        } else {
          await session.send(h('message', { forward: true }, [
            h('message', {}, messages.join('\n'))
          ]))
        }

        // 启动主动查询模式（如果启用）
        if (config.activeQueryEnabled) {
          startActivePolling(ctx, config, epayClient, orderDb, logger, outTradeNo, session)
        }

      } catch (error: any) {
        logger.error(`创建订单失败: ${error?.message || '未知错误'}`, error)
        
        // 根据用户身份发送不同错误信息
        if (isAdmin(session.userId, config.adminQQ)) {
          // 管理员错误信息：根据devMode决定详细程度
          if (config.devMode) {
            // 开发模式：显示详细错误信息
            await session.send(h('message', { forward: true }, [
              h('message', {}, `❌ 订单创建失败`),
              h('message', {}, `错误详情: ${error?.message || '未知错误'}`)
            ]))
          } else {
            // 生产模式：只显示简洁错误
            await session.send(`❌ 订单创建失败: ${error?.message || '未知错误'}`)
          }
        } else {
          // 普通用户看简单错误
          await session.send('❌ 订单创建失败，请稍后重试')
          
          // 通知管理员详细错误
          try {
            for (const bot of ctx.bots) {
              await bot.sendPrivateMessage(config.adminQQ, h('message', { forward: true }, [
                h('message', {}, `❌ 用户 ${session.userId} 创建订单失败`),
                h('message', {}, `错误详情: ${error?.message || '未知错误'}`)
              ]))
            }
          } catch (e: any) {
            logger.error(`无法通知管理员: ${e?.message || '未知错误'}`)
          }
        }
        return
      }
    })

  // 查询订单指令
  payCmd.subcommand('.query <target:string>', '查询订单状态或用户订单')
    .action(async ({ session }, target) => {
      if (!session || !session.userId) return

      // 验证管理员权限
      if (!isAdmin(session.userId, config.adminQQ)) {
        await sendMessage(session, ['❌ 此指令仅限管理员使用'])
        return
      }

      try {
        // 验证参数格式
        if (!target || target.trim() === '') {
          await sendMessage(session, ['❌ 参数错误：请提供订单号或@用户\n📖 正确格式：pay query <订单号> 或 pay query @用户'])
          return
        }

        // 尝试解析@用户
        const normalizedQQ = normalizeQQId(target)
        
        if (normalizedQQ) {
          // 如果是有效的QQ号，查询该用户的所有订单
          if (config.devMode) {
            logger.info(`管理员 ${session.userId} 查询用户订单: ${normalizedQQ}`)
          }
          
          const userOrders = await orderDb.getOrdersByCustomerQQ(normalizedQQ)
          
          if (userOrders.length === 0) {
            await sendMessage(session, [`❌ 未找到用户 ${normalizedQQ} 的订单记录`])
            return
          }
          
          const orderList = userOrders.map(order => {
            const statusText = order.status === 'paid' ? '✅ 已支付' : 
                              order.status === 'refunded' ? '💰 已退款' : 
                              order.status === 'failed' ? '❌ 失败' : '⏳ 未支付'
            return `📋 ${order.out_trade_no} - ${statusText}`
          }).join('\n')
          
          await sendMessage(session, [`👤 用户 ${normalizedQQ} 的订单列表：\n${orderList}`])
          return
        } else {
          // 如果不是QQ号，当作订单号处理
          const tradeNo = target
          
          // 验证订单号格式
          if (!isValidTradeNo(tradeNo)) {
            await sendMessage(session, ['❌ 参数错误：订单号格式无效（应为10-25位数字）\n📖 正确格式：pay query <订单号> 或 pay query @用户'])
            return
          }
          
          if (config.devMode) {
            logger.info(`管理员 ${session.userId} 查询订单: ${tradeNo}`)
          }

          // 查询本地数据库
          const localOrder = await orderDb.getOrderByOutTradeNo(tradeNo) || 
                            await orderDb.getOrderByTradeNo(tradeNo)

          if (!localOrder) {
            await sendMessage(session, ['❌ 未找到该订单记录'])
            return
          }

          // 如果启用主动查询模式且该订单正在轮询中，立即触发一次查询
          if (config.activeQueryEnabled && activePollings.has(localOrder.out_trade_no)) {
            if (config.devMode) {
              logger.info(`强制触发订单查询: ${localOrder.out_trade_no}`)
            }
            
            try {
              // 直接查询API，不依赖轮询逻辑
              const orderStatus = await epayClient.queryOrder(localOrder.out_trade_no)
              
              // 更新本地订单状态
              const newStatus = (orderStatus.status == 1 || orderStatus.status === '1') ? 'paid' : 'pending'
              if (localOrder.status !== newStatus) {
                await orderDb.updateOrderStatus(localOrder.out_trade_no, newStatus)
              }
              
              // 如果支付成功，清理轮询
              if ((orderStatus.status == 1 || orderStatus.status === '1')) {
                activePollings.delete(localOrder.out_trade_no)
              }
              
              // 构建查询结果消息
              const statusText = (orderStatus.status == 1 || orderStatus.status === '1') ? '✅ 已支付' : '⏳ 未支付'
              const paymentTypeText = formatPaymentType(localOrder.payment_type, config.paymentMethods)

              let queryResult = `📋 订单查询结果：\n📋 订单号: ${orderStatus.out_trade_no}\n💰 订单金额: ¥${orderStatus.money}\n💳 支付方式: ${paymentTypeText}`
              
              // 如果订单有归属人，添加归属人信息
              if (localOrder.customer_qq) {
                queryResult += `\n👤 订单归属人: ${localOrder.customer_qq}`
              }
              
              queryResult += `\n📊 支付状态: ${statusText}\n📅 创建时间: ${orderStatus.addtime}`

              await sendMessage(session, [queryResult])
              return
            } catch (error: any) {
              logger.error(`强制查询订单失败: ${error?.message || '未知错误'}`, error)
              // 继续执行正常的查询逻辑
            }
          }

          // 调用API查询最新状态
          const orderStatus = await epayClient.queryOrder(localOrder.out_trade_no)

          // 更新本地订单状态
          const newStatus = (orderStatus.status == 1 || orderStatus.status === '1') ? 'paid' : 'pending'
          if (localOrder.status !== newStatus) {
            await orderDb.updateOrderStatus(localOrder.out_trade_no, newStatus)
          }

          // 构建查询结果消息
          const statusText = (orderStatus.status == 1 || orderStatus.status === '1') ? '✅ 已支付' : '⏳ 未支付'
          const paymentTypeText = formatPaymentType(localOrder.payment_type, config.paymentMethods)

          let queryResult = `📋 订单查询结果：\n📋 订单号: ${orderStatus.out_trade_no}\n💰 订单金额: ¥${orderStatus.money}\n💳 支付方式: ${paymentTypeText}`
          
          // 如果订单有归属人，添加归属人信息
          if (localOrder.customer_qq) {
            queryResult += `\n👤 订单归属人: ${localOrder.customer_qq}`
          }
          
          queryResult += `\n📊 支付状态: ${statusText}\n📅 创建时间: ${orderStatus.addtime}`
          
          if (orderStatus.endtime) {
            queryResult += `\n✅ 完成时间: ${orderStatus.endtime}`
          }

          // 直接回复给查询用户
          await sendMessage(session, [queryResult])
        }

      } catch (error: any) {
        logger.error(`查询订单失败: ${error?.message || '未知错误'}`, error)
        
        // 根据devMode决定错误信息详细程度
        if (config.devMode) {
          await sendMessage(session, [`❌ 查询订单失败: ${error?.message || '未知错误'}`])
        } else {
          await sendMessage(session, ['❌ 查询订单失败，请稍后重试'])
        }
      }
    })

  // 退款指令
  payCmd.subcommand('.refund <tradeNo:string>', '申请退款')
    .action(async ({ session }, tradeNo) => {
      if (!session || !session.userId) return

      // 验证管理员权限
      if (!isAdmin(session.userId, config.adminQQ)) {
        await sendMessage(session, ['❌ 此指令仅限管理员使用'])
        return
      }

      try {
        // 验证参数格式
        if (!tradeNo || !isValidTradeNo(tradeNo)) {
          await sendMessage(session, ['❌ 参数错误：订单号格式无效（应为10-25位数字）\n📖 正确格式：pay refund <订单号>'])
          return
        }

        if (config.devMode) {
          logger.info(`管理员 ${session.userId} 申请退款: ${tradeNo}`)
        }

        // 查询本地订单
        const localOrder = await orderDb.getOrderByOutTradeNo(tradeNo) || 
                          await orderDb.getOrderByTradeNo(tradeNo)

        if (!localOrder) {
          await sendMessage(session, ['❌ 未找到该订单记录'])
          return
        }

        if (localOrder.status !== 'paid') {
          await sendMessage(session, ['❌ 只有已支付的订单才能退款'])
          return
        }

        // 调用退款API
        await epayClient.refundOrder(tradeNo, localOrder.amount)

        // 更新本地订单状态
        await orderDb.updateOrderStatus(localOrder.out_trade_no, 'refunded')

        // 构建退款成功消息
        const messages = [
          `✅ 退款成功！`,
          `📋 订单号: ${tradeNo}`,
          `💰 退款金额: ¥${localOrder.amount}`
        ]

        // 发送到创建订单时的会话
        const targetChannelId = localOrder.channel_id
        const targetGuildId = localOrder.guild_id

        for (const bot of ctx.bots) {
          try {
            if (targetGuildId && targetChannelId) {
              // 群聊通知
              await bot.sendMessage(targetChannelId, h('message', { forward: true }, [
                h('message', {}, messages.join('\n'))
              ]))
            } else {
              // 私聊通知
              await bot.sendPrivateMessage(localOrder.user_id, h('message', { forward: true }, [
                h('message', {}, messages.join('\n'))
              ]))
            }
            break // 成功发送后退出循环
          } catch (botError: any) {
            logger.warn(`Bot ${bot.platform}:${bot.selfId} 退款通知发送失败: ${botError?.message}`)
          }
        }

      } catch (error: any) {
        logger.error(`申请退款失败: ${error?.message || '未知错误'}`, error)
        
        // 根据devMode决定错误信息详细程度
        if (config.devMode) {
          await sendMessage(session, [`❌ 申请退款失败: ${error?.message || '未知错误'}`])
        } else {
          await sendMessage(session, ['❌ 申请退款失败，请稍后重试'])
        }
      }
    })

  // 订单分配指令
  payCmd.subcommand('.provisioning <tradeNo:string> <targetUser:string>', '分配订单给指定用户')
    .action(async ({ session }, tradeNo, targetUser) => {
      if (!session || !session.userId) return

      // 验证管理员权限
      if (!isAdmin(session.userId, config.adminQQ)) {
        await sendMessage(session, ['❌ 此指令仅限管理员使用'])
        return
      }

      try {
        // 验证参数格式
        if (!tradeNo || !isValidTradeNo(tradeNo)) {
          await sendMessage(session, ['❌ 参数错误：订单号格式无效（应为10-25位数字）\n📖 正确格式：pay provisioning <订单号> @用户'])
          return
        }

        if (!targetUser || targetUser.trim() === '') {
          await sendMessage(session, ['❌ 参数错误：请提供目标用户QQ号或@用户\n📖 正确格式：pay provisioning <订单号> @用户'])
          return
        }

        // 解析目标用户QQ号
        const customerQQ = normalizeQQId(targetUser)
        if (!customerQQ) {
          await sendMessage(session, ['❌ 参数错误：无效的用户QQ号格式（应为5-12位数字或@用户）\n📖 正确格式：pay provisioning <订单号> @用户'])
          return
        }

        if (config.devMode) {
          logger.info(`管理员 ${session.userId} 分配订单 ${tradeNo} 给用户 ${customerQQ}`)
        }

        // 查询订单是否存在
        const localOrder = await orderDb.getOrderByOutTradeNo(tradeNo) || 
                          await orderDb.getOrderByTradeNo(tradeNo)

        if (!localOrder) {
          await sendMessage(session, ['❌ 未找到该订单记录'])
          return
        }

        // 更新订单归属人
        await orderDb.updateCustomerQQ(localOrder.out_trade_no, customerQQ)

        const messages = [
          `✅ 订单分配成功！`,
          `📋 订单号: ${localOrder.out_trade_no}`,
          `💰 订单金额: ¥${localOrder.amount}`,
          `👤 归属用户: ${customerQQ}`
        ]

        await session.send(h('message', { forward: true }, [
          h('message', {}, messages.join('\n'))
        ]))

      } catch (error: any) {
        logger.error(`订单分配失败: ${error?.message || '未知错误'}`, error)
        
        // 根据devMode决定错误信息详细程度
        if (config.devMode) {
          await sendMessage(session, [`❌ 订单分配失败: ${error?.message || '未知错误'}`])
        } else {
          await sendMessage(session, ['❌ 订单分配失败，请稍后重试'])
        }
      }
    })

  return payCmd
}

/**
 * 清理所有活跃轮询
 */
export function cleanupAllPollings() {
  for (const [outTradeNo, polling] of activePollings) {
    if (polling.timer) {
      clearTimeout(polling.timer)
    }
  }
  activePollings.clear()
}

/**
 * 启动主动查询轮询
 */
async function startActivePolling(
  ctx: Context,
  config: Config,
  epayClient: EpayClient,
  orderDb: OrderDatabase,
  logger: Logger,
  outTradeNo: string,
  session: Session
) {
  // 先检查订单是否已超过过期时间
  const localOrder = await orderDb.getOrderByOutTradeNo(outTradeNo)
  if (localOrder) {
    const now = new Date()
    const createdAt = new Date(localOrder.created_at)
    const timeDiff = now.getTime() - createdAt.getTime()
    const expirationTime = (config.orderExpirationTime || 30) * 60 * 1000 // 转换为毫秒
    
    if (timeDiff > expirationTime) {
      if (config.devMode) {
        logger.info(`订单 ${outTradeNo} 已超过${config.orderExpirationTime || 30}分钟时效，不启动主动查询`)
      }
      return // 不启动轮询
    }
  }

  const initialWaitTime = config.initialWaitTime || 30000
  const pollingInterval = config.pollingInterval || 30000
  const maxPollingCount = 60
  let pollingCount = 0
  
  if (config.devMode) {
    logger.info(`启动主动查询模式，订单号: ${outTradeNo}，等待时长: ${initialWaitTime}ms，轮询间隔: ${pollingInterval}ms`)
  }

  // 查询函数
  const doQuery = async () => {
    try {
      pollingCount++
      
      if (config.devMode) {
        logger.info(`主动查询订单状态，订单号: ${outTradeNo}，第${pollingCount}次查询`)
      }

      // 检查订单是否已超过过期时间
      const localOrder = await orderDb.getOrderByOutTradeNo(outTradeNo)
      if (localOrder) {
        const now = new Date()
        const createdAt = new Date(localOrder.created_at)
        const timeDiff = now.getTime() - createdAt.getTime()
        const expirationTime = (config.orderExpirationTime || 30) * 60 * 1000 // 转换为毫秒
        
        if (timeDiff > expirationTime) {
          if (config.devMode) {
            logger.info(`订单 ${outTradeNo} 已超过${config.orderExpirationTime || 30}分钟时效，停止主动查询`)
          }
          activePollings.delete(outTradeNo)
          return // 停止轮询
        }
      }

      const orderStatus = await epayClient.queryOrder(outTradeNo)
      
      if ((orderStatus.status == 1 || orderStatus.status === '1')) {
        // 支付成功，清理轮询
        activePollings.delete(outTradeNo)
        await orderDb.updateOrderStatus(outTradeNo, 'paid')
        
        // 发送通知 - 使用创建订单时的支付方式，而不是API返回的
        const paymentTypeText = formatPaymentType(localOrder?.payment_type || orderStatus.type, config.paymentMethods)

        const successMessages = [
          `🎉 支付成功！`,
          `📋 订单号: ${outTradeNo}`,
          `💰 支付金额: ¥${orderStatus.money}`,
          `💳 支付方式: ${paymentTypeText}`,
          `⏰ 支付时间: ${new Date().toLocaleString('zh-CN')}`
        ]

        // 如果订单有归属人，添加归属人信息
        if (localOrder?.customer_qq) {
          successMessages.splice(4, 0, `👤 订单归属人: ${localOrder.customer_qq}`)
        }

        // 发送通知到原会话
        try {
          await sendMessage(session, [h('message', { forward: true }, [
            h('message', {}, successMessages.join('\n'))
          ])], { quote: false })
          
          if (config.devMode) {
            logger.info(`已发送支付成功通知到用户 ${session.userId}`)
          }
        } catch (error: any) {
          logger.error(`发送支付成功通知失败: ${error?.message || '未知错误'}`)
        }
        
        return // 支付成功，停止轮询
      }

      // 检查最大轮询次数
      if (pollingCount >= maxPollingCount) {
        if (config.devMode) {
          logger.info(`订单 ${outTradeNo} 达到最大轮询次数，停止查询`)
        }
        activePollings.delete(outTradeNo)
        return
      }

      // 继续轮询
      const polling = activePollings.get(outTradeNo)
      if (polling) {
        polling.timer = setTimeout(doQuery, pollingInterval)
      }

    } catch (error: any) {
      logger.error(`主动查询订单失败: ${error?.message || '未知错误'}`)
      
      // 查询失败也继续轮询
      if (pollingCount < maxPollingCount) {
        const polling = activePollings.get(outTradeNo)
        if (polling) {
          polling.timer = setTimeout(doQuery, pollingInterval)
        }
      } else {
        activePollings.delete(outTradeNo)
      }
    }
  }

  // 注册轮询
  activePollings.set(outTradeNo, {
    session,
    timer: setTimeout(doQuery, initialWaitTime)
  })
}

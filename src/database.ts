import { Context } from 'koishi'
import { OrderRecord, PaymentType } from './types'

declare module 'koishi' {
  interface Tables {
    pay_orders: OrderRecord
  }
}

/**
 * 初始化数据库表
 */
export function setupDatabase(ctx: Context) {
  ctx.model.extend('pay_orders', {
    id: 'unsigned',
    trade_no: 'string',
    out_trade_no: 'string', 
    user_id: 'string',
    guild_id: 'string',
    channel_id: 'string',
    amount: 'string',
    payment_type: 'string',
    status: 'string',
    customer_qq: 'string',  // 订单归属人QQ号（管理员分配）
    created_at: 'timestamp',
    updated_at: 'timestamp'
  }, {
    primary: 'id',
    autoInc: true
  })
}

/**
 * 订单数据库操作类
 */
export class OrderDatabase {
  constructor(private ctx: Context) {}

  /**
   * 创建订单记录
   */
  async createOrder(
    tradeNo: string,
    outTradeNo: string,
    userId: string,
    guildId: string,
    channelId: string,
    amount: string,
    paymentType: PaymentType
  ): Promise<void> {
    await this.ctx.database.create('pay_orders', {
      trade_no: tradeNo,
      out_trade_no: outTradeNo,
      user_id: userId,
      guild_id: guildId,
      channel_id: channelId,
      amount,
      payment_type: paymentType,
      status: 'pending',
      customer_qq: '',  // 初始化为空，可通过provisioning命令分配
      created_at: new Date(),
      updated_at: new Date()
    })
  }

  /**
   * 根据商户订单号查询订单
   */
  async getOrderByOutTradeNo(outTradeNo: string): Promise<OrderRecord | null> {
    const orders = await this.ctx.database.get('pay_orders', { out_trade_no: outTradeNo })
    return orders.length > 0 ? orders[0] : null
  }

  /**
   * 根据易支付订单号查询订单
   */
  async getOrderByTradeNo(tradeNo: string): Promise<OrderRecord | null> {
    const orders = await this.ctx.database.get('pay_orders', { trade_no: tradeNo })
    return orders.length > 0 ? orders[0] : null
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(outTradeNo: string, status: 'pending' | 'paid' | 'failed' | 'refunded'): Promise<void> {
    await this.ctx.database.set('pay_orders', { out_trade_no: outTradeNo }, {
      status,
      updated_at: new Date()
    })
  }

  /**
   * 获取用户的订单列表
   */
  async getUserOrders(userId: string, limit: number = 10): Promise<OrderRecord[]> {
    return await this.ctx.database
      .select('pay_orders')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute()
  }

  /**
   * 更新订单归属人
   */
  async updateCustomerQQ(outTradeNo: string, customerQQ: string): Promise<void> {
    await this.ctx.database.set('pay_orders', { out_trade_no: outTradeNo }, {
      customer_qq: customerQQ,
      updated_at: new Date()
    })
  }

  /**
   * 根据归属人QQ查询订单
   */
  async getOrdersByCustomerQQ(customerQQ: string): Promise<OrderRecord[]> {
    return await this.ctx.database
      .select('pay_orders')
      .where({ customer_qq: customerQQ })
      .orderBy('created_at', 'desc')
      .execute()
  }
}

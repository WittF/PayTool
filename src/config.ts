import { Schema } from 'koishi'

export interface Config {
  // 插件配置
  adminQQ: string
  callbackRoute: string
  devMode: boolean
  
  // 主动查询模式
  activeQueryEnabled: boolean
  initialWaitTime?: number
  pollingInterval?: number
  orderExpirationTime?: number
  
  // 商户配置
  apiUrl: string
  merchantPid: string
  merchantKey: string
  productName: string
  paymentMethods: Record<string, string>
  defaultPayment: string
  notifyUrl: string
  

}

export const schema: Schema<Config> = Schema.intersect([
  Schema.intersect([
    Schema.object({
      adminQQ: Schema.string()
        .description('管理员QQ号')
        .pattern(/^\d{5,12}$/)
        .required(),
      callbackRoute: Schema.string()
        .description('回调路由')
        .pattern(/^\/.*\/$/)
        .default('/paytool/callback/'),
      devMode: Schema.boolean()
        .description('调试模式（启用详细日志输出）')
        .default(false),
      activeQueryEnabled: Schema.boolean()
        .description('主动查询模式（用于无法接收回调通知的环境）')
        .default(false),
    }),
    Schema.union([
      Schema.object({
        activeQueryEnabled: Schema.const(true).required(),
        initialWaitTime: Schema.number()
          .description('等待时长（毫秒）- 首次查询新订单需要等待的时间')
          .min(5000)
          .max(300000)
          .default(30000),
        pollingInterval: Schema.number()
          .description('轮询间隔（毫秒）- 每次查询订单后的等待时间')
          .min(5000)
          .max(300000)
          .default(30000),
        orderExpirationTime: Schema.number()
          .description('订单过期时间（分钟）- 超过此时间将停止主动查询')
          .min(5)
          .max(180)
          .default(30),
      }),
      Schema.object({}),
    ])
  ]),
  
  Schema.object({
    apiUrl: Schema.string()
      .description('易支付接口地址')
      .role('link')
      .required(),
    merchantPid: Schema.string()
      .description('商户PID')
      .pattern(/^[a-zA-Z0-9]+$/)
      .required(),
    merchantKey: Schema.string()
      .description('商户密钥')
      .role('secret')
      .required(),
    productName: Schema.string()
      .description('商品名称（显示在订单中）')
      .default('金币'),
    paymentMethods: Schema
      .dict(String)
      .description('支付方式配置（键为支付方式代码，值为显示名称）')
      .default({ 
        alipay: '支付宝', 
        wxpay: '微信支付' 
      }),
    defaultPayment: Schema
      .string()
      .description('默认支付方式（请确保该代码存在于上面的支付方式配置中）')
      .default('wxpay'),
    notifyUrl: Schema.string()
      .description('回调通知地址（配置到易支付后台）')
      .role('link')
      .default('https://koishi.local/paytool/callback/'),
  }).description('商户配置'),
])

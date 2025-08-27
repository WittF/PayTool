// 支付方式类型
export type PaymentType = 'alipay' | 'wxpay' | string

// 易支付API响应基础接口
export interface EpayBaseResponse {
  code: number | string
  msg: string
}

// 创建订单响应
export interface CreateOrderResponse extends EpayBaseResponse {
  trade_no: string
  O_id: string
  payurl?: string
  qrcode?: string
  img?: string
}

// 查询订单响应
export interface QueryOrderResponse extends EpayBaseResponse {
  trade_no: string
  out_trade_no: string
  type: string
  pid: string
  addtime: string
  endtime: string
  name: string
  money: string
  status: number | string
  param: string
  buyer: string
}

// 退款响应
export interface RefundResponse extends EpayBaseResponse {
  // 退款接口只返回基础响应
}

// 创建订单请求参数
export interface CreateOrderRequest {
  pid: string
  cid?: string
  type: PaymentType
  out_trade_no: string
  notify_url: string
  name: string
  money: string
  clientip: string
  device?: string
  param?: string
  sign: string
  sign_type: string
}

// 订单数据库记录
export interface OrderRecord {
  id: number
  trade_no: string
  out_trade_no: string
  user_id: string
  guild_id: string
  channel_id: string
  amount: string
  payment_type: PaymentType
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  customer_qq: string  // 订单归属人QQ号（管理员分配）
  created_at: Date
  updated_at: Date
}

// 支付回调参数
export interface PaymentCallback {
  pid: string
  name: string
  money: string
  out_trade_no: string
  trade_no: string
  param?: string
  trade_status: string
  type: PaymentType
  sign: string
  sign_type: string
}

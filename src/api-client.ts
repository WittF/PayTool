import axios, { AxiosInstance } from 'axios'
import { Logger } from 'koishi'
import { Config } from './config'
import { 
  CreateOrderRequest, 
  CreateOrderResponse, 
  QueryOrderResponse, 
  RefundResponse,
  PaymentType 
} from './types'
import { generateSign, formatAmount, getClientIp, generateOrderNo } from './utils'

export class EpayClient {
  private axios: AxiosInstance
  private config: Config
  private logger: Logger

  constructor(config: Config, logger: Logger) {
    this.config = config
    this.logger = logger
    this.axios = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    // 添加响应拦截器,处理API返回字符串的情况
    this.axios.interceptors.response.use(response => {
      // 如果响应数据是字符串,尝试解析为JSON
      if (typeof response.data === 'string') {
        try {
          response.data = JSON.parse(response.data)
        } catch (e) {
          // 如果解析失败,保持原样
          this.logger.warn('无法解析API响应为JSON:', response.data)
        }
      }
      return response
    })
  }

  /**
   * 创建订单
   * @param amount 金额
   * @param paymentType 支付方式
   * @param outTradeNo 商户订单号
   * @param notifyUrl 回调地址
   * @param returnUrl 跳转地址（可选）
   * @returns 订单创建结果
   */
  async createOrder(
    amount: number | string, 
    paymentType: PaymentType, 
    outTradeNo: string,
    notifyUrl: string,
    returnUrl?: string
  ): Promise<CreateOrderResponse> {
    
    const params: CreateOrderRequest = {
      pid: this.config.merchantPid,
      type: paymentType,
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      name: this.config.productName,
      money: formatAmount(amount),
      clientip: getClientIp(),
      device: 'pc',
      sign: '',
      sign_type: 'MD5'
    }

    // 添加跳转地址（如果配置了）
    if (returnUrl && returnUrl.trim()) {
      params.return_url = returnUrl
    }

    // 生成签名
    params.sign = generateSign(params, this.config.merchantKey)

    try {
      const response = await this.axios.post(`${this.config.apiUrl}/mapi.php`, params)
      
      // 在调试模式下输出完整的API响应
      if (this.config.devMode) {
        this.logger.info(`API创建订单响应 [${outTradeNo}]:`)
        this.logger.info(`请求URL: ${this.config.apiUrl}/mapi.php`)
        this.logger.info(`请求参数: ${JSON.stringify(params, null, 2)}`)
        this.logger.info(`响应状态: ${response.status}`)
        this.logger.info(`响应数据: ${JSON.stringify(response.data, null, 2)}`)
      }
      
      if (response.data.code == 1 || response.data.code === '1') {
        return response.data as CreateOrderResponse
      } else {
        if (this.config.devMode) {
          this.logger.error(`API返回错误码: ${response.data.code}, 消息: ${response.data.msg}`)
        }
        throw new Error(response.data.msg || '创建订单失败')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (this.config.devMode) {
          this.logger.error(`网络请求失败: ${error.message}, 状态码: ${error.response?.status}`)
        }
        throw new Error(`网络请求失败: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * 查询订单状态
   * @param outTradeNo 商户订单号
   * @returns 订单查询结果
   */
  async queryOrder(outTradeNo: string): Promise<QueryOrderResponse> {
    const url = `${this.config.apiUrl}/api.php?act=order&pid=${this.config.merchantPid}&key=${this.config.merchantKey}&out_trade_no=${outTradeNo}`
    
    try {
      const response = await this.axios.get(url)
      
      // 在调试模式下输出完整的API响应
      if (this.config.devMode) {
        this.logger.info(`API查询订单响应 [${outTradeNo}]:`)
        this.logger.info(`请求URL: ${url}`)
        this.logger.info(`响应状态: ${response.status}`)
        this.logger.info(`响应数据: ${JSON.stringify(response.data, null, 2)}`)
      }
      
      // 修复：检查code类型，可能是字符串"1"而不是数字1
      if (response.data.code == 1 || response.data.code === '1') {
        // 验证是否真的返回了有效订单数据
        if (!response.data.trade_no || !response.data.out_trade_no) {
          if (this.config.devMode) {
            this.logger.error(`订单数据不完整: trade_no=${response.data.trade_no}, out_trade_no=${response.data.out_trade_no}`)
          }
          throw new Error('订单不存在或查询失败')
        }
        return response.data as QueryOrderResponse
      } else {
        // 修复：提供更详细的错误信息
        if (this.config.devMode) {
          this.logger.error(`API返回错误码: ${response.data.code}, 消息: ${response.data.msg}`)
        }
        throw new Error(`查询失败 [code: ${response.data.code}]: ${response.data.msg || '未知错误'}`)
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (this.config.devMode) {
          this.logger.error(`网络请求失败: ${error.message}, 状态码: ${error.response?.status}`)
        }
        throw new Error(`网络请求失败: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * 申请退款
   * @param outTradeNo 商户订单号
   * @param amount 退款金额
   * @returns 退款结果
   */
  async refundOrder(outTradeNo: string, amount: string): Promise<RefundResponse> {
    const params = {
      pid: this.config.merchantPid,
      key: this.config.merchantKey,
      out_trade_no: outTradeNo,
      money: formatAmount(amount)
    }

    try {
      const response = await this.axios.post(`${this.config.apiUrl}/api.php?act=refund`, params)
      
      // 在调试模式下输出完整的API响应
      if (this.config.devMode) {
        this.logger.info(`API退款订单响应 [${outTradeNo}]:`)
        this.logger.info(`请求URL: ${this.config.apiUrl}/api.php?act=refund`)
        this.logger.info(`请求参数: ${JSON.stringify(params, null, 2)}`)
        this.logger.info(`响应状态: ${response.status}`)
        this.logger.info(`响应数据: ${JSON.stringify(response.data, null, 2)}`)
      }
      
      if (response.data.code == 1 || response.data.code === '1') {
        return response.data as RefundResponse
      } else {
        if (this.config.devMode) {
          this.logger.error(`API返回错误码: ${response.data.code}, 消息: ${response.data.msg}`)
        }
        throw new Error(response.data.msg || '退款失败')
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (this.config.devMode) {
          this.logger.error(`网络请求失败: ${error.message}, 状态码: ${error.response?.status}`)
        }
        throw new Error(`网络请求失败: ${error.message}`)
      }
      throw error
    }
  }
}

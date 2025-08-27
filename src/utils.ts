import * as crypto from 'crypto'

/**
 * 生成MD5签名
 * @param params 参数对象
 * @param key 商户密钥
 * @returns MD5签名
 */
export function generateSign(params: Record<string, any>, key: string): string {
  // 1. 过滤空值和sign字段
  const filteredParams = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '' && k !== 'sign' && k !== 'sign_type')
    .sort() // 2. 按ASCII码排序
    .reduce((obj, k) => {
      obj[k] = params[k]
      return obj
    }, {} as Record<string, any>)

  // 3. 拼接成URL键值对格式
  const queryString = Object.keys(filteredParams)
    .map(k => `${k}=${filteredParams[k]}`)
    .join('&')

  // 4. 添加商户密钥并计算MD5
  const signString = queryString + key
  return crypto.createHash('md5').update(signString).digest('hex').toLowerCase()
}

/**
 * 验证签名
 * @param params 参数对象
 * @param key 商户密钥
 * @returns 是否验证成功
 */
export function verifySign(params: Record<string, any>, key: string): boolean {
  const receivedSign = params.sign
  if (!receivedSign) return false
  
  const calculatedSign = generateSign(params, key)
  return receivedSign.toLowerCase() === calculatedSign.toLowerCase()
}

/**
 * 生成订单号
 * @param userId 用户ID
 * @returns 订单号
 */
export function generateOrderNo(userId: string): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${timestamp}${userId.slice(-4)}${random}`
}

/**
 * 获取客户端IP地址
 * @returns IP地址
 */
export function getClientIp(): string {
  // 由于插件环境无法获取真实客户端IP，使用固定IP
  return '192.168.1.100'
}

/**
 * 格式化金额为保留两位小数的字符串
 * @param amount 金额
 * @returns 格式化后的金额字符串
 */
export function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toFixed(2)
}

/**
 * 验证管理员权限
 * @param userId 用户ID
 * @param adminQQ 管理员QQ号
 * @returns 是否为管理员
 */
export function isAdmin(userId: string, adminQQ: string): boolean {
  return userId === adminQQ
}

/**
 * 格式化支付方式显示名称
 * @param paymentType 支付方式代码
 * @param paymentMethods 支付方式配置字典
 * @returns 支付方式显示名称
 */
export function formatPaymentType(paymentType: string, paymentMethods: Record<string, string>): string {
  return paymentMethods[paymentType] || paymentType
}

/**
 * 规范化QQ号，处理@用户和平台前缀
 * @param userId 用户ID，可能包含平台前缀或@标记
 * @returns 纯数字QQ号，无效时返回空字符串
 */
export function normalizeQQId(userId: string): string {
  if (!userId) return ''
  
  let extractedId = ''
  
  // 处理 <at id="..."/> 格式的@用户字符串（Koishi标准@标签）
  const atMatch = userId.match(/<at\s+id="(\d+)"\s*\/?>/)
  if (atMatch) {
    extractedId = atMatch[1]
  } 
  // 处理直接@+QQ号格式（如 @123456）
  else if (userId.startsWith('@')) {
    extractedId = userId.substring(1)  // 去掉@符号
  } 
  // 处理平台前缀格式（如 onebot:123456）
  else if (userId.includes(':')) {
    const colonIndex = userId.indexOf(':')
    extractedId = userId.substring(colonIndex + 1)
  } 
  // 处理纯QQ号
  else {
    extractedId = userId
  }
  
  // 验证提取的ID是否为纯数字QQ号
  if (!/^\d+$/.test(extractedId)) {
    return ''  // 返回空字符串表示无效
  }
  
  // 检查QQ号长度是否合理(QQ号通常为5-12位数字)
  if (extractedId.length < 5 || extractedId.length > 12) {
    return ''
  }
  
  return extractedId
}

/**
 * 验证订单号格式
 * @param tradeNo 订单号
 * @returns 是否为有效的订单号格式
 */
export function isValidTradeNo(tradeNo: string): boolean {
  if (!tradeNo) return false
  
  // 订单号格式：时间戳(13位) + 用户ID后4位 + 随机数4位 = 21位数字
  // 或者易支付内部订单号（数字格式，长度可变）
  if (!/^\d+$/.test(tradeNo)) {
    return false
  }
  
  // 支持的订单号长度：10-25位数字（覆盖各种可能的格式）
  return tradeNo.length >= 10 && tradeNo.length <= 25
}

/**
 * 验证金额格式
 * @param amount 金额字符串
 * @returns 是否为有效金额
 */
export function isValidAmount(amount: string): boolean {
  if (!amount) return false
  
  const num = parseFloat(amount)
  return !isNaN(num) && num > 0 && num <= 99999
}

/**
 * 验证并转换支付方式
 * @param payment 用户输入的支付方式（可能是代码或显示名称）
 * @param paymentMethods 支付方式配置字典
 * @returns 转换后的支付方式代码，无效时返回null
 */
export function validateAndConvertPaymentType(payment: string, paymentMethods: Record<string, string>): string | null {
  if (!payment) return null
  
  // 1. 检查是否是有效的支付方式代码（键）
  if (paymentMethods[payment]) {
    return payment
  }
  
  // 2. 检查是否是显示名称（值），反向查找对应的代码
  for (const [code, displayName] of Object.entries(paymentMethods)) {
    if (displayName === payment) {
      return code
    }
  }
  
  // 3. 无效的支付方式
  return null
}

/**
 * 获取支持的支付方式列表字符串
 * @param paymentMethods 支付方式配置字典
 * @returns 格式化的支付方式列表
 */
export function getAvailablePaymentMethods(paymentMethods: Record<string, string>): string {
  return Object.entries(paymentMethods)
    .map(([code, name]) => `${name}(${code})`)
    .join('、')
}

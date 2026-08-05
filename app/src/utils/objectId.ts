/**
 * MongoDB ObjectId 验证工具
 *
 * server 端使用 isValidObjectId 检查 ID 格式，前端应提前拦截无效 ID，
 * 避免发送无意义请求后收到 "Invalid workflow id" 等裸英文错误。
 */

/** ObjectId 格式：24 位十六进制字符串 */
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

/**
 * 判断字符串是否为合法的 MongoDB ObjectId 格式。
 * 与 server 端 isValidObjectId 行为一致。
 */
export function isValidObjectId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false
  return OBJECT_ID_RE.test(id)
}

/**
 * 验证 ID 并返回标准化结果。
 * 无效时返回用户友好的中文错误信息。
 */
export function validateObjectId(
  id: string | null | undefined,
  label = 'ID',
): { valid: true; id: string } | { valid: false; error: string } {
  if (!id || id === 'undefined' || id === 'null') {
    return { valid: false, error: `${label} 不能为空` }
  }
  if (!isValidObjectId(id)) {
    return { valid: false, error: `${label} 格式无效` }
  }
  return { valid: true, id }
}

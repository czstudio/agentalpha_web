/**
 * 密码加密和验证工具
 * 使用 bcrypt 进行安全的密码哈希
 */

import bcrypt from 'bcryptjs'

/**
 * 对密码进行加密
 * @param password 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * 验证密码是否正确
 * @param password 明文密码
 * @param hashedPassword 加密后的密码哈希
 * @returns 是否匹配
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * JWT Token 签发和验证工具
 * 使用 jose 库以支持 Edge Runtime
 */

import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)
const JWT_EXPIRES_IN = '7d' // Token 有效期 7 天

export type TokenPayload = JWTPayload & {
  userId: string
  username: string
}

/**
 * 签发 JWT Token
 * @param payload Token 载荷
 * @returns JWT Token 字符串
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET)

  return token
}

/**
 * 验证 JWT Token
 * @param token JWT Token 字符串
 * @returns Token 载荷或 null（验证失败）
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (typeof payload.userId !== 'string' || typeof payload.username !== 'string') {
      return null
    }

    return payload as TokenPayload
  } catch (error) {
    console.error('JWT 验证失败:', error)
    return null
  }
}

/**
 * 解码 JWT Token（不验证签名）
 * 注意：此函数不验证 token 的有效性，仅用于读取载荷
 * @param token JWT Token 字符串
 * @returns Token 载荷或 null
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    const payload = JSON.parse(atob(parts[1]))
    return payload as TokenPayload
  } catch (error) {
    console.error('JWT 解码失败:', error)
    return null
  }
}

import jwt from 'jsonwebtoken'

export interface TokenPayload {
  email: string
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')

  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(token, secret) as jwt.JwtPayload
  } catch {
    throw new Error('Invalid or expired authorization token')
  }

  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Token is missing required email claim')
  }

  return { email: payload.email }
}

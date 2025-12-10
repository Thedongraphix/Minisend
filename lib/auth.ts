import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'pretium-dashboard-session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.DASHBOARD_JWT_SECRET || 'your-secret-key-change-this-in-production'
);

// Hash password using PBKDF2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify password against hash
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Create session token
export async function createSession(username: string): Promise<string> {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(SECRET_KEY);

  return token;
}

// Verify session token
export async function verifySession(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(username: string) {
  const token = await createSession(username);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

// Get session from cookie
export async function getSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);

  if (!token) return null;

  return verifySession(token.value);
}

// Clear session cookie
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Verify admin credentials from environment
export function verifyAdminCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.DASHBOARD_ADMIN_USERNAME;
  const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('Dashboard credentials not configured in environment variables');
    return false;
  }

  return username === adminUsername && password === adminPassword;
}

// Middleware helper to check authentication
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(COOKIE_NAME);

  if (!token) {
    return NextResponse.redirect(new URL('/dashboard/pretium/login', request.url));
  }

  const session = await verifySession(token.value);

  if (!session) {
    return NextResponse.redirect(new URL('/dashboard/pretium/login', request.url));
  }

  return null; // Authentication successful
}

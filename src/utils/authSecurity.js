const DEMO_PASSWORD_SALT = 'opice-ir-demo-auth-v1';
export const DEMO_AUTH_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const payload = `${DEMO_PASSWORD_SALT}|${normalizedEmail}|${normalizedPassword}`;
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export async function withPasswordHash(user, rawPassword) {
  const nextUser = { ...user };
  const password = String(rawPassword || nextUser.password || '');
  if (!password) {
    delete nextUser.password;
    return nextUser;
  }
  nextUser.passwordHash = await hashPassword(nextUser.email, password);
  delete nextUser.password;
  return nextUser;
}

export async function normalizeStoredUsers(users = []) {
  const normalizedUsers = [];
  for (const user of users) {
    normalizedUsers.push(await withPasswordHash(user, user.password));
  }
  return normalizedUsers;
}

export function sanitizeAuthUser(user) {
  if (!user) return null;
  const { password: _password, passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function isValidInternalPath(link) {
  return typeof link === 'string' && /^\/[a-zA-Z0-9/_-]*$/.test(link);
}

export function toSafeHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

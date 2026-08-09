import { decodeJwt } from 'jose';
import { cookies } from 'next/headers';
import { unseal } from './auth';

interface Session {
  accessToken: string;
}

export async function sessionAccessToken(): Promise<string | undefined> {
  const encrypted = (await cookies()).get('company_os_session')?.value;
  if (encrypted === undefined) return undefined;
  try {
    return (await unseal<Session>(encrypted)).accessToken;
  } catch {
    return undefined;
  }
}

export async function sessionRoles(): Promise<readonly string[]> {
  const token = await sessionAccessToken();
  if (token === undefined) return [];
  const claims = decodeJwt(token);
  const realmAccess = claims['realm_access'];
  if (typeof realmAccess !== 'object' || realmAccess === null) return [];
  const roles = (realmAccess as { roles?: unknown }).roles;
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === 'string')
    : [];
}

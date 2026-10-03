import { compare, hash } from "bcryptjs";

const COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}

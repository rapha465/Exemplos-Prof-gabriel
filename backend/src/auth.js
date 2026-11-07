"use strict";

const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(scryptCallback);
const DUMMY_PASSWORD_HASH = `${Buffer.alloc(16).toString("base64url")}:${Buffer.alloc(64).toString("base64url")}`;

/**
 * Gera um hash scrypt com salt aleatório para armazenar senhas sem texto puro.
 * @param {string} password Senha a proteger.
 * @returns {Promise<string>} Hash no formato salt:hash, codificado em base64url.
 */
async function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new TypeError("A senha deve ser uma string não vazia.");
  }

  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString("base64url")}:${derivedKey.toString("base64url")}`;
}

/**
 * Compara uma senha com um hash scrypt usando comparação de tempo constante.
 * @param {string} password Senha informada.
 * @param {string} storedHash Hash produzido por {@link hashPassword}.
 * @returns {Promise<boolean>} Indica se a senha corresponde ao hash.
 */
async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const [saltText, hashText, extra] = storedHash.split(":");
  if (!saltText || !hashText || extra !== undefined) {
    return false;
  }

  try {
    const salt = Buffer.from(saltText, "base64url");
    const expectedHash = Buffer.from(hashText, "base64url");
    if (salt.length !== 16 || expectedHash.length !== 64) {
      return false;
    }

    const actualHash = await scrypt(password, salt, expectedHash.length);
    return timingSafeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}

/**
 * Cria operações de login e sessões em memória para os usuários fornecidos.
 * @param {{users: Array<{id: string|number, email: string, passwordHash: string}>, sessionTtlMs?: number, now?: () => number}} options Configuração do serviço.
 * @returns {{login: (email: string, password: string) => Promise<{token: string, expiresAt: string, user: {id: string|number, email: string}}|null>, authenticate: (token: string) => {id: string|number, email: string}|null, logout: (token: string) => boolean}}
 */
function createAuthService({ users, sessionTtlMs = 8 * 60 * 60 * 1000, now = Date.now }) {
  if (!Array.isArray(users) || users.length === 0) {
    throw new TypeError("O serviço de autenticação precisa de pelo menos um usuário.");
  }
  if (!Number.isFinite(sessionTtlMs) || sessionTtlMs <= 0) {
    throw new TypeError("A duração da sessão deve ser um número positivo.");
  }

  const normalizedUsers = users.map((user) => {
    if (!user || user.id === undefined || typeof user.email !== "string" || typeof user.passwordHash !== "string") {
      throw new TypeError("Cada usuário precisa de id, e-mail e hash de senha.");
    }
    return { ...user, email: user.email.trim().toLowerCase() };
  });
  const sessions = new Map();

  /**
   * Verifica as credenciais e inicia uma sessão opaca com prazo de validade.
   * @param {string} email E-mail da conta.
   * @param {string} password Senha da conta.
   * @returns {Promise<{token: string, expiresAt: string, user: {id: string|number, email: string}}|null>}
   */
  async function login(email, password) {
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = normalizedUsers.find((candidate) => candidate.email === normalizedEmail);
    const passwordMatches = await verifyPassword(
      typeof password === "string" ? password : "",
      user ? user.passwordHash : DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      return null;
    }

    const currentTime = now();
    for (const [token, session] of sessions) {
      if (session.expiresAt <= currentTime) {
        sessions.delete(token);
      }
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = currentTime + sessionTtlMs;
    const safeUser = { id: user.id, email: user.email };
    sessions.set(token, { user: safeUser, expiresAt });
    return { token, expiresAt: new Date(expiresAt).toISOString(), user: safeUser };
  }

  /**
   * Retorna a identidade associada à sessão se o token ainda for válido.
   * @param {string} token Token opaco de sessão.
   * @returns {{id: string|number, email: string}|null}
   */
  function authenticate(token) {
    const session = sessions.get(token);
    if (!session) {
      return null;
    }
    if (session.expiresAt <= now()) {
      sessions.delete(token);
      return null;
    }
    return session.user;
  }

  /**
   * Encerra a sessão associada ao token.
   * @param {string} token Token opaco de sessão.
   * @returns {boolean} Indica se uma sessão foi encerrada.
   */
  function logout(token) {
    return sessions.delete(token);
  }

  return { login, authenticate, logout };
}

module.exports = { createAuthService, hashPassword, verifyPassword };

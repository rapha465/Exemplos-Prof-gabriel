const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer } = require("../src/server");
const { createAuthService, hashPassword, verifyPassword } = require("../src/auth");

const TEST_EMAIL = "professora@example.com";
const TEST_PASSWORD = "senha-de-teste-segura";
let server;
let baseUrl;
let authService;

before(async () => {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  authService = createAuthService({
    users: [{ id: 7, email: TEST_EMAIL, passwordHash }],
    sessionTtlMs: 60_000,
  });
  server = createServer({ authService, allowedOrigin: "http://localhost:5500" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("hashPassword protege a senha e verifyPassword valida o hash", async () => {
  const hash = await hashPassword(TEST_PASSWORD);
  assert.notEqual(hash, TEST_PASSWORD);
  assert.equal(await verifyPassword(TEST_PASSWORD, hash), true);
  assert.equal(await verifyPassword("senha-incorreta", hash), false);
});

test("login aceita credenciais válidas sem diferenciar maiúsculas no e-mail", async () => {
  const session = await authService.login("  PROFESSORA@example.com ", TEST_PASSWORD);
  assert.equal(session.user.id, 7);
  assert.equal(session.user.email, TEST_EMAIL);
  assert.ok(session.token);
  assert.ok(session.expiresAt);
});

test("login rejeita e-mail desconhecido e senha incorreta", async () => {
  assert.equal(await authService.login("desconhecido@example.com", TEST_PASSWORD), null);
  assert.equal(await authService.login(TEST_EMAIL, "incorreta"), null);
});

test("POST /api/auth/login cria sessão e GET /api/auth/me valida o token", async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  assert.equal(loginResponse.status, 200);
  const session = await loginResponse.json();

  const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  assert.equal(meResponse.status, 200);
  assert.deepEqual((await meResponse.json()).user, { id: 7, email: TEST_EMAIL });
});

test("API rejeita credenciais inválidas e corpos JSON malformados", async () => {
  const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: "incorreta" }),
  });
  assert.equal(invalidLogin.status, 401);

  const malformedBody = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformedBody.status, 400);
});

test("POST /api/auth/logout revoga o token de sessão", async () => {
  const session = await authService.login(TEST_EMAIL, TEST_PASSWORD);
  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  assert.equal(logoutResponse.status, 200);
  assert.equal(authService.authenticate(session.token), null);
});
/**
 * @param {string} email E-mail da conta.
 */

// backend/tests/auth.test.js
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { hashPassword, verifyPassword } = require("../src/auth");

test("hashPassword protege a senha", async () => {
  const hash = await hashPassword("minhaSenha123");
  assert.notEqual(hash, "minhaSenha123");
});

test("verifyPassword valida a senha correta", async () => {
  const hash = await hashPassword("minhaSenha123");
  assert.equal(await verifyPassword("minhaSenha123", hash), true);
  assert.equal(await verifyPassword("outraSenha", hash), false);
});
"use strict";

const http = require("node:http");
const { createAuthService, hashPassword } = require("./auth");

const MAX_BODY_BYTES = 10 * 1024;

/**
 * Cria um erro HTTP com status adequado para respostas da API.
 * @param {number} statusCode Código de status HTTP.
 * @param {string} message Mensagem segura para o cliente.
 * @returns {Error & {statusCode: number}}
 */
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Lê e analisa o corpo JSON de uma requisição, com limite de tamanho.
 * @param {import("node:http").IncomingMessage} request Requisição recebida.
 * @returns {Promise<Record<string, unknown>>} Objeto JSON recebido.
 */
async function readJsonBody(request) {
  const chunks = [];
  let bytesRead = 0;
  for await (const chunk of request) {
    bytesRead += chunk.length;
    if (bytesRead > MAX_BODY_BYTES) {
      throw httpError(413, "Corpo da requisição muito grande.");
    }
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "Envie um corpo JSON válido.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "O corpo JSON deve ser um objeto.");
  }
  return body;
}

/**
 * Envia uma resposta JSON com cabeçalhos comuns da API.
 * @param {import("node:http").ServerResponse} response Resposta HTTP.
 * @param {number} statusCode Código de status HTTP.
 * @param {Record<string, unknown>} body Objeto a serializar.
 * @returns {void}
 */
function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

/**
 * Cria o servidor HTTP da API de autenticação.
 * @param {{authService: ReturnType<typeof createAuthService>, allowedOrigin?: string}} options Dependências do servidor.
 * @returns {import("node:http").Server} Servidor HTTP pronto para iniciar.
 */
function createServer({ authService, allowedOrigin = "http://localhost:5500" }) {
  if (!authService) {
    throw new TypeError("É necessário fornecer um serviço de autenticação.");
  }

  return http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin && origin === allowedOrigin) {
      response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url, "http://localhost");
    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        const body = await readJsonBody(request);
        if (
          typeof body.email !== "string" ||
          body.email.length > 254 ||
          typeof body.password !== "string" ||
          body.password.length > 1024
        ) {
          throw httpError(400, "Informe um e-mail e uma senha válidos.");
        }

        const session = await authService.login(body.email, body.password);
        if (!session) {
          sendJson(response, 401, { error: "E-mail ou senha incorretos." });
          return;
        }
        sendJson(response, 200, session);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/auth/me") {
        const token = getBearerToken(request);
        const user = token ? authService.authenticate(token) : null;
        if (!user) {
          sendJson(response, 401, { error: "Sessão inválida ou expirada." });
          return;
        }
        sendJson(response, 200, { user });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/auth/logout") {
        const token = getBearerToken(request);
        if (token) {
          authService.logout(token);
        }
        sendJson(response, 200, { message: "Sessão encerrada." });
        return;
      }

      sendJson(response, 404, { error: "Rota não encontrada." });
    } catch (error) {
      const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
      if (statusCode === 500) {
        console.error("Erro interno na API:", error);
      }
      if (!response.headersSent) {
        sendJson(response, statusCode, {
          error: statusCode === 500 ? "Erro interno do servidor." : error.message,
        });
      } else {
        response.end();
      }
    }
  });
}

/**
 * Lê um token Bearer do cabeçalho Authorization.
 * @param {import("node:http").IncomingMessage} request Requisição HTTP.
 * @returns {string|null} Token informado ou null.
 */
function getBearerToken(request) {
  const authorization = request.headers.authorization;
  const match = typeof authorization === "string" && authorization.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  return match ? match[1] : null;
}

/**
 * Inicia a API com a conta configurada por variáveis de ambiente.
 * @returns {Promise<import("node:http").Server>} Servidor iniciado.
 */
async function startServer() {
  const email = process.env.AUTH_EMAIL;
  const password = process.env.AUTH_PASSWORD;
  if (!email || !password) {
    throw new Error("Configure AUTH_EMAIL e AUTH_PASSWORD antes de iniciar o servidor.");
  }

  const passwordHash = await hashPassword(password);
  const authService = createAuthService({
    users: [{ id: "admin", email, passwordHash }],
  });
  const server = createServer({
    authService,
    allowedOrigin: process.env.CORS_ORIGIN || "http://localhost:5500",
  });
  const port = Number(process.env.PORT || 3000);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  console.log(`API de autenticação disponível em http://localhost:${port}`);
  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { createServer, readJsonBody, startServer };
const reservasIniciais = [
  {
    id: 1,
    salaId: 1,
    sala: "Sala de Aula 101",
    data: "2026-11-02",
    inicio: "08:00",
    fim: "10:00",
    responsavel: "Mariana Souza",
    finalidade: "Aula de Matemática",
    situacao: "aprovada",
  },
  {
    id: 2,
    salaId: 3,
    sala: "Sala de Aula 301",
    data: "2026-11-02",
    inicio: "10:00",
    fim: "12:00",
    responsavel: "Carlos Oliveira",
    finalidade: "Aula de programação",
    situacao: "aprovada",
  },
  {
    id: 3,
    salaId: 2,
    sala: "Sala de Aula 201",
    data: "2026-11-03",
    inicio: "13:30",
    fim: "15:00",
    responsavel: "Ana Paula Lima",
    finalidade: "Reunião de professores",
    situacao: "pendente",
  },
  {
    id: 4,
    salaId: 3,
    sala: "Sala de Aula 301",
    data: "2026-11-04",
    inicio: "09:00",
    fim: "11:30",
    responsavel: "Roberto Santos",
    finalidade: "Oficina de informática",
    situacao: "aprovada",
  },
  {
    id: 5,
    salaId: 1,
    sala: "Sala de Aula 101",
    data: "2026-11-05",
    inicio: "14:00",
    fim: "16:00",
    responsavel: "Juliana Costa",
    finalidade: "Atendimento aos responsáveis",
    situacao: "cancelada",
  },
];

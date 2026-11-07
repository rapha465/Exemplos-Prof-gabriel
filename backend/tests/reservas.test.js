const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  existeConflito,
  horariosConflitam,
  reservasIniciais,
} = require("../frontend/estrutura-de-dados/Reservas");
const { cabeNaSala, salas: salasExemplo } = require("../frontend/estrutura-de-dados/salas");

const salas = salasExemplo;

const reservaBase = {
  salaId: 1,
  sala: "Sala 101",
  data: "2026-11-10",
  inicio: "09:00",
  fim: "10:00",
  situacao: "aprovada",
};

test("Desafio 1 tem ao menos três salas, cinco reservas e as três situações", () => {
  assert.ok(salas.length >= 3);
  assert.ok(reservasIniciais.length >= 5);
  assert.deepEqual(
    new Set(reservasIniciais.map((reserva) => reserva.situacao)),
    new Set(["pendente", "aprovada", "cancelada"]),
  );
  assert.ok(reservasIniciais.every((reserva) => reserva.sala && reserva.data && reserva.inicio &&
    reserva.fim && reserva.responsavel && reserva.finalidade && reserva.situacao));
});

test("cabeNaSala retorna false quando a turma excede a capacidade", () => {
  assert.equal(cabeNaSala(31, 1, salas), false);
});

test("cabeNaSala retorna true quando a turma tem o mesmo tamanho da capacidade", () => {
  assert.equal(cabeNaSala(30, 1, salas), true);
});

test("cabeNaSala retorna true quando a turma é menor que a capacidade", () => {
  assert.equal(cabeNaSala(29, 1, salas), true);
});

test("cabeNaSala retorna false se a sala não existir", () => {
  assert.equal(cabeNaSala(10, 99, salas), false);
});

test("horariosConflitam identifica sobreposição e permite horários adjacentes", () => {
  assert.equal(horariosConflitam("09:00", "10:00", "09:30", "10:30"), true);
  assert.equal(horariosConflitam("09:00", "10:00", "10:00", "11:00"), false);
});

test("existeConflito retorna true para a mesma sala, data e horário sobreposto", () => {
  const novaReserva = { ...reservaBase, inicio: "09:30", fim: "10:30" };
  assert.equal(existeConflito(novaReserva, [reservaBase]), true);
});

test("existeConflito ignora reservas de outra sala ou outra data", () => {
  const novaReserva = { ...reservaBase, inicio: "09:30", fim: "10:30" };
  assert.equal(existeConflito(novaReserva, [{ ...reservaBase, salaId: 2 }]), false);
  assert.equal(existeConflito(novaReserva, [{ ...reservaBase, data: "2026-11-11" }]), false);
});

test("existeConflito ignora reservas canceladas", () => {
  const novaReserva = { ...reservaBase, inicio: "09:30", fim: "10:30" };
  assert.equal(existeConflito(novaReserva, [{ ...reservaBase, situacao: "cancelada" }]), false);
  assert.equal(existeConflito({ ...novaReserva, situacao: "cancelada" }, [reservaBase]), false);
});

test("existeConflito compara o nome da sala quando salaId não está disponível", () => {
  const novaReserva = { ...reservaBase, salaId: undefined, inicio: "09:30", fim: "10:30" };
  const reserva = { ...reservaBase, salaId: undefined };
  assert.equal(existeConflito(novaReserva, [reserva]), true);
});

"use strict";

const reservasIniciais = [
  {
    id: 1,
    salaId: 1,
    sala: "Sala de Aula 101",
    data: "2026-11-10",
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
    data: "2026-11-10",
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
    data: "2026-11-11",
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
    data: "2026-11-12",
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

/**
 * Verifica se dois intervalos de horário se sobrepõem.
 * Horários adjacentes, como 09:00-10:00 e 10:00-11:00, não conflitam.
 * @param {string} inicioA Início do primeiro intervalo no formato HH:mm.
 * @param {string} fimA Fim do primeiro intervalo no formato HH:mm.
 * @param {string} inicioB Início do segundo intervalo no formato HH:mm.
 * @param {string} fimB Fim do segundo intervalo no formato HH:mm.
 * @returns {boolean} Indica se os intervalos se sobrepõem.
 */
function horariosConflitam(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && inicioB < fimA;
}

/**
 * Verifica se existe reserva ativa sobreposta na mesma sala e data.
 * @param {object} novaReserva Reserva que será verificada.
 * @param {object[]} reservas Reservas existentes.
 * @returns {boolean} Indica se há conflito de horário.
 */
function existeConflito(novaReserva, reservas) {
  return reservas.some((reserva) => {
    if (reserva.situacao === "cancelada" || reserva.data !== novaReserva.data) {
      return false;
    }

    const mesmaSala =
      novaReserva.salaId !== undefined && reserva.salaId !== undefined
        ? reserva.salaId === novaReserva.salaId
        : reserva.sala === novaReserva.sala;

    return (
      mesmaSala &&
      horariosConflitam(novaReserva.inicio, novaReserva.fim, reserva.inicio, reserva.fim)
    );
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { existeConflito, horariosConflitam, reservasIniciais };
}

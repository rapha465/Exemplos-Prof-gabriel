"use strict";

const roomsList = document.querySelector("#rooms-list");
const roomSearch = document.querySelector("#room-search");
const roomsCount = document.querySelector("#rooms-count");
const emptyMessage = document.querySelector("#empty-message");
const reservationDialog = document.querySelector("#reservation-dialog");
const reservationForm = document.querySelector("#reservation-form");
const selectedRoom = document.querySelector("#selected-room");
const reservationRoomId = document.querySelector("#reservation-room-id");
const reservationDate = document.querySelector("#reservation-date");
const reservationStart = document.querySelector("#reservation-start");
const reservationEnd = document.querySelector("#reservation-end");
const reservationError = document.querySelector("#reservation-error");
const reservationStatus = document.querySelector("#reservation-status");
const reservationsStorageKey = "reserve-me-reservas";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

reservationDate.min = getLocalDateString();

function createRoomCard(sala) {
  const card = document.createElement("article");
  card.className = "room-card";

  const title = document.createElement("h2");
  title.textContent = sala.nome;

  const details = document.createElement("div");
  details.className = "room-details";

  const theme = document.createElement("span");
  theme.className = "room-detail";
  theme.textContent = `Tema: ${sala.tema}`;

  const floor = document.createElement("span");
  floor.className = "room-detail";
  floor.textContent = sala.andar;

  const capacity = document.createElement("span");
  capacity.className = "room-detail";
  capacity.textContent = `Capacidade: ${sala.capacidade} pessoas`;

  const resourcesTitle = document.createElement("p");
  resourcesTitle.className = "resources-title";
  resourcesTitle.textContent = "Recursos";

  const resourcesList = document.createElement("ul");
  resourcesList.className = "resources-list";

  sala.recursos.forEach((recurso) => {
    const item = document.createElement("li");
    item.textContent = recurso;
    resourcesList.append(item);
  });

  const reserveButton = document.createElement("button");
  reserveButton.className = "reserve-button";
  reserveButton.type = "button";
  reserveButton.textContent = "Reservar esta sala";
  reserveButton.setAttribute("aria-label", `Solicitar reserva: ${sala.nome}`);
  reserveButton.addEventListener("click", () => openReservationDialog(sala));

  details.append(theme, floor, capacity);
  card.append(title, details, resourcesTitle, resourcesList, reserveButton);
  return card;
}

function openReservationDialog(sala) {
  reservationForm.reset();
  reservationRoomId.value = String(sala.id);
  selectedRoom.textContent = sala.nome;
  reservationDate.min = getLocalDateString();
  reservationError.hidden = true;
  reservationError.textContent = "";
  reservationStatus.hidden = true;
  reservationDialog.showModal();
}

function readReservations() {
  const storedReservations = window.localStorage.getItem(reservationsStorageKey);
  if (storedReservations === null) {
    return [...reservasIniciais];
  }

  const parsedReservations = JSON.parse(storedReservations);
  if (!Array.isArray(parsedReservations)) {
    throw new Error("Os dados locais das reservas estão em formato inválido.");
  }

  return parsedReservations;
}

function showReservationError(message) {
  reservationError.textContent = message;
  reservationError.hidden = false;
}

reservationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  reservationError.hidden = true;
  reservationError.textContent = "";

  if (reservationStart.value >= reservationEnd.value) {
    showReservationError("O horário de fim deve ser posterior ao horário de início.");
    reservationEnd.focus();
    return;
  }

  const sala = salas.find((item) => item.id === Number(reservationRoomId.value));
  if (!sala) {
    showReservationError("Não foi possível identificar a sala. Feche e tente novamente.");
    return;
  }

  try {
    const reservas = readReservations();
    const novaReserva = {
      id: window.crypto?.randomUUID?.() ?? `reserva-${Date.now()}`,
      salaId: sala.id,
      sala: sala.nome,
      data: reservationDate.value,
      inicio: reservationStart.value,
      fim: reservationEnd.value,
      responsavel: reservationForm.elements.responsavel.value.trim(),
      finalidade: reservationForm.elements.finalidade.value.trim(),
      situacao: "pendente",
    };

    if (existeConflito(novaReserva, reservas)) {
      showReservationError("Esta sala já possui uma reserva ativa nesse horário. Escolha outro horário.");
      return;
    }

    reservas.push(novaReserva);
    window.localStorage.setItem(reservationsStorageKey, JSON.stringify(reservas));
    reservationDialog.close();
    reservationStatus.classList.remove("is-error");
    reservationStatus.textContent = `Solicitação enviada para ${sala.nome}. Situação: pendente.`;
    reservationStatus.hidden = false;
  } catch (error) {
    showReservationError(
      error instanceof SyntaxError
        ? "As reservas salvas neste navegador estão corrompidas. Não foi possível registrar a solicitação."
        : "Não foi possível salvar a solicitação neste navegador. Verifique as permissões de armazenamento e tente novamente.",
    );
    console.error("Falha ao salvar solicitação de reserva:", error);
  }
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => reservationDialog.close());
});

function renderSalas() {
  const termo = roomSearch.value.trim().toLocaleLowerCase("pt-BR");
  const filtradas = salas.filter((sala) => {
    const informacoes = [
      sala.nome,
      sala.tema,
      sala.andar,
      String(sala.capacidade),
      ...sala.recursos,
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return informacoes.includes(termo);
  });

  roomsList.replaceChildren(...filtradas.map(createRoomCard));
  roomsCount.textContent = `${filtradas.length} ${
    filtradas.length === 1 ? "sala encontrada" : "salas encontradas"
  }`;
  emptyMessage.hidden = filtradas.length > 0;
}

roomSearch.addEventListener("input", renderSalas);
renderSalas();

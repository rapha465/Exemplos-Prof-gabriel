const recoveryForm = document.querySelector(".login-form");
const emailInput = document.querySelector("#recovery-email");
const emailError = document.querySelector("#recovery-email-error");

function validateRecoveryEmail() {
  const isEmpty = emailInput.value.trim() === "";
  emailInput.setAttribute("aria-invalid", String(isEmpty));
  emailError.textContent = isEmpty ? "Obrigatório" : "";
  return !isEmpty;
}

emailInput.addEventListener("input", () => {
  if (emailInput.getAttribute("aria-invalid") === "true") {
    validateRecoveryEmail();
  }
});

recoveryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateRecoveryEmail()) {
    emailInput.focus();
  }
});

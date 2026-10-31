const form = document.querySelector(".login-form");

if (form) {
  const fields = Array.from(form.querySelectorAll("input")).map((input) => {
    const field = input.closest(".field");
    const error = field ? field.querySelector(".error-message") : null;
    return { input, error };
  });

  function validateField({ input, error }) {
    const isEmpty = input.value.trim() === "";
    const isEmail = input.type === "email";
    const invalidEmail = isEmail && !isEmpty && !input.checkValidity();

    input.setAttribute("aria-invalid", String(isEmpty || invalidEmail));

    if (error) {
      error.textContent = isEmpty
        ? "Obrigatório"
        : invalidEmail
          ? "Informe um e-mail válido."
          : "";
    }

    return !(isEmpty || invalidEmail);
  }

  fields.forEach(({ input, error }) => {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        validateField({ input, error });
      }
    });

    input.addEventListener("blur", () => {
      validateField({ input, error });
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const results = fields.map(validateField);
    const firstInvalidField = fields.find((_, index) => !results[index]);

    if (firstInvalidField) {
      firstInvalidField.input.focus();
      return;
    }

    const button = form.querySelector(".login-button");
    if (button) {
      button.textContent = "Enviando...";
      button.disabled = true;

      window.setTimeout(() => {
        button.textContent = form.id === "recovery-form" ? "Recuperar senha" : "Entrar";
        button.disabled = false;
      }, 1000);
    }
  });
}

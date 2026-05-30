const form = document.getElementById("ddoOneForm");
const successBanner = document.getElementById("successBanner");
const aboutTrigger = document.getElementById("aboutTrigger");
const aboutPanel = document.getElementById("aboutPanel");
const aboutClose = document.getElementById("aboutClose");
const panelBackdrop = document.getElementById("panelBackdrop");
const verifyEmailButton = document.getElementById("verifyEmailButton");
const verifyStatus = document.getElementById("verifyStatus");
const companyEmailInput = document.getElementById("companyEmail");
const verificationCodeInput = document.getElementById("verificationCode");

let companyEmailVerified = false;

const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  phone: (value) => /^[0-9]{7,15}$/.test(value.trim()),
  url: (value) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  },
};

function showPanel() {
  aboutPanel.classList.add("open");
  panelBackdrop.hidden = false;
  aboutPanel.setAttribute("aria-hidden", "false");
  aboutTrigger.setAttribute("aria-expanded", "true");
}

function hidePanel() {
  aboutPanel.classList.remove("open");
  panelBackdrop.hidden = true;
  aboutPanel.setAttribute("aria-hidden", "true");
  aboutTrigger.setAttribute("aria-expanded", "false");
}

function setError(input, message) {
  input.classList.add("invalid");
  const errorNode = input.closest(".field")?.querySelector(".error-text");
  if (errorNode) {
    errorNode.textContent = message;
  }
}

function clearError(input) {
  input.classList.remove("invalid");
  const errorNode = input.closest(".field")?.querySelector(".error-text");
  if (errorNode) {
    errorNode.textContent = "";
  }
}

function validateField(input) {
  const value = input.value.trim();
  const isRequired = input.dataset.required === "true";
  const validationType = input.dataset.validate;

  clearError(input);

  if (isRequired && !value) {
    setError(input, "This field is required.");
    return false;
  }

  if (!value) {
    return true;
  }

  if (validationType && validators[validationType] && !validators[validationType](value)) {
    const messages = {
      email: "Please enter a valid email address.",
      phone: "Please enter numbers only, between 7 and 15 digits.",
      url: "Please enter a valid website URL starting with http:// or https://.",
    };

    setError(input, messages[validationType]);
    return false;
  }

  return true;
}

function resetVerificationState() {
  companyEmailVerified = false;
  verifyStatus.textContent = "Not verified yet.";
  verifyStatus.classList.remove("verified");
}

aboutTrigger.addEventListener("click", showPanel);
aboutClose.addEventListener("click", hidePanel);
panelBackdrop.addEventListener("click", hidePanel);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hidePanel();
  }
});

companyEmailInput.addEventListener("input", resetVerificationState);

form.querySelectorAll("input[data-validate='phone']").forEach((input) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
  });
});

form.querySelectorAll("input, textarea").forEach((input) => {
  input.addEventListener("blur", () => validateField(input));
});

verifyEmailButton.addEventListener("click", () => {
  const emailValid = validateField(companyEmailInput);
  if (!emailValid) {
    verifyStatus.textContent = "Enter a valid company email before verification.";
    verifyStatus.classList.remove("verified");
    return;
  }

  if (!verificationCodeInput.value.trim()) {
    verifyStatus.textContent = "Enter any reference code to complete the email verification step.";
    verifyStatus.classList.remove("verified");
    return;
  }

  companyEmailVerified = true;
  verifyStatus.textContent = "Company email verified successfully.";
  verifyStatus.classList.add("verified");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  successBanner.classList.remove("show");

  const fieldsToValidate = [...form.querySelectorAll("input, textarea")].filter(
    (field) => field.type !== "file" && field.id !== "verificationCode"
  );

  let firstInvalidField = null;
  let formIsValid = true;

  fieldsToValidate.forEach((field) => {
    const valid = validateField(field);
    if (!valid && !firstInvalidField) {
      firstInvalidField = field;
    }
    if (!valid) {
      formIsValid = false;
    }
  });

  if (!companyEmailVerified) {
    formIsValid = false;
    verifyStatus.textContent = "Please verify the company email before submitting.";
    verifyStatus.classList.remove("verified");
    if (!firstInvalidField) {
      firstInvalidField = companyEmailInput;
    }
  }

  if (!formIsValid) {
    firstInvalidField?.focus();
    return;
  }

  successBanner.classList.add("show");
  form.reset();
  resetVerificationState();
  hidePanel();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const API_BASE_URL = "http://localhost:5000";

const form = document.getElementById("companyApplicationForm");
const submitButton = document.getElementById("submitButton");
const successBanner = document.getElementById("successBanner");
const errorBanner = document.getElementById("errorBanner");

const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  phone: (value) => /^[0-9]{7,15}$/.test(value.trim()),
  url: (value) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_error) {
      return false;
    }
  }
};

function showBanner(type, message) {
  successBanner.classList.remove("show");
  errorBanner.classList.remove("show");

  if (type === "success") {
    successBanner.textContent = message;
    successBanner.classList.add("show");
  }

  if (type === "error") {
    errorBanner.textContent = message;
    errorBanner.classList.add("show");
  }
}

function clearError(field) {
  field.classList.remove("invalid");
  const errorNode = field.closest(".field")?.querySelector(".error-text");
  if (errorNode) {
    errorNode.textContent = "";
  }
}

function setError(field, message) {
  field.classList.add("invalid");
  const errorNode = field.closest(".field")?.querySelector(".error-text");
  if (errorNode) {
    errorNode.textContent = message;
  }
}

function validateField(field) {
  clearError(field);
  const value = field.value.trim();

  if (field.dataset.required === "true" && !value) {
    setError(field, "This field is required.");
    return false;
  }

  if (!value) {
    return true;
  }

  if (field.dataset.validate && validators[field.dataset.validate] && !validators[field.dataset.validate](value)) {
    const messages = {
      email: "Please enter a valid email address.",
      phone: "Please enter only digits between 7 and 15 characters.",
      url: "Please enter a valid website URL."
    };
    setError(field, messages[field.dataset.validate]);
    return false;
  }

  return true;
}

form.querySelectorAll("input[data-validate='phone']").forEach((field) => {
  field.addEventListener("input", () => {
    field.value = field.value.replace(/\D/g, "");
  });
});

form.querySelectorAll("input, textarea").forEach((field) => {
  field.addEventListener("blur", () => validateField(field));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showBanner();

  const fields = [...form.querySelectorAll("input, textarea")].filter((field) => field.type !== "file");
  let formIsValid = true;
  let firstInvalidField = null;

  fields.forEach((field) => {
    const valid = validateField(field);
    if (!valid && !firstInvalidField) {
      firstInvalidField = field;
    }
    if (!valid) {
      formIsValid = false;
    }
  });

  if (!formIsValid) {
    firstInvalidField?.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const formData = new FormData(form);
    const response = await fetch(`${API_BASE_URL}/api/company-form/submit`, {
      method: "POST",
      body: formData
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Registration failed.");
    }

    form.reset();
    showBanner("success", "Company application submitted successfully. DDO team will review it.");
  } catch (error) {
    showBanner("error", error.message || "Something went wrong.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Registration";
  }
});

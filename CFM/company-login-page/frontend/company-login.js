const API_BASE_URL = window.location.origin;
const LOGIN_ENDPOINT = `${API_BASE_URL}/api/company/login`;
const REDIRECT_PATH = "./cfm-dashboard.html";
const TOKEN_KEY = "ddoCompanyToken";

const form = document.getElementById("company-login-form");
const companyIdInput = document.getElementById("companyId");
const companyKeyInput = document.getElementById("companyKey");
const companyPasswordInput = document.getElementById("companyPassword");
const togglePasswordButton = document.getElementById("toggle-password");
const loginButton = document.getElementById("login-button");
const formMessage = document.getElementById("form-message");

function setMessage(message, type = "") {
  formMessage.textContent = message;
  formMessage.className = "form-message";

  if (type) {
    formMessage.classList.add(type);
  }
}

function toggleLoadingState(isLoading) {
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "Logging in..." : "Login";
}

function getTrimmedValue(input) {
  return input.value.trim();
}

togglePasswordButton.addEventListener("click", () => {
  const isPassword = companyPasswordInput.type === "password";
  companyPasswordInput.type = isPassword ? "text" : "password";
  togglePasswordButton.textContent = isPassword ? "Hide" : "Show";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const companyId = getTrimmedValue(companyIdInput);
  const companyKey = getTrimmedValue(companyKeyInput);
  const companyPassword = companyPasswordInput.value;

  if (!companyId || !companyKey || !companyPassword) {
    setMessage("Please fill in Company ID, Company Key, and Company Password.", "error");
    return;
  }

  setMessage("");
  toggleLoadingState(true);

  try {
    const response = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        companyKey,
        companyPassword,
      }),
    });

    const payload = await response.json().catch(() => ({
      token: "",
      message: "Unable to read server response.",
    }));

    if (!response.ok || !payload.token) {
      throw new Error(payload.message || "Invalid company ID, key, or password");
    }

    localStorage.setItem(TOKEN_KEY, payload.token);
    setMessage(payload.message || "Company login successful", "success");

    window.setTimeout(() => {
      window.location.href = REDIRECT_PATH;
    }, 700);
  } catch (error) {
    setMessage(error.message || "Company login failed. Please try again.", "error");
  } finally {
    toggleLoadingState(false);
  }
});

const API_BASE_URL = window.location.origin;
const TOKEN_KEY = "ddoCompanyToken";
const DASHBOARD_PATH = "./cfm-dashboard.html";

const loginForm = document.getElementById("companyLoginForm");
const loginButton = document.getElementById("loginButton");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const successBanner = document.getElementById("successBanner");
const errorBanner = document.getElementById("errorBanner");

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

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showBanner();
  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  const payload = {
    companyId: document.getElementById("companyId").value.trim(),
    companyKey: document.getElementById("companyKey").value.trim(),
    companyPassword: document.getElementById("companyPassword").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/company/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Login failed.");
    }

    localStorage.setItem(TOKEN_KEY, result.token);
    showBanner("success", "Company login successful.");
    loginForm.reset();
    window.location.href = DASHBOARD_PATH;
  } catch (error) {
    showBanner("error", error.message || "Login failed.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login to CFM";
  }
});

forgotPasswordButton?.addEventListener("click", async () => {
  const companyEmail = window.prompt("Enter your registered company email:");
  if (!companyEmail) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/company/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companyEmail }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Password reset failed.");
    }

    showBanner("success", result.message || "Reset link sent to your company email.");
  } catch (error) {
    showBanner("error", error.message || "Password reset failed.");
  }
});

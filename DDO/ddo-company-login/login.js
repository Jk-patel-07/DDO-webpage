const API_BASE_URL = "http://localhost:5000";
const TOKEN_KEY = "ddoCompanyToken";
const DASHBOARD_PATH = "./company-dashboard.html";

const loginForm = document.getElementById("companyLoginForm");
const loginButton = document.getElementById("loginButton");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const successBanner = document.getElementById("successBanner");
const errorBanner = document.getElementById("errorBanner");
const dashboardCard = document.getElementById("dashboardCard");
const logoutButton = document.getElementById("logoutButton");

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

function setDashboard(company) {
  document.getElementById("dashboardCompanyName").textContent = company.companyName || "-";
  document.getElementById("dashboardCompanyEmail").textContent = company.companyEmail || "-";
  document.getElementById("dashboardCompanyPhone").textContent = company.companyPhone || "-";
  document.getElementById("dashboardCompanyWebsite").textContent = company.companyWebsite || "-";
  document.getElementById("dashboardCompanyStatus").textContent = company.status || "-";
}

async function loadDashboard() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    if (window.location.pathname.endsWith("company-dashboard.html")) {
      window.location.href = "./company-login.html";
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/company/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Session expired.");
    }

    dashboardCard.classList.remove("hidden");
    setDashboard(result);
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    if (dashboardCard) {
      dashboardCard.classList.add("hidden");
    }
    showBanner("error", error.message || "Failed to load dashboard.");
    if (window.location.pathname.endsWith("company-dashboard.html")) {
      window.location.href = "./company-login.html";
    }
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showBanner();
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    const payload = {
      companyId: document.getElementById("companyId").value.trim(),
      companyKey: document.getElementById("companyKey").value.trim(),
      companyPassword: document.getElementById("companyPassword").value
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/company/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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
      loginButton.textContent = "Login";
    }
  });
}

if (forgotPasswordButton) {
  forgotPasswordButton.addEventListener("click", async () => {
    const companyEmail = window.prompt("Enter your registered company email:");
    if (!companyEmail) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/company/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ companyEmail })
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
}

if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    if (dashboardCard) {
      dashboardCard.classList.add("hidden");
    }
    showBanner("success", "Logged out successfully.");
    if (window.location.pathname.endsWith("company-dashboard.html")) {
      window.location.href = "./company-login.html";
    }
  });
}

loadDashboard();

const API_BASE_URL = window.location.origin;
const TOKEN_KEY = "ddoCompanyToken";
const LOGIN_PATH = "./company-login.html";

const companyName = document.getElementById("companyName");
const companyEmail = document.getElementById("companyEmail");
const companyPhone = document.getElementById("companyPhone");
const companyWebsite = document.getElementById("companyWebsite");
const companyStatus = document.getElementById("companyStatus");
const logoutButton = document.getElementById("logoutButton");
const settingsButton = document.getElementById("settingsButton");

function redirectToLogin() {
  window.location.href = LOGIN_PATH;
}

async function loadCompanyProfile() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/company/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Session expired.");
    }

    companyName.textContent = payload.companyName || "-";
    companyEmail.textContent = payload.companyEmail || "-";
    companyPhone.textContent = payload.companyPhone || "-";
    companyWebsite.textContent = payload.companyWebsite || "-";
    companyStatus.textContent = payload.status || "-";
  } catch (_error) {
    localStorage.removeItem(TOKEN_KEY);
    redirectToLogin();
  }
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  redirectToLogin();
});

settingsButton.addEventListener("click", () => {
  window.alert("CFM settings panel is ready for the next feature step.");
});

loadCompanyProfile();

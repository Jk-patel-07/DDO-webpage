const API_BASE_URL = `${window.location.protocol}//${window.location.host}`;

const form = document.getElementById("resetPasswordForm");
const submitButton = document.getElementById("resetPasswordButton");
const goToLoginButton = document.getElementById("goToLoginButton");
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

function getResetToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") || "";
}

function togglePasswordVisibility(button) {
  const targetId = button.dataset.target;
  const input = document.getElementById(targetId);
  if (!input) {
    return;
  }

  const nextType = input.type === "password" ? "text" : "password";
  input.type = nextType;
  button.textContent = nextType === "password" ? "Show" : "Hide";
}

document.querySelectorAll(".toggle-button").forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showBanner();

    const token = getResetToken();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!token) {
      showBanner("error", "Reset token is missing or invalid.");
      return;
    }

    if (!newPassword) {
      showBanner("error", "New password is required.");
      return;
    }

    if (!confirmPassword) {
      showBanner("error", "Confirm password is required.");
      return;
    }

    if (newPassword.length < 6) {
      showBanner("error", "Password should be minimum 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showBanner("error", "Password and confirm password must match.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Updating...";

    try {
      const response = await fetch(`${API_BASE_URL}/api/company/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, newPassword })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Password reset failed.");
      }

      form.reset();
      showBanner("success", "Password changed successfully. Please login again.");
      goToLoginButton.classList.remove("hidden");
    } catch (error) {
      showBanner("error", error.message || "Password reset failed.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit New Password";
    }
  });
}

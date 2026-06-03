const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Company = require("../models/Company");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");
const approveRejectTokenTtlMs = 24 * 60 * 60 * 1000;
const resetTokenTtlMs = 60 * 60 * 1000;

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${safeName}${ext}`);
  }
});

const upload = multer({ storage });
const applyUpload = upload.fields([
  { name: "companyLogo", maxCount: 1 },
  { name: "companyPhoto", maxCount: 1 },
  { name: "companyProof", maxCount: 1 }
]);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function backendBaseUrl() {
  return process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_BASE_URL || "http://localhost:8080";
}

function frontendBaseUrl() {
  return process.env.FRONTEND_URL || process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_BASE_URL || "http://localhost:8080";
}

function companyLoginUrl() {
  if (process.env.COMPANY_LOGIN_URL) {
    return process.env.COMPANY_LOGIN_URL;
  }

  return `${frontendBaseUrl().replace(/\/$/, "")}/company-login.html`;
}

function companyResetPasswordUrl(rawResetToken) {
  return `${frontendBaseUrl().replace(/\/$/, "")}/reset-company-password.html?token=${encodeURIComponent(rawResetToken)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fileUrl(filename) {
  return filename ? `${backendBaseUrl()}/uploads/${encodeURIComponent(filename)}` : "";
}

function uniqueEmailList(...emails) {
  return [...new Set(emails.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean))];
}

function companyNotificationRecipients(company) {
  return uniqueEmailList(company.companyEmail, company.filledByEmail).join(", ");
}

function createToken(company) {
  return jwt.sign(
    {
      companyMongoId: company._id.toString(),
      companyId: company.companyId,
      companyEmail: company.companyEmail,
      role: "company"
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function makeRandomCode(prefix, length) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = prefix;
  for (let index = 0; index < length; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateRawToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

function createStoredToken() {
  const rawToken = generateRawToken();
  return {
    rawToken,
    hashedToken: hashToken(rawToken)
  };
}

async function generateUniqueCompanyId() {
  let candidate = "";
  let exists = true;

  while (exists) {
    candidate = makeRandomCode("DDO-", 8);
    exists = await Company.exists({ companyId: candidate });
  }

  return candidate;
}

async function generateUniqueCompanyKey() {
  let candidate = "";
  let exists = true;

  while (exists) {
    candidate = makeRandomCode("KEY-", 10);
    exists = await Company.exists({ companyKey: candidate });
  }

  return candidate;
}

function generatePlainPassword() {
  return crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "A").slice(0, 14);
}

function ensureEnvReady() {
  const required = ["MONGO_URI", "EMAIL_USER", "EMAIL_PASS", "ADMIN_EMAIL", "JWT_SECRET"];
  return required.every((key) => process.env[key] && !String(process.env[key]).includes("replace_with"));
}

function formatOfficeDetails(body) {
  const parts = [
    body.headOfficeCity,
    body.headOfficeState,
    body.headOfficeCountry,
    body.headOfficePincode
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function mapUploads(files) {
  return {
    companyLogo: files?.companyLogo?.[0]?.filename || "",
    companyPhoto: files?.companyPhoto?.[0]?.filename || "",
    companyProof: files?.companyProof?.[0]?.filename || ""
  };
}

function buildUploadRows(uploadedFiles) {
  const labels = [
    ["Company logo", uploadedFiles.companyLogo],
    ["Company photo", uploadedFiles.companyPhoto],
    ["Company proof", uploadedFiles.companyProof]
  ];

  return labels
    .map(([label, filename]) => {
      if (!filename) {
        return `<tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>${label}</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">Not uploaded</td></tr>`;
      }

      const url = fileUrl(filename);
      return `<tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>${label}</strong></td><td style="padding:10px;border:1px solid #d8d8d8;"><a href="${url}">${escapeHtml(filename)}</a></td></tr>`;
    })
    .join("");
}

function buildAdminEmailHtml(company, rawApprovalToken) {
  const approveUrl = `${backendBaseUrl()}/api/company/approve/${company._id}?token=${encodeURIComponent(rawApprovalToken)}`;
  const rejectUrl = `${backendBaseUrl()}/api/company/reject/${company._id}?token=${encodeURIComponent(rawApprovalToken)}`;

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:0 auto;">
      <h2 style="margin-bottom:8px;">New DDO One Company Form Request</h2>
      <p style="margin-top:0;color:#444;">A company submitted the DDO One form and is waiting for review.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #d8d8d8;">
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Company name</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.companyName)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Company email</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.companyEmail)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Company phone</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.companyPhone)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Company website</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.companyWebsite)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Company details</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.companyDetails)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Office details</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.officeDetails)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Filled by name</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.filledByName)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Filled by email</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.filledByEmail)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Filled by phone</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.filledByPhone)}</td></tr>
        ${buildUploadRows(company.uploadedFiles)}
      </table>
      <div style="margin-top:24px;">
        <a href="${approveUrl}" style="display:inline-block;padding:12px 18px;background:#1d7a36;color:#fff;text-decoration:none;border-radius:10px;margin-right:12px;">Approve</a>
        <a href="${rejectUrl}" style="display:inline-block;padding:12px 18px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:10px;">Reject</a>
      </div>
      <p style="margin-top:16px;color:#666;font-size:13px;">These review links are token-protected and expire automatically.</p>
    </div>
  `;
}

async function sendApprovalEmail(company, plainPassword, rawResetToken) {
  const resetUrl = companyResetPasswordUrl(rawResetToken);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: companyNotificationRecipients(company),
    subject: "Your DDO Company Login is Approved",
    text: `Congratulations. Your DDO company login has been approved.\n\nCompany ID: ${company.companyId}\nCompany Key: ${company.companyKey}\nTemporary Password: ${plainPassword}\nLogin URL: ${companyLoginUrl()}\nReset Password: ${resetUrl}\n\nFor security, this temporary password is sent only once.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:720px;margin:0 auto;">
        <h2 style="margin-bottom:8px;">Your DDO Company Login is Approved</h2>
        <p style="margin-top:0;color:#444;">Congratulations. Your company registration has been approved.</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #d8d8d8;">
          <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Company ID</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.companyId)}</td></tr>
          <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Company Key</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(company.companyKey)}</td></tr>
          <tr><td style="padding:10px;border:1px solid #d8d8d8;"><strong>Temporary password</strong></td><td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(plainPassword)}</td></tr>
        </table>
        <p style="margin-top:18px;color:#444;">This temporary password is sent only once. Please reset it after your first login.</p>
        <div style="margin-top:24px;">
          <a href="${companyLoginUrl()}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:10px;margin-right:12px;">Company Login</a>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#efefef;color:#111;text-decoration:none;border-radius:10px;">Reset Password</a>
        </div>
      </div>
    `
  });
}

async function sendRejectionEmail(company, reason) {
  const safeReason = reason ? `Reason: ${reason}` : "If you have any questions, please contact DDO support.";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: companyNotificationRecipients(company),
    subject: "Your DDO Company Request was Rejected",
    text: `Your company request was rejected.\n\n${safeReason}`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:680px;margin:0 auto;">
        <h2 style="margin-bottom:8px;">Your DDO Company Request was Rejected</h2>
        <p style="margin-top:0;color:#444;">Your company request was reviewed and could not be approved at this time.</p>
        <p><strong>Company:</strong> ${escapeHtml(company.companyName)}</p>
        <p>${escapeHtml(safeReason)}</p>
      </div>
    `
  });
}

async function sendResetLinkEmail(company, rawResetToken) {
  const resetUrl = companyResetPasswordUrl(rawResetToken);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: company.companyEmail,
    subject: "DDO Company Password Reset",
    text: `Use this secure link to reset your DDO company password: ${resetUrl}\n\nThis link expires automatically.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:680px;margin:0 auto;">
        <h2 style="margin-bottom:8px;">DDO Company Password Reset</h2>
        <p style="margin-top:0;color:#444;">A password reset was requested for your company account.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:10px;">Reset Password</a>
        <p style="margin-top:18px;color:#666;">This link expires automatically. If you did not request it, you can ignore this email.</p>
      </div>
    `
  });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireCompanyRole(req, res, next) {
  if (req.user?.role !== "company") {
    return res.status(403).json({ message: "Only company accounts can access this route." });
  }
  return next();
}

function buildReviewError(message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DDO Review Status</title>
      </head>
      <body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f7f7f7;color:#111;">
        <div style="max-width:420px;margin:48px auto;padding:24px;background:#fff;border:1px solid #ddd;border-radius:18px;text-align:center;">
          <p style="margin:0;font-size:18px;line-height:1.6;">${escapeHtml(message)}</p>
        </div>
      </body>
    </html>
  `;
}

async function validateActionToken(company, rawToken) {
  if (!company.approvalToken || !rawToken) {
    return false;
  }

  if (!company.approvalTokenExpires || company.approvalTokenExpires.getTime() < Date.now()) {
    return false;
  }

  return hashToken(rawToken) === company.approvalToken;
}

async function submitHandler(req, res) {
  try {
    if (!ensureEnvReady()) {
      return res.status(500).json({ message: "Backend environment is not fully configured." });
    }

    const requiredFields = [
      "companyName",
      "companyWebsite",
      "companyDetails",
      "companyEmail",
      "companyPhone",
      "headOfficeCity",
      "headOfficeState",
      "headOfficeCountry",
      "headOfficePincode",
      "personName",
      "personEmail",
      "personPhone",
      "personPosition"
    ];

    for (const field of requiredFields) {
      if (!req.body[field] || !String(req.body[field]).trim()) {
        return res.status(400).json({ message: `${field} is required.` });
      }
    }

    const approvalToken = createStoredToken();
    const uploadedFiles = mapUploads(req.files);
    const officeDetails = formatOfficeDetails(req.body);

    const company = await Company.create({
      companyName: req.body.companyName,
      companyWebsite: req.body.companyWebsite,
      companyDetails: req.body.companyDetails,
      companyEmail: String(req.body.companyEmail).trim().toLowerCase(),
      companyPhone: req.body.companyPhone,
      officeDetails,
      headOfficeCity: req.body.headOfficeCity,
      headOfficeState: req.body.headOfficeState,
      headOfficeCountry: req.body.headOfficeCountry,
      headOfficePincode: req.body.headOfficePincode,
      filledByName: req.body.personName,
      filledByEmail: String(req.body.personEmail).trim().toLowerCase(),
      filledByPhone: req.body.personPhone,
      personName: req.body.personName,
      personEmail: String(req.body.personEmail).trim().toLowerCase(),
      personPhone: req.body.personPhone,
      personPosition: req.body.personPosition,
      uploadedFiles,
      status: "pending",
      approvalToken: approvalToken.hashedToken,
      approvalTokenExpires: new Date(Date.now() + approveRejectTokenTtlMs)
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "New DDO One Company Form Request",
      text: `New DDO One Company Form Request\n\nCompany: ${company.companyName}\nEmail: ${company.companyEmail}\nPhone: ${company.companyPhone}\nWebsite: ${company.companyWebsite}\nApprove: ${backendBaseUrl()}/api/company/approve/${company._id}?token=${approvalToken.rawToken}\nReject: ${backendBaseUrl()}/api/company/reject/${company._id}?token=${approvalToken.rawToken}`,
      html: buildAdminEmailHtml(company, approvalToken.rawToken)
    });

    return res.status(201).json({
      message: "Company application submitted successfully. DDO team will review it.",
      companyId: company._id
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit application." });
  }
}

router.post("/submit", applyUpload, submitHandler);
router.post("/apply", applyUpload, submitHandler);

router.get("/approve/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).send(buildReviewError("Company not found."));
    }

    if (company.status === "approved") {
      return res.send(buildReviewError("This company is already approved. Credentials were already generated."));
    }

    if (company.status === "rejected") {
      return res.send(buildReviewError("This company request was already rejected."));
    }

    const tokenIsValid = await validateActionToken(company, String(req.query.token || ""));
    if (!tokenIsValid) {
      return res.status(403).send(buildReviewError("This approval link is invalid or expired."));
    }

    const companyId = company.companyId || (await generateUniqueCompanyId());
    const companyKey = company.companyKey || (await generateUniqueCompanyKey());
    const plainPassword = generatePlainPassword();
    const resetToken = createStoredToken();

    company.companyId = companyId;
    company.companyKey = companyKey;
    company.passwordHash = await bcrypt.hash(plainPassword, 10);
    company.status = "approved";
    company.approvedAt = new Date();
    company.approvalToken = "";
    company.approvalTokenExpires = null;
    company.resetPasswordToken = resetToken.hashedToken;
    company.resetPasswordExpires = new Date(Date.now() + resetTokenTtlMs);
    company.rejectedAt = null;
    company.rejectionReason = "";

    await company.save();
    await sendApprovalEmail(company, plainPassword, resetToken.rawToken);

    return res.send(buildReviewError("Company approved successfully. Login details sent to company email."));
  } catch (error) {
    return res.status(500).send(buildReviewError(error.message || "Approval failed."));
  }
});

router.get("/reject/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).send(buildReviewError("Company not found."));
    }

    if (company.status === "approved") {
      return res.send(buildReviewError("This company is already approved and cannot be rejected from this link."));
    }

    if (company.status === "rejected") {
      return res.send(buildReviewError("This company request was already rejected."));
    }

    const tokenIsValid = await validateActionToken(company, String(req.query.token || ""));
    if (!tokenIsValid) {
      return res.status(403).send(buildReviewError("This reject link is invalid or expired."));
    }

    const reason = String(req.query.reason || req.body?.reason || "").trim();
    company.status = "rejected";
    company.rejectedAt = new Date();
    company.rejectionReason = reason;
    company.approvalToken = "";
    company.approvalTokenExpires = null;

    await company.save();
    await sendRejectionEmail(company, reason);

    return res.send(buildReviewError("Company request rejected successfully."));
  } catch (error) {
    return res.status(500).send(buildReviewError(error.message || "Rejection failed."));
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Reset token and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    const company = await Company.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
      status: "approved"
    });

    if (!company) {
      return res.status(400).json({ message: "Reset link is invalid or expired." });
    }

    company.passwordHash = await bcrypt.hash(newPassword, 10);
    company.resetPasswordToken = "";
    company.resetPasswordExpires = null;
    await company.save();

    return res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Password reset failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { companyId, companyKey, companyPassword } = req.body;

    if (!companyId || !companyKey || !companyPassword) {
      return res.status(400).json({ message: "Company ID, key, and password are required." });
    }

    const company = await Company.findOne({ companyId, companyKey });

    if (!company || company.status !== "approved") {
      return res.status(401).json({ message: "Company login failed. Check your credentials." });
    }

    const passwordOk = await bcrypt.compare(companyPassword, company.passwordHash || "");
    if (!passwordOk) {
      return res.status(401).json({ message: "Company login failed. Check your credentials." });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(company)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed." });
  }
});

router.get("/me", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId).select(
      "companyName companyEmail companyPhone companyWebsite status companyId companyKey createdAt headOfficeCity headOfficeState headOfficeCountry headOfficePincode companyDetails officeDetails"
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    return res.json(company);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch company dashboard." });
  }
});

router.post("/verify-password", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const companyPassword = String(req.body.companyPassword || "");
    if (!companyPassword) {
      return res.status(400).json({ message: "Company password is required." });
    }

    const company = await Company.findById(req.user.companyMongoId).select("passwordHash");
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const passwordOk = await bcrypt.compare(companyPassword, company.passwordHash || "");
    if (!passwordOk) {
      return res.status(401).json({ message: "Wrong password" });
    }

    return res.json({ message: "Password verified successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Password verification failed." });
  }
});

router.get("/details", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId).select(
      "companyName companyEmail companyPhone companyWebsite companyDetails officeDetails headOfficeCity headOfficeState headOfficeCountry headOfficePincode"
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    return res.json(company);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load company details." });
  }
});

router.put("/details", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const fields = [
      "companyName",
      "companyEmail",
      "companyPhone",
      "companyWebsite",
      "companyDetails",
      "officeDetails",
      "headOfficeCity",
      "headOfficeState",
      "headOfficeCountry",
      "headOfficePincode"
    ];

    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        company[field] = String(req.body[field] || "").trim();
      }
    });

    if (!company.companyName || !company.companyEmail || !company.companyPhone || !company.companyWebsite) {
      return res.status(400).json({ message: "Company name, email, phone, and website are required." });
    }

    await company.save();
    return res.json({ message: "Company details updated successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update company details." });
  }
});

router.get("/employee-files", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId).select("employeeFiles");
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    return res.json({ employeeFiles: company.employeeFiles || [] });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load employee files." });
  }
});

router.post("/employee-files", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Employee name is required." });
    }

    company.employeeFiles.push({
      name,
      role: String(req.body.role || "").trim(),
      notes: String(req.body.notes || "").trim(),
      fileName: String(req.body.fileName || "").trim(),
      updatedAt: new Date()
    });

    await company.save();
    return res.status(201).json({ message: "Employee file added successfully.", employeeFiles: company.employeeFiles });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to add employee file." });
  }
});

router.put("/employee-files/:employeeId", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const employee = company.employeeFiles.id(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee file not found." });
    }

    ["name", "role", "notes", "fileName"].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        employee[field] = String(req.body[field] || "").trim();
      }
    });
    employee.updatedAt = new Date();

    await company.save();
    return res.json({ message: "Employee file updated successfully.", employeeFiles: company.employeeFiles });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update employee file." });
  }
});

router.delete("/employee-files/:employeeId", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const employee = company.employeeFiles.id(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee file not found." });
    }

    employee.deleteOne();
    await company.save();
    return res.json({ message: "Employee file removed successfully.", employeeFiles: company.employeeFiles });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to remove employee file." });
  }
});

router.get("/search", authMiddleware, requireCompanyRole, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    const filter = query
      ? {
          $or: [
            { companyName: { $regex: query, $options: "i" } },
            { companyEmail: { $regex: query, $options: "i" } },
            { companyWebsite: { $regex: query, $options: "i" } },
            { companyId: { $regex: query, $options: "i" } },
            { companyKey: { $regex: query, $options: "i" } }
          ]
        }
      : {};

    const companies = await Company.find(filter)
      .select("companyName companyEmail companyPhone companyWebsite status companyId companyKey createdAt")
      .sort({ createdAt: -1 })
      .limit(25);

    return res.json({ results: companies });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Company search failed." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const companyEmail = String(req.body.companyEmail || "").trim().toLowerCase();

    if (!companyEmail) {
      return res.status(400).json({ message: "Registered company email is required." });
    }

    const company = await Company.findOne({ companyEmail, status: "approved" });
    if (!company) {
      return res.status(404).json({ message: "Approved company not found for this email." });
    }

    const resetToken = createStoredToken();
    company.resetPasswordToken = resetToken.hashedToken;
    company.resetPasswordExpires = new Date(Date.now() + resetTokenTtlMs);
    await company.save();

    await sendResetLinkEmail(company, resetToken.rawToken);

    return res.json({ message: "Password reset link sent to company email." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Password reset failed." });
  }
});

module.exports = router;

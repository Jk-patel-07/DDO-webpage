const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const Company = require("../../models/Company");
const CompanyEditRequest = require("../models/CompanyEditRequest");
const { authMiddleware, requireCompanyRole } = require("../../middleware/companyAuth");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads");
const editTokenTtlMs = 24 * 60 * 60 * 1000;

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${safeName}${ext}`);
  },
});

const upload = multer({ storage });
const editUpload = upload.fields([
  { name: "companyLogo", maxCount: 1 },
  { name: "companyPhoto", maxCount: 1 },
  { name: "companyProof", maxCount: 1 },
]);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function backendBaseUrl() {
  return process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_BASE_URL || "http://localhost:8080";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createStoredToken() {
  const rawToken = crypto.randomBytes(24).toString("hex");
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
  };
}

function fileUrl(filename) {
  return filename ? `${backendBaseUrl()}/uploads/${encodeURIComponent(filename)}` : "";
}

function buildCompanySnapshot(company) {
  return {
    companyName: company.companyName || "",
    companyWebsite: company.companyWebsite || "",
    companyDetails: company.companyDetails || "",
    companyEmail: company.companyEmail || "",
    companyPhone: company.companyPhone || "",
    officeDetails: company.officeDetails || "",
    headOfficeCity: company.headOfficeCity || "",
    headOfficeState: company.headOfficeState || "",
    headOfficeCountry: company.headOfficeCountry || "",
    headOfficePincode: company.headOfficePincode || "",
    filledByName: company.filledByName || "",
    filledByEmail: company.filledByEmail || "",
    filledByPhone: company.filledByPhone || "",
    personName: company.personName || "",
    personEmail: company.personEmail || "",
    personPhone: company.personPhone || "",
    personPosition: company.personPosition || "",
    uploadedFiles: {
      companyLogo: company.uploadedFiles?.companyLogo || "",
      companyPhoto: company.uploadedFiles?.companyPhoto || "",
      companyProof: company.uploadedFiles?.companyProof || "",
    },
  };
}

function mapUploads(files, previousUploads = {}) {
  return {
    companyLogo: files?.companyLogo?.[0]?.filename || previousUploads.companyLogo || "",
    companyPhoto: files?.companyPhoto?.[0]?.filename || previousUploads.companyPhoto || "",
    companyProof: files?.companyProof?.[0]?.filename || previousUploads.companyProof || "",
  };
}

function buildEditRows(oldData, newData) {
  const rows = [
    ["Company name", oldData.companyName, newData.companyName],
    ["Company website", oldData.companyWebsite, newData.companyWebsite],
    ["Company details", oldData.companyDetails, newData.companyDetails],
    ["Company email", oldData.companyEmail, newData.companyEmail],
    ["Company phone", oldData.companyPhone, newData.companyPhone],
    ["Office details", oldData.officeDetails, newData.officeDetails],
    ["Head office city", oldData.headOfficeCity, newData.headOfficeCity],
    ["Head office state", oldData.headOfficeState, newData.headOfficeState],
    ["Head office country", oldData.headOfficeCountry, newData.headOfficeCountry],
    ["Head office pincode", oldData.headOfficePincode, newData.headOfficePincode],
    ["Filled by name", oldData.filledByName, newData.filledByName],
    ["Filled by email", oldData.filledByEmail, newData.filledByEmail],
    ["Filled by phone", oldData.filledByPhone, newData.filledByPhone],
    ["Person name", oldData.personName, newData.personName],
    ["Person email", oldData.personEmail, newData.personEmail],
    ["Person phone", oldData.personPhone, newData.personPhone],
    ["Person position", oldData.personPosition, newData.personPosition],
  ];

  const fileRows = [
    ["Company logo", oldData.uploadedFiles?.companyLogo || "", newData.uploadedFiles?.companyLogo || ""],
    ["Company photo", oldData.uploadedFiles?.companyPhoto || "", newData.uploadedFiles?.companyPhoto || ""],
    ["Company proof", oldData.uploadedFiles?.companyProof || "", newData.uploadedFiles?.companyProof || ""],
  ];

  return [
    ...rows.map(
      ([label, oldValue, newValue]) => `
        <tr>
          <td style="padding:10px;border:1px solid #d8d8d8;"><strong>${label}</strong></td>
          <td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(oldValue)}</td>
          <td style="padding:10px;border:1px solid #d8d8d8;">${escapeHtml(newValue)}</td>
        </tr>
      `
    ),
    ...fileRows.map(([label, oldValue, newValue]) => `
      <tr>
        <td style="padding:10px;border:1px solid #d8d8d8;"><strong>${label}</strong></td>
        <td style="padding:10px;border:1px solid #d8d8d8;">${oldValue ? `<a href="${fileUrl(oldValue)}">${escapeHtml(oldValue)}</a>` : "Not uploaded"}</td>
        <td style="padding:10px;border:1px solid #d8d8d8;">${newValue ? `<a href="${fileUrl(newValue)}">${escapeHtml(newValue)}</a>` : "Not uploaded"}</td>
      </tr>
    `),
  ].join("");
}

function buildReviewPage(message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DDO Edit Review</title>
      </head>
      <body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f7f7f7;color:#111;">
        <div style="max-width:460px;margin:48px auto;padding:24px;background:#fff;border:1px solid #ddd;border-radius:18px;text-align:center;">
          <p style="margin:0;font-size:18px;line-height:1.6;">${escapeHtml(message)}</p>
        </div>
      </body>
    </html>
  `;
}

async function sendEditRequestEmail(company, editRequest, approveRawToken, rejectRawToken) {
  const approveUrl = `${backendBaseUrl()}/api/cfm/company/edit/approve/${approveRawToken}`;
  const rejectUrl = `${backendBaseUrl()}/api/cfm/company/edit/reject/${rejectRawToken}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: "DDO Company Details Edit Request",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:820px;margin:0 auto;">
        <h2 style="margin-bottom:8px;">DDO Company Details Edit Request</h2>
        <p style="margin-top:0;color:#444;">A company requested changes to their DDO One company details.</p>
        <p><strong>Company:</strong> ${escapeHtml(company.companyName)}</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #d8d8d8;">
          <thead>
            <tr>
              <th style="padding:10px;border:1px solid #d8d8d8;background:#f5f5f5;">Field</th>
              <th style="padding:10px;border:1px solid #d8d8d8;background:#f5f5f5;">Old Details</th>
              <th style="padding:10px;border:1px solid #d8d8d8;background:#f5f5f5;">New Details</th>
            </tr>
          </thead>
          <tbody>${buildEditRows(editRequest.oldData, editRequest.newData)}</tbody>
        </table>
        <div style="margin-top:24px;">
          <a href="${approveUrl}" style="display:inline-block;padding:12px 18px;background:#1d7a36;color:#fff;text-decoration:none;border-radius:10px;margin-right:12px;">Approve</a>
          <a href="${rejectUrl}" style="display:inline-block;padding:12px 18px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:10px;">Reject</a>
        </div>
      </div>
    `,
  });
}

async function sendEditStatusEmail(company, approved) {
  const subject = approved
    ? "Company details updated successfully"
    : "Company details edit request rejected";
  const message = approved
    ? "Your DDO company details edit request was approved and your company profile is now updated."
    : "Your DDO company details edit request was rejected. Your current company details were not changed.";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: [company.companyEmail, company.filledByEmail].filter(Boolean).join(", "),
    subject,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:680px;margin:0 auto;">
        <h2 style="margin-bottom:8px;">${escapeHtml(subject)}</h2>
        <p style="margin-top:0;color:#444;">${escapeHtml(message)}</p>
      </div>
    `,
  });
}

router.use(authMiddleware, requireCompanyRole);

router.post("/verify-password", async (req, res) => {
  try {
    console.log("CFM verify password route hit");
    console.log("Auth user:", req.user);
    const companyPassword = String(req.body.password || req.body.companyPassword || "");
    if (!companyPassword) {
      return res.status(400).json({ success: false, message: "Company password is required." });
    }

    if (!req.user?.companyMongoId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    let company;
    try {
      company = await Company.findById(req.user.companyMongoId).select("passwordHash");
    } catch (dbError) {
      if (/mongo|serverselectionerror|querysrv|econnrefused|enotfound/i.test(String(dbError.message || ""))) {
        return res.status(500).json({ success: false, message: "Database connection failed" });
      }
      throw dbError;
    }

    console.log("Company user found:", !!company);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    const passwordOk = await bcrypt.compare(companyPassword, company.passwordHash || "");
    console.log("Password match:", passwordOk);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: "Wrong company password" });
    }

    return res.json({ success: true, message: "Password verified" });
  } catch (error) {
    if (/mongo|serverselectionerror|querysrv|econnrefused|enotfound/i.test(String(error.message || ""))) {
      return res.status(500).json({ success: false, message: "Database connection failed" });
    }
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

router.get("/current", async (req, res) => {
  try {
    if (!req.user?.companyMongoId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const company = await Company.findById(req.user.companyMongoId).select(
      "companyName companyWebsite companyDetails companyEmail companyPhone officeDetails headOfficeCity headOfficeState headOfficeCountry headOfficePincode filledByName filledByEmail filledByPhone personName personEmail personPhone personPosition uploadedFiles"
    );

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    return res.json({
      success: true,
      ...buildCompanySnapshot(company),
    });
  } catch (error) {
    if (/mongo|serverselectionerror|querysrv|econnrefused|enotfound/i.test(String(error.message || ""))) {
      return res.status(500).json({ success: false, message: "Database connection failed" });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load current company details.",
    });
  }
});

router.post("/request", editUpload, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyMongoId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
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
      "personPosition",
    ];

    for (const field of requiredFields) {
      if (!String(req.body[field] || "").trim()) {
        return res.status(400).json({ message: `${field} is required.` });
      }
    }

    const oldData = buildCompanySnapshot(company);
    const newData = {
      companyName: String(req.body.companyName || "").trim(),
      companyWebsite: String(req.body.companyWebsite || "").trim(),
      companyDetails: String(req.body.companyDetails || "").trim(),
      companyEmail: String(req.body.companyEmail || "").trim().toLowerCase(),
      companyPhone: String(req.body.companyPhone || "").trim(),
      officeDetails: String(req.body.officeDetails || "").trim(),
      headOfficeCity: String(req.body.headOfficeCity || "").trim(),
      headOfficeState: String(req.body.headOfficeState || "").trim(),
      headOfficeCountry: String(req.body.headOfficeCountry || "").trim(),
      headOfficePincode: String(req.body.headOfficePincode || "").trim(),
      filledByName: String(req.body.filledByName || req.body.personName || "").trim(),
      filledByEmail: String(req.body.filledByEmail || req.body.personEmail || "").trim().toLowerCase(),
      filledByPhone: String(req.body.filledByPhone || req.body.personPhone || "").trim(),
      personName: String(req.body.personName || "").trim(),
      personEmail: String(req.body.personEmail || "").trim().toLowerCase(),
      personPhone: String(req.body.personPhone || "").trim(),
      personPosition: String(req.body.personPosition || "").trim(),
      uploadedFiles: mapUploads(req.files, oldData.uploadedFiles),
    };

    const approveToken = createStoredToken();
    const rejectToken = createStoredToken();

    const editRequest = await CompanyEditRequest.create({
      companyUserId: company._id,
      companyId: company.companyId || "",
      oldData,
      newData,
      status: "pending",
      approveToken: approveToken.hashedToken,
      rejectToken: rejectToken.hashedToken,
      tokenExpiresAt: new Date(Date.now() + editTokenTtlMs),
    });

    await sendEditRequestEmail(company, editRequest, approveToken.rawToken, rejectToken.rawToken);

    return res.status(201).json({ message: "Edit request submitted for admin approval." });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit edit request." });
  }
});

router.get("/approve/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "");
    const editRequest = await CompanyEditRequest.findOne({
      approveToken: hashToken(token),
      status: "pending",
      tokenExpiresAt: { $gt: new Date() },
    });

    if (!editRequest) {
      return res.status(404).send(buildReviewPage("This company edit approval link is invalid or expired."));
    }

    const company = await Company.findById(editRequest.companyUserId);
    if (!company) {
      return res.status(404).send(buildReviewPage("Company not found for this edit request."));
    }

    Object.assign(company, editRequest.newData);
    await company.save();

    editRequest.status = "approved";
    editRequest.approveToken = "";
    editRequest.rejectToken = "";
    await editRequest.save();

    await sendEditStatusEmail(company, true);
    return res.send(buildReviewPage("Company details updated successfully"));
  } catch (error) {
    return res.status(500).send(buildReviewPage(error.message || "Failed to approve company edit request."));
  }
});

router.get("/reject/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "");
    const editRequest = await CompanyEditRequest.findOne({
      rejectToken: hashToken(token),
      status: "pending",
      tokenExpiresAt: { $gt: new Date() },
    });

    if (!editRequest) {
      return res.status(404).send(buildReviewPage("This company edit reject link is invalid or expired."));
    }

    editRequest.status = "rejected";
    editRequest.approveToken = "";
    editRequest.rejectToken = "";
    await editRequest.save();

    const company = await Company.findById(editRequest.companyUserId);
    if (company) {
      await sendEditStatusEmail(company, false);
    }

    return res.send(buildReviewPage("Company edit request rejected."));
  } catch (error) {
    return res.status(500).send(buildReviewPage(error.message || "Failed to reject company edit request."));
  }
});

module.exports = router;

const bcrypt = require("bcrypt");
const Company = require("../../models/Company");
const CfmPrivateUser = require("../models/CfmPrivateUser");

async function getOrCreatePrivacyRecord(req) {
  const company = await Company.findById(req.user.companyMongoId).select(
    "_id companyId companyName companyEmail companyPhone companyWebsite status personName personEmail personPhone createdAt"
  );

  if (!company) {
    return { company: null, settings: null };
  }

  let settings = await CfmPrivateUser.findOne({ companyUserId: company._id });

  if (!settings) {
    settings = await CfmPrivateUser.create({
      companyUserId: company._id,
      companyId: company.companyId || "",
      privacyMode: "not-private",
      pinHash: "",
    });
  }

  return { company, settings };
}

function normalizePrivacyMode(value) {
  return value === "private" ? "private" : "not-private";
}

function companyInfoPayload(company) {
  return {
    companyName: company.companyName || "",
    companyId: company.companyId || "",
    companyEmail: company.companyEmail || "",
    companyPhone: company.companyPhone || "",
    companyWebsite: company.companyWebsite || "",
    status: company.status || "",
    createdAt: company.createdAt || null,
    personName: company.personName || "",
    personEmail: company.personEmail || "",
    personPhone: company.personPhone || "",
  };
}

async function getPrivacyStatus(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);

    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    return res.json({
      privacyMode: normalizePrivacyMode(settings.privacyMode),
      hasPin: Boolean(settings.pinHash),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load privacy settings." });
  }
}

async function setPrivateMode(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);
    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    const pin = String(req.body.pin || "").trim();
    const confirmPin = String(req.body.confirmPin || "").trim();

    settings.companyId = company.companyId || "";
    settings.privacyMode = "private";

    if (!pin || !confirmPin) {
      return res.status(400).json({ message: "PIN and confirm PIN are required for private mode." });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be 4 to 6 digits." });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ message: "PIN and confirm PIN must match." });
    }

    settings.pinHash = await bcrypt.hash(pin, 10);
    await settings.save();

    return res.json({
      message: "Private mode enabled.",
      privacyMode: settings.privacyMode,
      hasPin: Boolean(settings.pinHash),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to save privacy settings." });
  }
}

async function setNotPrivateMode(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);
    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    settings.companyId = company.companyId || "";
    settings.privacyMode = "not-private";
    settings.pinHash = "";
    await settings.save();

    return res.json({
      message: "Private mode disabled.",
      privacyMode: settings.privacyMode,
      hasPin: false,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update privacy mode." });
  }
}

async function verifyPrivatePin(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);
    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    if (normalizePrivacyMode(settings.privacyMode) !== "private") {
      return res.json({
        message: "Company info is not private.",
        verified: true,
        privacyMode: "not-private",
        company: companyInfoPayload(company),
      });
    }

    const pin = String(req.body.pin || "").trim();
    if (!pin) {
      return res.status(400).json({ message: "PIN is required." });
    }

    const matches = settings.pinHash ? await bcrypt.compare(pin, settings.pinHash) : false;
    if (!matches) {
      return res.status(401).json({ message: "Wrong PIN", verified: false });
    }

    return res.json({
      message: "PIN verified successfully.",
      verified: true,
      privacyMode: "private",
      company: companyInfoPayload(company),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to verify PIN." });
  }
}

async function getCompanyInfo(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);
    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    if (normalizePrivacyMode(settings.privacyMode) === "private") {
      return res.status(403).json({ message: "PIN verification is required." });
    }

    return res.json({
      privacyMode: "not-private",
      company: companyInfoPayload(company),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load company info." });
  }
}

module.exports = {
  getCompanyInfo,
  getPrivacyStatus,
  setNotPrivateMode,
  setPrivateMode,
  verifyPrivatePin,
};

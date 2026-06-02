const bcrypt = require("bcrypt");
const Company = require("../../models/Company");
const CfmPrivateUser = require("../models/CfmPrivateUser");

async function getOrCreatePrivacyRecord(req) {
  const company = await Company.findById(req.user.companyMongoId).select(
    "_id companyId companyName companyEmail companyPhone companyWebsite status personName personEmail personPhone"
  );

  if (!company) {
    return { company: null, settings: null };
  }

  let settings = await CfmPrivateUser.findOne({ companyUserId: company._id });

  if (!settings) {
    settings = await CfmPrivateUser.create({
      companyUserId: company._id,
      companyId: company.companyId || "",
      privacyMode: "public",
      pinHash: "",
    });
  }

  return { company, settings };
}

function companyInfoPayload(company) {
  return {
    companyName: company.companyName || "",
    companyId: company.companyId || "",
    companyEmail: company.companyEmail || "",
    companyPhone: company.companyPhone || "",
    companyWebsite: company.companyWebsite || "",
    status: company.status || "",
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
      privacyMode: settings.privacyMode,
      hasPin: Boolean(settings.pinHash),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load privacy settings." });
  }
}

async function setPrivacyMode(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);
    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    const privacyMode = String(req.body.privacyMode || "").trim().toLowerCase();
    const pin = String(req.body.pin || "").trim();
    const confirmPin = String(req.body.confirmPin || "").trim();

    if (!["public", "private"].includes(privacyMode)) {
      return res.status(400).json({ message: "Choose public or private mode." });
    }

    settings.companyId = company.companyId || "";
    settings.privacyMode = privacyMode;

    if (privacyMode === "private") {
      if (!pin || !confirmPin) {
        return res.status(400).json({ message: "PIN and confirm PIN are required for private mode." });
      }

      if (!/^\d{4,8}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be 4 to 8 digits." });
      }

      if (pin !== confirmPin) {
        return res.status(400).json({ message: "PIN and confirm PIN must match." });
      }

      settings.pinHash = await bcrypt.hash(pin, 10);
    } else {
      settings.pinHash = "";
    }

    await settings.save();

    return res.json({
      message: privacyMode === "private" ? "Private mode saved successfully." : "Public mode enabled successfully.",
      privacyMode: settings.privacyMode,
      hasPin: Boolean(settings.pinHash),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to save privacy settings." });
  }
}

async function verifyPrivatePin(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);
    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    if (settings.privacyMode !== "private") {
      return res.json({ message: "Company info is public.", verified: true });
    }

    const pin = String(req.body.pin || "").trim();
    if (!pin) {
      return res.status(400).json({ message: "PIN is required." });
    }

    const matches = settings.pinHash ? await bcrypt.compare(pin, settings.pinHash) : false;
    if (!matches) {
      return res.status(401).json({ message: "Incorrect PIN.", verified: false });
    }

    return res.json({ message: "PIN verified successfully.", verified: true });
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

    if (settings.privacyMode === "private") {
      return res.status(403).json({ message: "PIN verification is required." });
    }

    return res.json({
      privacyMode: settings.privacyMode,
      company: companyInfoPayload(company),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load company info." });
  }
}

async function accessCompanyInfo(req, res) {
  try {
    const { company, settings } = await getOrCreatePrivacyRecord(req);
    if (!company) {
      return res.status(404).json({ message: "Company account not found." });
    }

    if (settings.privacyMode === "private") {
      const pin = String(req.body.pin || "").trim();
      if (!pin) {
        return res.status(400).json({ message: "PIN is required." });
      }

      const matches = settings.pinHash ? await bcrypt.compare(pin, settings.pinHash) : false;
      if (!matches) {
        return res.status(401).json({ message: "Incorrect PIN." });
      }
    }

    return res.json({
      privacyMode: settings.privacyMode,
      company: companyInfoPayload(company),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to access company info." });
  }
}

module.exports = {
  accessCompanyInfo,
  getCompanyInfo,
  getPrivacyStatus,
  setPrivacyMode,
  verifyPrivatePin,
};

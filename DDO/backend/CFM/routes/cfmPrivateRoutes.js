const express = require("express");
const { authMiddleware, requireCompanyRole } = require("../../middleware/companyAuth");
const {
  accessCompanyInfo,
  getCompanyInfo,
  getPrivacyStatus,
  setPrivacyMode,
  verifyPrivatePin,
} = require("../controllers/cfmPrivateController");

const router = express.Router();

router.use(authMiddleware, requireCompanyRole);

router.get("/company-info/privacy", getPrivacyStatus);
router.post("/company-info/privacy", setPrivacyMode);
router.post("/company-info/verify-pin", verifyPrivatePin);
router.get("/company-info", getCompanyInfo);
router.post("/company-info/access", accessCompanyInfo);

module.exports = router;

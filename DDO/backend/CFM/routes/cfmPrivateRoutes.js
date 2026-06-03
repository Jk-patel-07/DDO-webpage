const express = require("express");
const { authMiddleware, requireCompanyRole } = require("../../middleware/companyAuth");
const {
  getCompanyInfo,
  getPrivacyStatus,
  setNotPrivateMode,
  setPrivateMode,
  verifyPrivatePin,
} = require("../controllers/cfmPrivateController");

const router = express.Router();

router.use(authMiddleware, requireCompanyRole);

router.get("/privacy/status", getPrivacyStatus);
router.post("/privacy/set-private", setPrivateMode);
router.post("/privacy/set-not-private", setNotPrivateMode);
router.post("/privacy/verify-pin", verifyPrivatePin);
router.get("/company-info", getCompanyInfo);

module.exports = router;

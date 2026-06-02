const express = require("express");

const CompanyUser = require("../models/CompanyUser");
const authMiddleware = require("../middleware/authMiddleware");
const generateToken = require("../utils/generateToken");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const companyId = String(req.body?.companyId || "").trim();
    const companyKey = String(req.body?.companyKey || "").trim();
    const companyPassword = String(req.body?.companyPassword || "");

    if (!companyId || !companyKey || !companyPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const companyUser = await CompanyUser.findOne({
      companyId,
      companyKey,
    }).select("+companyPassword");

    if (!companyUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid company ID, key, or password",
      });
    }

    if (!companyUser.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Company account is not approved yet",
      });
    }

    const isPasswordValid = await companyUser.comparePassword(companyPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid company ID, key, or password",
      });
    }

    const token = generateToken({
      id: companyUser._id,
      companyId: companyUser.companyId,
      companyEmail: companyUser.companyEmail,
    });

    return res.status(200).json({
      success: true,
      message: "Company login successful",
      token,
      company: {
        id: companyUser._id,
        companyId: companyUser.companyId,
        companyName: companyUser.companyName,
        companyEmail: companyUser.companyEmail,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/profile", authMiddleware, async (req, res, next) => {
  try {
    const companyUser = await CompanyUser.findById(req.companyUser.id).select(
      "companyName companyEmail companyId isApproved createdAt updatedAt"
    );

    if (!companyUser) {
      return res.status(404).json({
        success: false,
        message: "Company user not found",
      });
    }

    return res.status(200).json({
      success: true,
      company: companyUser,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

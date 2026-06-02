const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const companyUserSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    companyEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    companyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    companyPassword: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

companyUserSchema.index({ companyId: 1, companyKey: 1 }, { unique: true });

companyUserSchema.pre("save", async function hashCompanyPassword(next) {
  if (!this.isModified("companyPassword")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.companyPassword = await bcrypt.hash(this.companyPassword, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

companyUserSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.companyPassword);
};

module.exports =
  mongoose.models.CompanyUser || mongoose.model("CompanyUser", companyUserSchema);

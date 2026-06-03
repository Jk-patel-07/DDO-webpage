const mongoose = require("mongoose");

const cfmPrivateUserSchema = new mongoose.Schema(
  {
    companyUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    companyId: { type: String, required: true, trim: true },
    privacyMode: {
      type: String,
      enum: ["not-private", "private"],
      default: "not-private",
    },
    pinHash: { type: String, default: "" },
  },
  {
    collection: "cfm_private_users",
    timestamps: true,
  }
);

module.exports = mongoose.model("CfmPrivateUser", cfmPrivateUserSchema);

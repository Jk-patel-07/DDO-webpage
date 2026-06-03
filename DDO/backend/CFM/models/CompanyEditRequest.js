const mongoose = require("mongoose");

const companyEditRequestSchema = new mongoose.Schema(
  {
    companyUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    companyId: { type: String, default: "", trim: true, index: true },
    oldData: { type: Object, required: true },
    newData: { type: Object, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approveToken: { type: String, default: "" },
    rejectToken: { type: String, default: "" },
    tokenExpiresAt: { type: Date, default: null },
  },
  {
    collection: "company_edit_requests",
    timestamps: true,
  }
);

module.exports = mongoose.model("CompanyEditRequest", companyEditRequestSchema);

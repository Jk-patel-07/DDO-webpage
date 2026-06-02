const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    companyWebsite: { type: String, required: true, trim: true },
    companyDetails: { type: String, required: true, trim: true },
    companyEmail: { type: String, required: true, trim: true, lowercase: true },
    companyPhone: { type: String, required: true, trim: true },
    officeDetails: { type: String, default: "", trim: true },
    headOfficeCity: { type: String, required: true, trim: true },
    headOfficeState: { type: String, required: true, trim: true },
    headOfficeCountry: { type: String, required: true, trim: true },
    headOfficePincode: { type: String, required: true, trim: true },
    filledByName: { type: String, default: "", trim: true },
    filledByEmail: { type: String, default: "", trim: true, lowercase: true },
    filledByPhone: { type: String, default: "", trim: true },
    personName: { type: String, required: true, trim: true },
    personEmail: { type: String, required: true, trim: true, lowercase: true },
    personPhone: { type: String, required: true, trim: true },
    personPosition: { type: String, required: true, trim: true },
    uploadedFiles: {
      companyLogo: { type: String, default: "" },
      companyPhoto: { type: String, default: "" },
      companyProof: { type: String, default: "" }
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    companyId: { type: String, default: "" },
    companyKey: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    approvalToken: { type: String, default: "" },
    approvalTokenExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: "" },
    resetPasswordExpires: { type: Date, default: null },
    recentFiles: [
      {
        targetPath: { type: String, default: "", trim: true },
        itemType: { type: String, enum: ["file", "folder"], default: "file" },
        action: { type: String, default: "open", trim: true },
        lastAccessedAt: { type: Date, default: Date.now }
      }
    ],
    rejectionReason: { type: String, default: "", trim: true },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null }
  },
  {
    collection: "companies",
    timestamps: true
  }
);

module.exports = mongoose.model("Company", companySchema);

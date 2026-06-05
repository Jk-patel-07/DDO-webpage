const mongoose = require("mongoose");

const cfmFileChangeSchema = new mongoose.Schema(
  {
    companyUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    companyId: { type: String, default: "", trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    fileName: { type: String, default: "", trim: true },
    filePath: { type: String, default: "", trim: true, index: true },
    changedBy: { type: String, default: "", trim: true },
    changedByEmail: { type: String, default: "", trim: true, lowercase: true },
    oldContent: { type: String, default: "" },
    newContent: { type: String, default: "" },
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 },
    changeTitle: { type: String, required: true, trim: true },
    changeDetails: { type: String, required: true, trim: true },
    changeReason: { type: String, default: "", trim: true },
    simpleSummary: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["submitted", "reviewed", "approved", "rejected"],
      default: "submitted",
      index: true,
    },
  },
  {
    collection: "cfm_file_changes",
    timestamps: true,
  }
);

module.exports = mongoose.model("CfmFileChange", cfmFileChangeSchema);

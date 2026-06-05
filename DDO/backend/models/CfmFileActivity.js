const mongoose = require("mongoose");

const cfmFileActivitySchema = new mongoose.Schema(
  {
    companyUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    companyId: { type: String, default: "", trim: true, index: true },
    workspaceId: { type: String, required: true, trim: true, index: true },
    filePath: { type: String, default: "", trim: true, index: true },
    fileName: { type: String, default: "", trim: true },
    action: {
      type: String,
      enum: ["opened", "edited", "saved", "added", "removed", "renamed", "moved"],
      default: "opened",
      index: true,
    },
    oldContent: { type: String, default: "" },
    newContent: { type: String, default: "" },
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 },
    simpleSummary: { type: String, default: "", trim: true },
    changedBy: { type: String, default: "", trim: true },
  },
  {
    collection: "cfm_file_activities",
    timestamps: true,
  }
);

module.exports = mongoose.model("CfmFileActivity", cfmFileActivitySchema);

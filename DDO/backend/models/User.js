const mongoose = require("mongoose");

// Normal platform users live in their own collection and keep role "user".
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "user" }
  },
  {
    collection: "users",
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);

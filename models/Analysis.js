const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({
  language: { type: String, required: true },
  originalCode: { type: String, required: true },
  fixedCode: { type: String },
  bugDescription: { type: String },
  bugLine: { type: String },
  explanation: { type: String },
  whatChanged: [String],
  severity: { type: String, enum: ["Low", "Medium", "High", "None"], default: "None" },
  hasBug: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Analysis", analysisSchema);

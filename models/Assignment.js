const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  img: { type: String, required: true },
  client: { type: String, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);

const express = require("express");
const router = express.Router();
const Model = require("../models/Model");
const protect = require("../middleware/authMiddleware");

// Get all unique model names
router.get("/", protect, async (req, res) => {
  try {
    const { q } = req.query;
    let filter = {};
    if (q) {
      filter = { name: new RegExp(q.trim(), "i") };
    }
    const models = await Model.find(filter).sort({ name: 1 });
    res.json(models);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new model name manually
router.post("/", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Model name is required" });

    const existing = await Model.findOne({ name });
    if (existing) return res.status(400).json({ message: "Model already exists" });

    const model = await Model.create({ name });
    res.status(201).json(model);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const { 
  lookupServiceHistory, 
  getServiceStats,
  createServiceRecord, 
  updateServiceRecord,
  deleteServiceRecord
} = require("../controllers/serviceController");
const protect = require("../middleware/authMiddleware");

// Get statistics for Service Tracker tiles
router.get("/stats", protect, getServiceStats);

// Look up a product's service history & warranty status
router.get("/history", lookupServiceHistory);

// Create a new service record (Store Accept)
router.post("/", protect, createServiceRecord);

// Update a service record (Store Send / Payment)
router.put("/:id", protect, updateServiceRecord);

// Delete a service record
router.delete("/:id", protect, deleteServiceRecord);

module.exports = router;

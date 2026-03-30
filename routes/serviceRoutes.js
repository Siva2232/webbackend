const express = require("express");
const router = express.Router();
const { 
  lookupServiceHistory, 
  createServiceRecord, 
  updateServiceRecord,
  deleteServiceRecord,
  getServiceStats,
  filterServiceRecords
} = require("../controllers/serviceController");
const protect = require("../middleware/authMiddleware");

// Look up a product's service history & warranty status
router.get("/history", lookupServiceHistory);

// Get service stats for tiles
router.get("/stats", protect, getServiceStats);

// Filter service records
router.get("/filter", protect, filterServiceRecords);

// Create a new service record (Store Accept)
router.post("/", protect, createServiceRecord);

// Update a service record (Store Send / Payment)
router.put("/:id", protect, updateServiceRecord);

// Delete a service record
router.delete("/:id", protect, deleteServiceRecord);

module.exports = router;

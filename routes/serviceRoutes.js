const express = require("express");
const router = express.Router();
const { 
  lookupServiceHistory, 
  createServiceRecord, 
  updateServiceRecord 
} = require("../controllers/serviceController");

// Look up a product's service history & warranty status
router.get("/history", lookupServiceHistory);

// Create a new service record (Store Accept)
router.post("/", createServiceRecord);

// Update a service record (Store Send / Payment)
router.put("/:id", updateServiceRecord);

module.exports = router;

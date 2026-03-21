const express = require("express");
const { body, param, query } = require("express-validator");
const router = express.Router();
const { 
  lookupServiceHistory, 
  createServiceRecord, 
  updateServiceRecord,
  deleteServiceRecord
} = require("../controllers/serviceController");
const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

// Look up a product's service history & warranty status
router.get(
  "/history",
  [
    query("serialNumber").optional().trim().escape(),
    query("modelNumber").optional().trim().escape(),
    query("q").optional().trim().escape(),
  ],
  validateRequest,
  lookupServiceHistory
);

// Create a new service record (Store Accept)
router.post(
  "/",
  protect,
  [
    body("customerName").trim().notEmpty().withMessage("Customer name is required"),
    body("phone").trim().isMobilePhone().withMessage("Valid phone number is required"),
    body("issueDescription").trim().notEmpty().withMessage("Issue description is required"),
    body("manualEntry").isBoolean().withMessage("manualEntry flag is required"),
  ],
  validateRequest,
  createServiceRecord
);

// Update a service record (Store Send / Payment)
router.put(
  "/:id",
  protect,
  [
    param("id").isMongoId().withMessage("Valid Service ID required"),
    body("status").optional().isIn(["Received","In Progress","Returned"]).withMessage("Invalid status"),
    body("priority").optional().isIn(["High","Medium","Low"]).withMessage("Invalid priority"),
  ],
  validateRequest,
  updateServiceRecord
);

// Delete a service record
router.delete(
  "/:id",
  protect,
  [param("id").isMongoId().withMessage("Valid Service ID required")],
  validateRequest,
  deleteServiceRecord
);

module.exports = router;

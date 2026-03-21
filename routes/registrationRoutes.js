const express = require("express");
const { body, param } = require("express-validator");
const router = express.Router();
const { registerWarranty, getRegistrations, updateRegistration, deleteRegistration, deleteRegistrations } = require("../controllers/registrationController");
const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

router.post(
  "/",
  [
    body("serialNumber").optional().trim().escape(),
    body("customerName").trim().notEmpty().withMessage("Customer name is required"),
    body("phone").trim().isMobilePhone().withMessage("Valid phone number is required"),
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("purchaseDate").optional().isISO8601().toDate().withMessage("Valid purchase date is required"),
  ],
  validateRequest,
  registerWarranty
);
router.get("/", protect, getRegistrations);
router.put(
  "/:id",
  protect,
  [
    param("id").isMongoId().withMessage("Valid registration id required"),
    body("phone").optional().isMobilePhone().withMessage("Valid phone number is required"),
    body("email").optional().isEmail().withMessage("Valid email is required"),
  ],
  validateRequest,
  updateRegistration
);
router.delete("/:id", protect, [param("id").isMongoId().withMessage("Valid registration id required")], validateRequest, deleteRegistration);
router.delete("/", protect, [body("ids").isArray({ min: 1 }).withMessage("IDs array is required")], validateRequest, deleteRegistrations);

module.exports = router;

const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const { createProduct, getProducts, getProductBySerial, bulkCreateProducts, deleteProduct, deleteProducts } = require("../controllers/productController");
const protect = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

router.post(
  "/",
  protect,
  [
    body("productName").trim().notEmpty().withMessage("Product name is required"),
    body("modelNumber").trim().notEmpty().withMessage("Model number is required"),
    body("serialNumber").trim().notEmpty().withMessage("Serial number is required"),
  ],
  validateRequest,
  createProduct
);
router.post(
  "/bulk",
  protect,
  [
    body("productName").trim().notEmpty().withMessage("Product name is required"),
    body("modelNumber").trim().notEmpty().withMessage("Model number is required"),
    body("prefix").trim().notEmpty().withMessage("Serial prefix is required"),
    body("count").isInt({ gt: 0 }).withMessage("Count must be an integer greater than zero"),
  ],
  validateRequest,
  bulkCreateProducts
);
router.get("/", protect, getProducts);
router.delete("/", protect, deleteProducts);
router.delete("/:id", protect, deleteProduct);
router.get("/:serial", getProductBySerial);

module.exports = router;

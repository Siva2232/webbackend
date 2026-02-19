const express = require("express");
const router = express.Router();
const { createProduct, getProducts, getProductBySerial } = require("../controllers/productController");
const protect = require("../middleware/authMiddleware");

router.post("/", protect, createProduct);
router.get("/", protect, getProducts);
router.get("/:serial", getProductBySerial);

module.exports = router;

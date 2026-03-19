const express = require("express");
const router = express.Router();
const { createProduct, getProducts, getProductBySerial, bulkCreateProducts, deleteProduct, deleteProducts } = require("../controllers/productController");
const protect = require("../middleware/authMiddleware");

router.post("/", protect, createProduct);
router.post("/bulk", protect, bulkCreateProducts);
router.get("/", protect, getProducts);
router.delete("/", protect, deleteProducts);
router.delete("/:id", protect, deleteProduct);
router.get("/:serial", getProductBySerial);

module.exports = router;

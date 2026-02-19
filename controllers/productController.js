const Product = require("../models/Product");
const generateQRCode = require("../utils/qrGenerator");

// Create Product + Generate QR
exports.createProduct = async (req, res) => {
  try {
    const { productName, serialNumber, manufactureDate, warrantyPeriodMonths } = req.body;

    // Check duplicate serial
    const existing = await Product.findOne({ serialNumber });
    if (existing) {
      return res.status(400).json({ message: "Serial number already exists" });
    }

    // Generate QR Code via utility
    const qrCodeUrl = await generateQRCode(serialNumber);

    const product = await Product.create({
      productName,
      serialNumber,
      manufactureDate,
      warrantyPeriodMonths,
      qrCodeUrl
    });

    res.status(201).json(product);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Product by Serial
exports.getProductBySerial = async (req, res) => {
  try {
    const product = await Product.findOne({ serialNumber: req.params.serial });
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const Product = require("../models/Product");
const generateQRCode = require("../utils/qrGenerator");

// Create Product + Generate QR
exports.createProduct = async (req, res) => {
  try {
    const { productName, modelNumber, serialNumber, manufactureDate, warrantyPeriodMonths } = req.body;

    // Check duplicate serial
    const existing = await Product.findOne({ serialNumber });
    if (existing) {
      return res.status(400).json({ message: "Serial number already exists" });
    }

    // Generate QR Code via utility
    const qrCodeUrl = await generateQRCode(serialNumber);

    const product = await Product.create({
      productName,
      modelNumber,
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

// Bulk Create Products
exports.bulkCreateProducts = async (req, res) => {
  try {
    const { productName, modelNumber, manufactureDate, warrantyPeriodMonths, prefix, startNumber, count } = req.body;
    
    const results = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      const currentNum = parseInt(startNumber) + i;
      const serialNumber = `${prefix}${currentNum}`;

      try {
        // Check duplicate
        const existing = await Product.findOne({ serialNumber });
        if (existing) {
          errors.push(`Serial ${serialNumber} already exists`);
          continue;
        }

        const qrCodeUrl = await generateQRCode(serialNumber);
        const product = await Product.create({
          productName,
          modelNumber,
          serialNumber,
          manufactureDate,
          warrantyPeriodMonths,
          qrCodeUrl
        });
        results.push(product);
      } catch (err) {
        errors.push(`Failed for ${serialNumber}: ${err.message}`);
      }
    }

    res.status(201).json({ 
      message: `Successfully created ${results.length} products`,
      products: results,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
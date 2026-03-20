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

    // Generate QR Code via utility (model + encoded serial token)
    const qrCodeUrl = await generateQRCode(serialNumber, modelNumber);

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
    const { page, limit, q } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const perPage = parseInt(limit, 10) || 0;

    const filter = {};
    if (q) {
      const text = q.trim();
      filter.$or = [
        { productName: new RegExp(text, "i") },
        { modelNumber: new RegExp(text, "i") },
        { serialNumber: new RegExp(text, "i") },
      ];
    }

    const query = Product.find(filter).sort({ createdAt: -1 });
    const total = await Product.countDocuments(filter);

    if (perPage > 0) {
      query.skip((pageNum - 1) * perPage).limit(perPage);
    }

    const products = await query.exec();

    if (perPage > 0) {
      return res.json({ data: products, total, page: pageNum, limit: perPage });
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Product by ID
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.deleteOne();
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete multiple products
exports.deleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No product IDs provided" });
    }

    const { deletedCount } = await Product.deleteMany({ _id: { $in: ids } });
    res.json({ message: `Deleted ${deletedCount} products`, deletedCount });
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
    const { productName, modelNumber, manufactureDate, warrantyPeriodMonths, prefix, count } = req.body;
    
    if (!productName || !modelNumber || !prefix || !count || count <= 0) {
      return res.status(400).json({ message: "All fields are required and count must be greater than zero." });
    }

    // Helper to separate alpha prefix and numeric suffix
    const parseSerial = (serial) => {
        // Case: prefix (non-digits) followed by suffix (digits)
        // If the whole string is digits, prefixStr is "" and startNum is the number.
        const match = String(serial).trim().match(/^(\D*)(\d+)$/);
        
        if (!match) {
          // If no digits at the end, treat entire serial as prefix and count from 0
          return { 
            prefixStr: String(serial).trim(), 
            startNum: 0, 
            isNumeric: false, 
            length: 0 
          };
        }

        return { 
            prefixStr: match[1], 
            startNum: parseInt(match[2], 10), 
            isNumeric: true, 
            length: match[2].length 
        };
    };

    const { prefixStr, startNum, isNumeric, length } = parseSerial(prefix);

    const results = [];
    const errors = [];
    const requestedCount = parseInt(count, 10);

    for (let i = 0; i < requestedCount; i++) {
      let currentSerial;
      
      if (isNumeric) {
         // If startNum is 100, first serial will be 100, then 101, etc.
         const nextNum = startNum + i; 
         currentSerial = `${prefixStr}${String(nextNum).padStart(length, '0')}`;
      } else {
         // Case: No trailing number found (e.g. "ABC"), append simple counter "ABC1"
         currentSerial = `${prefixStr}${i + 1}`;
      }

      try {
        // Check duplicate
        const existing = await Product.findOne({ serialNumber: currentSerial });
        if (existing) {
          errors.push(`Serial ${currentSerial} already exists`);
          continue;
        }

        const qrCodeUrl = await generateQRCode(currentSerial, modelNumber);
        const product = await Product.create({
          productName,
          modelNumber,
          serialNumber: currentSerial,
          manufactureDate,
          warrantyPeriodMonths,
          qrCodeUrl
        });
        results.push(product);
      } catch (err) {
        errors.push(`Failed for ${currentSerial}: ${err.message}`);
      }
    }

    if (results.length === 0) {
      return res.status(409).json({ 
        message: `No products created. All ${requestedCount} serials already exist or encountered errors.`,
        errors: errors 
      });
    }

    res.status(201).json({ 
      message: `Successfully created ${results.length} products.`,
      products: results,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
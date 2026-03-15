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
    
    // Helper to separate alpha prefix and numeric suffix
    const parseSerial = (serial) => {
        const match = serial.match(/^(\D*)(\d+)$/);
        if (!match) return { prefixStr: serial, startNum: 1, isNumeric: false };
        return { prefixStr: match[1], startNum: parseInt(match[2]), isNumeric: true, length: match[2].length };
    };

    const { prefixStr, startNum, isNumeric, length } = parseSerial(prefix);

    const results = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      let currentSerial;
      
      if (isNumeric || (prefixStr === "" && !isNaN(parseInt(prefix)))) {
         // Case: Pure number or ends in number
         const num = startNum + i;
         if (length && length > String(num).length) {
            // pad with leading zeros if original had them?
            // "001" -> "002".
             currentSerial = `${prefixStr}${String(num).padStart(length, '0')}`;
         } else {
             currentSerial = `${prefixStr}${num}`; 
         }
      } else {
         // Case: No trailing number found (e.g. "ABC"), append simple counter
         currentSerial = `${prefix}${i + 1}`;
      }

      // Special case: If user input purely "26051000" (prefix), loop i=0 gives 26051000.
      // But prompt says "if 26051000 ... generate 26051001 to 26051010".
      // This implies the input IS the first one? Or the input is the previous one?
      // "if 26051000 then max count 10 then generate 26051001 to 26051010"
      // Wait. If I input X, and get X+1...X+10. That means X is the BASE.
      // So first generated serial is X + 1.
      
      // Let's adjust logic based on "generate 26051001 to 26051010" when input is "26051000".
      // This means we start incrementing from 1.
      
      const nextNum = startNum + i + 1; // +1 because we want to start AFTER the provided number
      
      // Let's re-eval Logic.
      // User Input: 26051000.
      // Expected: 26051001.
      // My parseSerial("26051000") -> prefixStr="", startNum=26051000.
      // nextNum = 26051000 + 0 + 1 => 26051001. Correct.
      
      // User Input: SN-100.
      // Expected: SN-101?
      // parseSerial("SN-100") -> prefixStr="SN-", startNum=100.
      // nextNum = 100 + 0 + 1 => 101.
      // Result: SN-101.
      
      currentSerial = `${prefixStr}${String(nextNum).padStart(length || 0, '0')}`;

      try {
        // Check duplicate
        const existing = await Product.findOne({ serialNumber: currentSerial });
        if (existing) {
          errors.push(`Serial ${currentSerial} already exists`);
          continue;
        }

        const qrCodeUrl = await generateQRCode(currentSerial);
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

    res.status(201).json({ 
      message: `Successfully created ${results.length} products`,
      products: results,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
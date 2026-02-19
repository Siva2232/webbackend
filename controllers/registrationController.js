const Registration = require("../models/Registration");
const Product = require("../models/Product");

// Register Warranty
exports.registerWarranty = async (req, res) => {
  try {
    const { serialNumber, customerName, phone, email, purchaseDate } = req.body;

    const product = await Product.findOne({ serialNumber });
    if (!product) {
      return res.status(404).json({ message: "Invalid serial number" });
    }

    // Check duplicate registration
    const existing = await Registration.findOne({ serialNumber });
    if (existing) {
      return res.status(400).json({ message: "Warranty already registered" });
    }

    const purchase = new Date(purchaseDate);
    const today = new Date();

    const diffDays = (today - purchase) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return res.status(400).json({ message: "Registration allowed only within 7 days of purchase" });
    }

    const expiry = new Date(purchase);
    expiry.setMonth(expiry.getMonth() + (product.warrantyPeriodMonths || 12));

    let registration = await Registration.create({
      productId: product._id,
      serialNumber,
      customerName,
      phone,
      email,
      purchaseDate,
      expiryDate: expiry
    });

    // Populate product details for the certificate
    registration = await registration.populate("productId");

    res.status(201).json({ message: "Warranty Registered Successfully", registration });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Registrations (Admin)
exports.getRegistrations = async (req, res) => {
  try {
    const data = await Registration.find().populate("productId").sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
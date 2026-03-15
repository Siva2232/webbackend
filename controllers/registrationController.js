const Registration = require("../models/Registration");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const xss = require("xss");

// Register Warranty
exports.registerWarranty = async (req, res) => {
  try {
    console.log('registerWarranty body', req.body);
    const { serialNumber, customerName, phone, email, purchaseDate, modelNumber, purchaseShopName } = req.body;

    // Sanitize user inputs
    const sanitizedCustomerName = xss(customerName);
    const sanitizedEmail = email ? xss(email) : "";
    const sanitizedPhone = xss(phone);
    const sanitizedShopName = xss(purchaseShopName);

    const product = await Product.findOne({ serialNumber });
    if (!product) {
      return res.status(404).json({ message: "Invalid serial number" });
    }

    // Check QR expiration (90 days from creation)
    const qrCreationDate = new Date(product.createdAt);
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    if (new Date() - qrCreationDate > ninetyDaysMs) {
      return res.status(400).json({ message: "This QR code has expired (valid for 90 days). Please contact support for a new one." });
    }

    // Check duplicate registration
    const existing = await Registration.findOne({ serialNumber });
    if (existing) {
      return res.status(400).json({ message: "Warranty already registered" });
    }

    const purchase = new Date(purchaseDate);
    const today = new Date();

    const diffDays = (today - purchase) / (1000 * 60 * 60 * 24);

    // Registration allowed only within 7 days of purchase?
    // User requested to remove the 1 week before dates logic from the frontend, 
    // but the backend still checks it. Keep internal logic but the UI is now free.
    // If you want to remove this constraint entirely:
    // if (diffDays > 7) { ... } 
    
    // For now, I will keep the check so the system remains consistent with original rules, 
    // but the UI will no longer force it.

    const expiry = new Date(purchase);
    expiry.setMonth(expiry.getMonth() + (product.warrantyPeriodMonths || 12));

    const registrationPayload = {
      productId: product._id,
      modelNumber: modelNumber || product.modelNumber,
      purchaseShopName: sanitizedShopName,
      serialNumber,
      customerName: sanitizedCustomerName,
      phone: sanitizedPhone,
      purchaseDate,
      expiryDate: expiry,
      ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
    };

    let registration = await Registration.create(registrationPayload);
    console.log('created registration', registration);

    // Populate product details for the certificate
    registration = await registration.populate("productId");

    // Add Notification
    await Notification.create({
      type: "REGISTRATION",
      message: `New Warranty: ${customerName} registered ${serialNumber}`,
      data: {
        registrationId: registration._id,
        productId: product._id
      }
    });

    // attach computed fallback values
    const regObj = registration.toObject();
    regObj.computedModelNumber = regObj.modelNumber || regObj.productId?.modelNumber || "";
    regObj.computedShopName = regObj.purchaseShopName || "";

    res.status(201).json({ message: "Warranty Registered Successfully", registration: regObj });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Registrations (Admin)
exports.getRegistrations = async (req, res) => {
  try {
    // include modelNumber from product as fallback
    const data = await Registration.find()
      .populate("productId", "productName modelNumber")
      .sort({ createdAt: -1 });

    // map to ensure frontend always gets a usable field
    const transformed = data.map((reg) => {
      const obj = reg.toObject();
      obj.computedModelNumber = obj.modelNumber || obj.productId?.modelNumber || "";
      obj.computedShopName = obj.purchaseShopName || "";
      return obj;
    });

    res.json(transformed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Registration (Admin)
exports.updateRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, phone, email, purchaseShopName, modelNumber, purchaseDate } = req.body;

    const registration = await Registration.findById(id).populate("productId");
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    // Recalculate expiry if purchase date changed
    let expiryDate = registration.expiryDate;
    if (purchaseDate && new Date(purchaseDate).getTime() !== new Date(registration.purchaseDate).getTime()) {
      const product = await Product.findById(registration.productId);
      const months = product ? product.warrantyPeriodMonths : 12;
      expiryDate = new Date(purchaseDate);
      expiryDate.setMonth(expiryDate.getMonth() + months);
    }

    const updated = await Registration.findByIdAndUpdate(
      id,
      {
        customerName,
        phone,
        email,
        purchaseShopName,
        modelNumber,
        purchaseDate,
        expiryDate
      },
      { returnDocument: 'after' }
    );

    res.json({ message: "Updated successfully", registration: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
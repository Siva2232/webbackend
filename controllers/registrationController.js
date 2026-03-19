const Registration = require("../models/Registration");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const xss = require("xss");

// Register Warranty
exports.registerWarranty = async (req, res) => {
  try {
    console.log('registerWarranty body', req.body);
    const { serialNumber, customerName, phone, email, purchaseDate, modelNumber, purchaseShopName, carModelName, isManual } = req.body;

    // Sanitize user inputs
    const sanitizedCustomerName = xss(customerName);
    const sanitizedEmail = email ? xss(email) : "";
    const sanitizedPhone = xss(phone);
    const sanitizedShopName = xss(purchaseShopName);
    const sanitizedCarModel = carModelName ? xss(carModelName) : "";

    let product = null;
    let expiry = null;

    if (isManual) {
      // Manual customers have zero warranty claims and their count doesn't increment?
      // User says: "manual create customers have no waranty clian they have alwyas zero all time not increment te counts any time"
      // Setting expiry date to far past or just leaving it null/zeroed.
      // If we want no warranty, we can set expiry to the purchase date itself or a fixed old date.
      expiry = new Date(purchaseDate || new Date()); 
    } else {
      product = await Product.findOne({ serialNumber });
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

      expiry = new Date(purchaseDate);
      expiry.setMonth(expiry.getMonth() + (product.warrantyPeriodMonths || 12));
    }

    const registrationPayload = {
      productId: product ? product._id : null,
      isManual: Boolean(isManual),
      modelNumber: modelNumber || (product ? product.modelNumber : ""),
      purchaseShopName: sanitizedShopName,
      carModelName: sanitizedCarModel,
      serialNumber: serialNumber || "",
      customerName: sanitizedCustomerName,
      phone: sanitizedPhone,
      purchaseDate: purchaseDate || new Date(),
      expiryDate: expiry,
      ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
    };

    let registration = await Registration.create(registrationPayload);
    console.log('created registration', registration);

    if (product) {
      // Populate product details for the certificate
      registration = await registration.populate("productId");
    }

    // Add Notification
    await Notification.create({
      type: "REGISTRATION",
      message: `New ${isManual ? 'Manual ' : ''}Customer: ${customerName}${serialNumber ? ` registered ${serialNumber}` : ''}`,
      data: {
        registrationId: registration._id,
        productId: product ? product._id : null
      }
    });

    // attach computed fallback values
    const regObj = registration.toObject();
    regObj.computedModelNumber = regObj.modelNumber || (regObj.productId ? regObj.productId.modelNumber : "");
    regObj.computedShopName = regObj.purchaseShopName || "";

    res.status(201).json({ message: "Customer Registered Successfully", registration: regObj });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Registrations (Admin)
exports.getRegistrations = async (req, res) => {
  try {
    const { page, limit, q, status, dateFilter, startDate, endDate, isManual } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const perPage = parseInt(limit, 10) || 0;

    // Build search filters if provided
    const filter = {};
    if (q) {
      const text = q.trim();
      filter.$or = [
        { customerName: new RegExp(text, "i") },
        { serialNumber: new RegExp(text, "i") },
        { modelNumber: new RegExp(text, "i") },
        { purchaseShopName: new RegExp(text, "i") },
      ];
    }

    // Status filters (active / expired)
    const now = new Date();
    if (status === "active") {
      filter.expiryDate = { $gte: now };
    } else if (status === "expired") {
      filter.expiryDate = { $lt: now };
    }

    // Manual services
    if (isManual === "true") {
      filter.isManual = true;
    }

    // Date range filters (createdAt)
    if (dateFilter && dateFilter !== "all") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      let start = null;
      let end = null;

      if (dateFilter === "today") {
        start = startOfToday;
        end = new Date(startOfToday);
        end.setHours(23, 59, 59, 999);
      } else if (dateFilter === "yesterday") {
        start = new Date(startOfToday);
        start.setDate(start.getDate() - 1);
        end = new Date(startOfToday);
        end.setMilliseconds(-1);
      } else if (dateFilter === "week") {
        start = new Date(startOfToday);
        start.setDate(start.getDate() - 7);
        end = new Date(startOfToday);
        end.setHours(23, 59, 59, 999);
      } else if (dateFilter === "month") {
        start = new Date(startOfToday);
        start.setMonth(start.getMonth() - 1);
        end = new Date(startOfToday);
        end.setHours(23, 59, 59, 999);
      } else if (dateFilter === "year") {
        start = new Date(startOfToday);
        start.setFullYear(start.getFullYear() - 1);
        end = new Date(startOfToday);
        end.setHours(23, 59, 59, 999);
      } else if (dateFilter === "custom" && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      if (start && end) {
        filter.createdAt = { $gte: start, $lte: end };
      }
    }

    const query = Registration.find(filter)
      .populate("productId", "productName modelNumber")
      .lean()
      .sort({ createdAt: -1 });

    const total = await Registration.countDocuments(filter);

    // Compute global stats (across ALL registrations, ignoring pagination/search)
    // `now` is already defined above (used for status filtering) so reuse it here.
    // Get start of today. If the server is in GMT+5:30 (India), 00:00 local is 18:30 UTC previous day.
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    const [activeCount, expiredCount, newTodayCount, manualCount, totalAll] = await Promise.all([
      Registration.countDocuments({ expiryDate: { $gte: now } }),
      Registration.countDocuments({ expiryDate: { $lt: now } }),
      Registration.countDocuments({ createdAt: { $gte: startOfToday, $lte: endOfToday } }),
      Registration.countDocuments({ isManual: true }),
      Registration.countDocuments(),
    ]);

    if (perPage > 0) {
      query.skip((pageNum - 1) * perPage).limit(perPage);
    }

    const data = await query.exec();

    // map to ensure frontend always gets a usable field
    const transformed = data.map((reg) => {
      const obj = reg;
      obj.computedModelNumber = obj.modelNumber || (obj.productId ? obj.productId.modelNumber : "");
      obj.computedShopName = obj.purchaseShopName || "";
      return obj;
    });

    const statsObj = { totalAll, active: activeCount, expired: expiredCount, newToday: newTodayCount, manual: manualCount };

    if (perPage > 0) {
      return res.json({ data: transformed, total, page: pageNum, limit: perPage, stats: statsObj });
    }

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
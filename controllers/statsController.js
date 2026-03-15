const Product = require("../models/Product");
const Registration = require("../models/Registration");

exports.getStats = async (req, res) => {
  try {
    const [totalProducts, registeredWarranties] = await Promise.all([
      Product.countDocuments(),
      Registration.countDocuments()
    ]);

    res.json({
      totalProducts,
      registeredWarranties,
      activeWarranties: registeredWarranties
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRegistrations = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    let filter = {};
    if (startDate || endDate) {
      filter.registrationDate = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.registrationDate.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.registrationDate.$lte = end;
        }
      }
    }

    // Optimization: select only necessary fields and use lean() for faster JSON conversion
    const registrations = await Registration.find(filter)
      .select('customerName phone email serialNumber registrationDate productId')
      .populate("productId", "productName")
      .sort({ registrationDate: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json(registrations || []);
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: error.message });
  }
};

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
      if (startDate) filter.registrationDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.registrationDate.$lte = end;
      }
    }

    const registrations = await Registration.find(filter)
      .populate("productId", "productName")
      .sort({ registrationDate: -1 })
      .limit(parseInt(limit));

    res.json(registrations || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

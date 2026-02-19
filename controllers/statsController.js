const Product = require("../models/Product");
const Registration = require("../models/Registration");

exports.getStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const registeredWarranties = await Registration.countDocuments();
    
    // For "Active Warranties", we could filter registrations where warranty hasn't expired
    // But for a simple dashboard, these two are the main ones.
    const activeWarranties = registeredWarranties; 

    res.json({
      totalProducts,
      registeredWarranties,
      activeWarranties
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

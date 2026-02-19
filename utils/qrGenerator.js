const QRCode = require("qrcode");

const generateQRCode = async (serialNumber) => {
  try {
    // The URL where the customer will be directed
    // In production, this would be your real domain (e.g., https://yourwarrantyapp.com)
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const qrData = `${baseUrl}/customer-home?serial=${serialNumber}`;
    
    const qrImage = await QRCode.toDataURL(qrData);
    return qrImage;
  } catch (error) {
    throw new Error("QR generation failed");
  }
};

module.exports = generateQRCode;
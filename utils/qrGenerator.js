const QRCode = require("qrcode");

const generateQRCode = async (serialNumber) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || "https://warrantyweb.netlify.app";
    const qrData = `${baseUrl}/register-warranty?serial=${serialNumber}`;
    
    const qrImage = await QRCode.toDataURL(qrData, {
      width: 2048,
      margin: 0,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrImage;
  } catch (error) {
    throw new Error("QR generation failed");
  }
};

module.exports = generateQRCode;
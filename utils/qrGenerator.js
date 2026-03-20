const QRCode = require("qrcode");

const generateQRCode = async (serialNumber, modelNumber = "") => {
  try {
    const baseUrl = process.env.FRONTEND_URL || "https://warrantyweb.netlify.app";
    const encodedSerial = Buffer.from(String(serialNumber || "")).toString("base64");

    const params = new URLSearchParams();
    if (modelNumber) params.set("model", String(modelNumber));
    if (encodedSerial) params.set("s", encodedSerial);

    const qrData = `${baseUrl}/register-warranty?${params.toString()}`;

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
const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/register", require("./routes/registrationRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/service", require("./routes/serviceRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.get("/", (req, res) => {
  res.send("Warranty Tracker API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
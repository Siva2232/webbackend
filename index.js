const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });
connectDB();

const app = express();

app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 mins
  message: "Too many failed login attempts, please try again after 15 minutes",
});

// ============================
// CORS CONFIGURATION
// ============================

// ============================
// CORS CONFIGURATION
// ============================

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://warrantyweb.netlify.app",
  "http://localhost:5173",
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");

    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use("/api", limiter);
app.use("/api/auth/login", authLimiter);

// ============================

// Body parser
app.use(express.json({ limit: "10kb" }));

// Mongo sanitize
app.use((req, res, next) => {
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.params);
  mongoSanitize.sanitize(req.headers);
  mongoSanitize.sanitize(req.query);
  next();
});

// Prevent HTTP parameter pollution
app.use(hpp());

// ============================
// ROUTES
// ============================

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
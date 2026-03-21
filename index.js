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

// Remove identifying server header
app.disable("x-powered-by");

// Security headers (Helmet default plus stricter HSTS and CSP for API + SPA)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", process.env.VITE_API_URL || "https://webbackend-15d2.onrender.com"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
  })
);

// XSS sanitization (custom middleware — xss-clean is incompatible with Express 5)
const xssFilters = require("xss");
const sanitizeValue = (val) => {
  if (typeof val === "string") return xssFilters(val);
  if (val && typeof val === "object") {
    for (const key of Object.keys(val)) {
      val[key] = sanitizeValue(val[key]);
    }
  }
  return val;
};
app.use((req, _res, next) => {
  if (req.body) sanitizeValue(req.body);
  if (req.params) sanitizeValue(req.params);
  next();
});

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
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

// ============================

// Body parser
app.use(express.json({ limit: "10kb" }));

// Mongo sanitize (prevents query selector injection)
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Rate limit already applied on /api

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

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
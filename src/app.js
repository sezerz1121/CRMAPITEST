import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crmRouter from "./routes/crm.routes.js";
import { requireUser } from "./middleware/requireUser.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== "production" && allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new ApiError(403, "Origin is not allowed."));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "24kb" }));
app.use(express.urlencoded({ extended: true, limit: "24kb" }));
app.get("/health", (req, res) => res.json({ status: "ok", service: "callcraft-crm-api" }));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api", requireUser, crmRouter);
app.use((req, res, next) => next(new ApiError(404, "API route not found.")));
app.use((error, req, res, next) => {
  const status = Number(error.statusCode || error.status) || 500;
  if (status >= 500) console.error(error.message);
  res.status(status).json({ success: false, error: status >= 500 && process.env.NODE_ENV === "production" ? "Unexpected server error." : error.message || "Request failed." });
});
export { app };

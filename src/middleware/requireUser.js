import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { ApiError } from "../utils/ApiError.js";

function firebaseApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credential = serviceJson ? cert(JSON.parse(serviceJson)) : applicationDefault();
  return initializeApp({ credential, ...(projectId ? { projectId } : {}) });
}

async function requireUser(req, res, next) {
  if (process.env.AUTH_REQUIRED === "false") return next();
  try {
    const [scheme, token] = String(req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) throw new ApiError(401, "Sign in to use the CRM.");
    const decoded = await getAuth(firebaseApp()).verifyIdToken(token);
    const allowedEmail = String(process.env.ALLOWED_USER_EMAIL || "").trim().toLowerCase();
    if (!allowedEmail) throw new ApiError(503, "Server access is not configured.");
    if (String(decoded.email || "").toLowerCase() !== allowedEmail) throw new ApiError(403, "This account is not allowed to use the CRM.");
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Your sign-in expired. Sign in again."));
  }
}
export { requireUser };

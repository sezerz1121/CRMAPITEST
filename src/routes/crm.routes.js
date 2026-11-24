import { Router } from "express";
import { getLeadsController, updateLeadApproval, getCallLogsController, saveCallLogController } from "../controllers/crm.controllers.js";

const router = Router();
router.get("/leads", getLeadsController);
router.post("/lead-approval", updateLeadApproval);
router.get("/call-logs", getCallLogsController);
router.post("/call-logs", saveCallLogController);
router.get("/config", (req, res) => res.json({ placesConfigured: Boolean(process.env.PLACES_API_KEY), placesCap: Number(process.env.PLACES_DAILY_REQUEST_CAP || 30), cities: (process.env.PLACES_CITIES || "Quincy, MA|Lynn, MA|Fall River, MA").split("|"), niches: (process.env.PLACES_NICHES || "Plumber|HVAC contractor").split("|") }));
export default router;

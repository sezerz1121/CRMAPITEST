import { getLeads, setApproval, getCallLogs, saveCallLog } from "../services/sheets.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const getLeadsController = asyncHandler(async (req, res) => {
  const data = await getLeads();
  res.set("Cache-Control", "no-store").json(data);
});

const updateLeadApproval = asyncHandler(async (req, res) => {
  const sheetRow = Number(req.body?.sheetRow);
  const value = String(req.body?.value ?? "");
  if (!Number.isInteger(sheetRow) || sheetRow < 2) throw new ApiError(400, "A valid sheetRow is required.");
  if (!["", "Yes", "No", "Check till here"].includes(value)) throw new ApiError(400, "Choose Yes, No, or Check till here.");
  const result = await setApproval(sheetRow, value);
  res.json(result);
});

const getCallLogsController = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store").json({ logs: await getCallLogs() });
});

const saveCallLogController = asyncHandler(async (req, res) => {
  const leadId = String(req.body?.leadId ?? "").trim();
  const outcome = String(req.body?.outcome ?? "Not called").trim();
  const followUpAt = String(req.body?.followUpAt ?? "").trim();
  const notes = String(req.body?.notes ?? "");
  const outcomes = ["Not called", "No answer", "Left voicemail", "Connected", "Interested", "Follow-up", "Not interested"];
  if (!leadId) throw new ApiError(400, "leadId is required.");
  if (!outcomes.includes(outcome)) throw new ApiError(400, "Choose a valid call outcome.");
  if (followUpAt && !/^\d{4}-\d{2}-\d{2}$/.test(followUpAt)) throw new ApiError(400, "followUpAt must use YYYY-MM-DD format.");
  if (notes.length > 12000) throw new ApiError(400, "Call notes must be 12,000 characters or fewer.");
  await saveCallLog({ leadId, outcome, followUpAt, notes });
  res.json({ logs: await getCallLogs() });
});

export { getLeadsController, updateLeadApproval, getCallLogsController, saveCallLogController };

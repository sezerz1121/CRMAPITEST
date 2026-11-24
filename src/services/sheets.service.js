import axios from "axios";
import { GoogleAuth } from "google-auth-library";
import { ApiError } from "../utils/ApiError.js";

const SHEET_ID = () => process.env.SHEET_ID || "17EE42CkxDpM9p6m6-pXZ3mlUwVqLJsMPbTqX4XJndlw";
const LEADS_TAB = () => process.env.SHEET_TAB || "Leads";
const CALLS_TAB = () => process.env.CALLS_TAB || "CallActivity";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
let authClient;

function getAuth() {
  if (authClient) return authClient;
  const jsonText = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonText) {
    let credentials;
    try { credentials = JSON.parse(jsonText); }
    catch { throw new ApiError(500, "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON."); }
    authClient = new GoogleAuth({ credentials, scopes: [SHEETS_SCOPE] });
  } else {
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS || "service_account.json";
    authClient = new GoogleAuth({ keyFile, scopes: [SHEETS_SCOPE] });
  }
  return authClient;
}

async function authorizedRequest(method, path, data, params = {}) {
  try {
    const client = await getAuth().getClient();
    const tokenResult = await client.getAccessToken();
    const token = typeof tokenResult === "string" ? tokenResult : tokenResult.token;
    const response = await axios({
      method,
      url: `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID()}${path}`,
      data,
      params,
      timeout: 30000,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error.response?.data?.error?.message || error.message;
    throw new ApiError(error.response?.status === 403 ? 403 : 502, `Google Sheets request failed: ${message}`);
  }
}

function encodedRange(range) { return `/values/${encodeURIComponent(range)}`; }
async function readRange(range) {
  const result = await authorizedRequest("GET", encodedRange(range));
  return result.values || [];
}
async function writeRange(range, values) {
  return authorizedRequest("PUT", encodedRange(range), { values }, { valueInputOption: "RAW" });
}
function columnLetter(index) {
  let value = index + 1;
  let output = "";
  while (value > 0) { const digit = (value - 1) % 26; output = String.fromCharCode(65 + digit) + output; value = Math.floor((value - 1) / 26); }
  return output;
}

async function getLeads() {
  const grid = await readRange(`${LEADS_TAB()}!A:ZZ`);
  const headers = grid[0] || [];
  const rows = grid.slice(1).map((cells, index) => {
    const row = Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""]));
    row.__sheetRow = index + 2;
    return row;
  }).filter(row => headers.some(header => String(row[header] ?? "").trim()));
  return { headers, rows };
}

async function setApproval(sheetRow, value) {
  const grid = await readRange(`${LEADS_TAB()}!A:ZZ`);
  const headers = grid[0] || [];
  const column = headers.indexOf("Approved by Me");
  if (column < 0) throw new ApiError(400, 'The Leads sheet is missing the "Approved by Me" column.');
  if (sheetRow >= grid.length + 1) throw new ApiError(404, "Lead row not found.");
  const range = `${LEADS_TAB()}!${columnLetter(column)}${sheetRow}`;
  await writeRange(range, [[value]]);
  return { sheetRow, value };
}

async function ensureCallsTab() {
  const metadata = await authorizedRequest("GET", "", undefined, { fields: "sheets.properties(sheetId,title)" });
  const sheets = metadata.sheets || [];
  if (!sheets.some(sheet => sheet.properties?.title === CALLS_TAB())) {
    await authorizedRequest("POST", ":batchUpdate", { requests: [{ addSheet: { properties: { title: CALLS_TAB(), gridProperties: { rowCount: 5000, columnCount: 5 } } } }] });
  }
  const values = await readRange(`${CALLS_TAB()}!A1:E1`);
  const headers = ["Lead ID", "Outcome", "Follow-up date", "Notes", "Updated at"];
  if (!values.length) await writeRange(`${CALLS_TAB()}!A1:E1`, [headers]);
}

async function getCallLogs() {
  await ensureCallsTab();
  const grid = await readRange(`${CALLS_TAB()}!A:E`);
  const logs = {};
  for (const row of grid.slice(1)) {
    if (!row[0]) continue;
    logs[String(row[0])] = { outcome: row[1] || "Not called", followUpAt: row[2] || "", notes: row[3] || "", updatedAt: row[4] || "" };
  }
  return logs;
}

async function saveCallLog({ leadId, outcome, followUpAt, notes }) {
  await ensureCallsTab();
  const grid = await readRange(`${CALLS_TAB()}!A:E`);
  const existingIndex = grid.findIndex((row, index) => index > 0 && String(row[0]) === String(leadId));
  const sheetRow = existingIndex > 0 ? existingIndex + 1 : Math.max(2, grid.length + 1);
  const values = [[String(leadId), outcome, followUpAt, notes, new Date().toISOString()]];
  await writeRange(`${CALLS_TAB()}!A${sheetRow}:E${sheetRow}`, values);
  return { leadId: String(leadId), ...Object.fromEntries([["outcome", outcome], ["followUpAt", followUpAt], ["notes", notes], ["updatedAt", values[0][4]]]) };
}

export { getLeads, setApproval, getCallLogs, saveCallLog };

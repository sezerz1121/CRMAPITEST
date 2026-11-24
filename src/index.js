import "dotenv/config";
import { app } from "./app.js";

const port = Number(process.env.PORT || 3000);
if (process.env.VERCEL !== "1") {
  app.listen(port, "0.0.0.0", () => console.log(`Callcraft CRM API listening on port ${port}`));
}
export default app;

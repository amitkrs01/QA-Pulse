import path from "path";
import app from "./app";

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "..", "..", "frontend", "dist");
  const express = require("express");
  app.use(express.static(frontendPath));
  app.get("*", (_req: any, res: any) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`QA Pulse running on http://localhost:${PORT}`);
});

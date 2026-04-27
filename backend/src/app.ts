import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import projectRoutes from "./routes/projects";
import moduleRoutes from "./routes/modules";
import dashboardRoutes from "./routes/dashboard";
import auditRoutes from "./routes/audit";
import { authenticate } from "./middleware/auth";
import { requireProjectAccess } from "./middleware/projectAccess";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({
  origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((o) => o.trim()),
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/setup-seed", async (req, res) => {
  const secret = req.query.key;
  if (secret !== process.env.SEED_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { execSync } = await import("child_process");
    execSync("npx prisma db push --skip-generate", { cwd: process.cwd(), stdio: "pipe" });

    const bcrypt = await import("bcryptjs");
    const { default: prisma } = await import("./lib/prisma");

    const adminEmail = "admin@qapulse.com";
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      admin = await prisma.user.create({
        data: { name: "Admin", email: adminEmail, passwordHash, role: "ADMIN", mustResetPassword: true },
      });
    }

    let project = await prisma.project.findUnique({ where: { code: "DEMO" } });
    if (!project) {
      project = await prisma.project.create({ data: { name: "Demo Project", code: "DEMO" } });
    }

    const adminMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: admin.id } },
    });
    if (!adminMember) {
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: admin.id, role: "ADMIN" },
      });
    }

    const moduleCount = await prisma.module.count({ where: { projectId: project.id } });
    if (moduleCount === 0) {
      const modules = ["User Authentication", "Payment Gateway", "User Profile", "Notifications", "Reports Module"];
      for (const name of modules) {
        await prisma.module.create({
          data: {
            name, projectId: project.id,
            beDetailedStatus: "NOT_STARTED", bePhase: "PREPARATION",
            feDetailedStatus: "NOT_STARTED", fePhase: "PREPARATION",
            overallPhase: "PREPARATION",
          },
        });
      }
    }

    res.json({ success: true, message: "Database seeded. Admin: admin@qapulse.com / admin123" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Seed failed", details: message });
  }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/modules", authenticate, requireProjectAccess, moduleRoutes);
app.use("/api/projects/:projectId/dashboard", authenticate, requireProjectAccess, dashboardRoutes);
app.use("/api/audit-logs", auditRoutes);

export default app;

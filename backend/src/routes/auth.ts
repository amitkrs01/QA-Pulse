import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma";
import { generateToken, authenticate, extractIp } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { sendPasswordResetEmail } from "../lib/email";

const router = Router();

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  await logAudit({
    userId: user.id,
    action: "user.login",
    entity: "user",
    entityId: user.id,
    ipAddress: extractIp(req),
  });

  const projects = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: { project: { select: { id: true, name: true, code: true } } },
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, mustResetPassword: user.mustResetPassword },
    projects: projects.map((pm) => ({ ...pm.project, memberRole: pm.role })),
  });
});

router.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
  const projects = await prisma.projectMember.findMany({
    where: { userId: req.user!.id },
    include: { project: { select: { id: true, name: true, code: true } } },
  });

  res.json({
    user: req.user,
    projects: projects.map((pm) => ({ ...pm.project, memberRole: pm.role })),
  });
});

router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    // Don't reveal if user exists
    res.json({ message: "If an account exists, a reset email has been sent." });
    return;
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  await sendPasswordResetEmail(user.email, user.name, token);

  res.json({ message: "If an account exists, a reset email has been sent." });
});

router.post("/change-password", authenticate, async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustResetPassword: false },
    select: { id: true, email: true, name: true, role: true, mustResetPassword: true },
  });

  await logAudit({
    userId: user.id,
    action: "user.change_password",
    entity: "user",
    entityId: user.id,
    ipAddress: req.clientIp,
  });

  res.json({ message: "Password changed successfully", user: updated });
});

router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash, mustResetPassword: false },
  });

  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { used: true },
  });

  await logAudit({
    userId: resetToken.userId,
    action: "user.password_reset",
    entity: "user",
    entityId: resetToken.userId,
    ipAddress: extractIp(req),
  });

  res.json({ message: "Password reset successful" });
});

export default router;

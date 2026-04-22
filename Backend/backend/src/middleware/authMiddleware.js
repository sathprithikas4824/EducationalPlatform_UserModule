import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set. Server cannot start.");
}
const SECRET_KEY = process.env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

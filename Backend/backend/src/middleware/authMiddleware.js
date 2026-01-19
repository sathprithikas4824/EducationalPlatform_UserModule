// [src/middleware/authMiddleware.js] - Ensure this file exists and is correct
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";

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
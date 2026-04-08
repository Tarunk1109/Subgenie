import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const viewProtect = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      res.clearCookie("token");
      return res.redirect("/login");
    }
    next();
  } catch {
    res.clearCookie("token");
    return res.redirect("/login");
  }
};

export const injectUser = async (req, res, next) => {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch {
      req.user = null;
    }
  }
  next();
};

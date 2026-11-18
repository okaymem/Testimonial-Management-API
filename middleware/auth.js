const jwt = require("jsonwebtoken");
const { sendError } = require("../lib/constants");

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, {
        code: 401,
        message: "Authorization token is missing or malformed"
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return sendError(res, { code: 401, message: "Authorization token is missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, { code: 401, message: "Authorization token has expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return sendError(res, { code: 401, message: "Authorization token is invalid" });
    }
    console.error(error);
    return sendError(res, { code: 401, message: "Not authorized" });
  }
};

module.exports = auth;

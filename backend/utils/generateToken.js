const jwt = require("jsonwebtoken");

/*
 * WHY A SEPARATE UTILITY FILE?
 * Instead of writing JWT logic in every controller,
 * we write it once here and reuse it everywhere.
 * This follows the DRY principle: Don't Repeat Yourself.
 *
 * WHY HTTPONLY COOKIES?
 * We send the JWT as a cookie, not in the response body.
 * HttpOnly means JavaScript in the browser CANNOT read this cookie.
 * This protects against XSS attacks where malicious scripts
 * try to steal tokens from localStorage.
 *
 * Flow:
 * 1. User logs in → server creates JWT → sends as HttpOnly cookie
 * 2. Browser stores cookie automatically
 * 3. Every future request → browser sends cookie automatically
 * 4. Server reads cookie → verifies JWT → identifies user
 */

const generateTokenAndSetCookie = (res, userId) => {
  /*
   * jwt.sign(payload, secret, options)
   * - payload: data embedded inside the token (we store userId)
   * - secret: a private key only the server knows
   * - expiresIn: how long the token is valid
   */
  const token = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  /*
   * res.cookie(name, value, options)
   * - httpOnly: true → JS cannot access this cookie (XSS protection)
   * - secure: true in production → only sent over HTTPS
   * - sameSite: "strict" → only sent to our own domain (CSRF protection)
   * - maxAge: how long cookie lives in milliseconds (7 days here)
   */
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return token;
};

module.exports = generateTokenAndSetCookie;
// utils/

// Contains reusable helper functions.


// Complete Request Flow

// Suppose user logs in.

// Step 1

// Frontend:

// POST /login
// Step 2

// Route receives request

// router.post(
//   "/login",
//   validateLogin,
//   loginUser
// );
// Step 3

// Validator checks data

// Email present?
// Password present?
// Step 4

// Controller runs

// loginUser()
// Step 5

// Controller uses Model

// User.findOne(...)
// Step 6

// Model talks to MongoDB

// Find user
// Step 7

// Controller gets result

// Step 8

// ApiResponse sends response

// {
//   "success": true,
//   "message": "Login Successful"
// }



class ApiResponse {
  static success(res, statusCode = 200, message = "Success", data = {}) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res, statusCode = 500, message = "Internal Server Error") {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}

module.exports = ApiResponse;

# FreelanceHub MERN Stack Interview Guide
## Complete Deep Dive for Technical Interviews
---

## Part 1: Project Overview
### What is FreelanceHub?
FreelanceHub is a full-stack MERN application:
- **Platform**: Freelancer marketplace connecting clients and freelancers
- **Trust Mechanism**: Escrow payments using Stripe
- **Real-time**: Socket.io for instant messaging
- **Security**: JWT, HTTP-only cookies, bcrypt, role-based access control

### Tech Stack
- **Frontend**: React, React Router, Tailwind CSS, React Query, Sonner (toasts), Axios
- **Backend**: Node.js, Express, JWT, bcrypt, Socket.io, Mongoose, Zod (validation), Stripe, Cloudinary, Multer
- **Database**: MongoDB Atlas
- **Deployment**: Vercel (frontend), Render (backend)

---

## Part 2: Architecture & Request Flow
### Full Request-Response Lifecycle
1. **User Action**: Frontend button click (e.g., submit login form)
2. **API Call**: Frontend uses axiosInstance to call `/api/auth/login`
3. **Backend Router**: routes/index.js maps `/api/auth` to authRoutes.js
4. **Middleware**: `protect` middleware verifies JWT (if needed)
5. **Controller**: authController.login() validates input, checks password
6. **Service/Model**: Mongoose uses User model to interact with MongoDB
7. **Response**: Controller sends JSON back → frontend updates UI

---

## Part 3: Folder Structure
```
Lancr/
├── backend/
│   ├── config/         (db.js, cloudinary.js, stripe.js)
│   ├── controllers/    (auth, job, bid, contract, etc.)
│   ├── models/         (User, Job, Bid, Contract, etc.)
│   ├── routes/         (index.js, authRoutes.js, etc.)
│   ├── services/       (contractService.js for transactions)
│   ├── utils/          (generateToken.js)
│   ├── validators/     (Zod schemas)
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/        (axiosInstance, jobApi, etc.)
│   │   ├── components/ (Navbar, ProtectedRoute, etc.)
│   │   ├── context/    (AuthContext.jsx)
│   │   ├── pages/      (Landing, Login, Dashboard, etc.)
│   │   └── App.jsx
│   └── package.json
└── package.json
```

---

## Part 4: Key Files (Quick Reference)
- **server.js**: Express server setup, CORS, Socket.io
- **db.js**: MongoDB connection
- **contractService.js**: ACID transactions
- **authMiddleware.js**: protect & restrictTo middlewares
- **generateToken.js**: JWT cookie creation
- **contractApi.js**: Frontend API functions for contracts

---

## Part 5: Database Schemas (Deep Dive)
### 5.1 User Schema (`/backend/models/User.js`)
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxLength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minLength: 6 },
  role: { type: String, enum: ["client", "freelancer", "admin"], default: "client" },
  avatar: { type: String, default: "" },
  bio: { type: String, maxLength: 500, default: "" },
  skills: { type: [String], default: [] },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: true }
}, { timestamps: true });

// Pre-save hook: hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```
- **Indexes**: `email` has **unique index** (automatically created by `unique: true`)
- **Interview Q**: Why 12 salt rounds?
  - Answer: Balance between security and performance; 12 rounds take ~100ms per hash
- **Interview Q**: Why `isModified("password")` in pre-save hook?
  - Answer: Avoid re-hashing password if user only updates name/email

---

### 5.2 Job Schema (`/backend/models/Job.js`)
```javascript
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 2000 },
  budget: { type: Number, required: true, min: 1 },
  skillsRequired: { type: [String], default: [] },
  status: { type: String, enum: ["open", "assigned", "under_review", "completed", "archived"], default: "open" },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });
```
- **Indexes**: **NONE** beyond the default `_id` index
- **Relationships**: `postedBy` and `assignedTo` reference User model
- **Interview Q**: Why `min:1` on budget?
  - Answer: Prevent zero-amount jobs

---

### 5.3 Bid Schema (`/backend/models/Bid.js`)
```javascript
const bidSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true, min: 1 },
  coverLetter: { type: String, maxLength: 1000, default: "" },
  status: { type: String, enum: ["pending", "accepted", "rejected", "countered"], default: "pending" },
  lastOfferBy: { type: String, enum: ["client", "freelancer"], default: "freelancer" },
  negotiationHistory: { type: [Object], default: [] }
}, { timestamps: true });
```
- **Indexes**: Compound index on `{ job: 1, freelancer: 1 }` to prevent duplicate bids from same freelancer on same job
- **Interview Q**: Why compound index?
  - Answer: Faster queries for "all bids on job X" or "all bids by freelancer Y"; ensures uniqueness constraint

---

### 5.4 Contract Schema (`/backend/models/Contract.js`)
```javascript
const contractSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  agreedAmount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["pending_payment", "funded", "under_review", "refund_requested", "completed", "refunded"], default: "pending_payment" },
  stripePaymentIntentId: { type: String, default: "" },
  deliveryFile: { type: String, default: "" },
  refundReason: { type: String, default: "" },
  refundRequestedAt: { type: Date, default: null },
  adminDecision: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  adminNotes: { type: String, default: "" }
}, { timestamps: true });
```
- **Stripe-related fields**: ONLY `stripePaymentIntentId` (no other Stripe fields)
- **Status Flow**: pending_payment → funded → under_review → completed
- **Interview Q**: Why separate Contract from Job?
  - Answer: Separation of concerns; a Job can have many Bids but only one Contract; Contract needs escrow-specific fields

---

### 5.5 Review Schema (`/backend/models/Review.js`)
```javascript
const reviewSchema = new mongoose.Schema({
  contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract", required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxLength: 500, default: "" }
}, { timestamps: true });

// Compound unique index: one review per contract per reviewer
reviewSchema.index({ contract: 1, reviewer: 1 }, { unique: true });
```
- **Indexes**: Compound unique index `{ contract: 1, reviewer: 1 }`
- **Interview Q**: Why unique index on contract+reviewer?
  - Answer: Prevent a client from reviewing same freelancer multiple times for same contract

---

### 5.6 Conversation & Message Schemas
- **Conversation**: `participants: [ObjectId]` (ref User), `lastMessage: ObjectId` (ref Message)
- **Message**: `conversationId: ObjectId` (ref Conversation), `senderId: ObjectId` (ref User), `content: String`

---

## Part 6: Transactions (Deep Dive)
### 6.1 createContractFromBid (`/backend/services/contractService.js`)
```javascript
const createContractFromBid = async (bid, clientUserId) => {
  let session = null;
  let newContract = null;

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      [newContract] = await Contract.create([
        { job: bid.job._id, client: clientUserId, freelancer: bid.freelancer, agreedAmount: bid.amount }
      ], { session });

      await Bid.findByIdAndUpdate(
        bid._id,
        { $set: { status: "accepted" } },
        { session, new: true }
      );

      await Job.findByIdAndUpdate(
        bid.job._id,
        { $set: { status: "assigned", assignedTo: bid.freelancer } },
        { session, new: true }
      );

      await Bid.updateMany(
        { job: bid.job._id, _id: { $ne: bid._id }, status: { $in: ["pending", "countered"] } },
        { $set: { status: "rejected" } },
        { session }
      );
    });

    await newContract.populate("job client freelancer");
    return { success: true, contract: newContract };
  } catch (error) {
    console.error("createContractFromBid transaction failed:", error);
    return { success: false, error: error.message };
  } finally {
    if (session) await session.endSession();
  }
};
```
- **Transaction Pattern**: Uses `session.withTransaction()` (auto commits if no errors, aborts if any error)
- **What would happen WITHOUT transaction?**:
  1. If Bid update succeeds but Job update fails: Bid is accepted but Job is still open, allowing another bid to be accepted → duplicate contracts!
  2. If other Bids aren't rejected: Multiple freelancers could think their bid is accepted
- **Interview Q**: Why use `withTransaction()` instead of manual start/commit/abort?
  - Answer: `withTransaction()` automatically retries transient errors, commits if no errors, aborts on exceptions; less boilerplate, more reliable
- **Interview Q**: Why `session.endSession()` in finally block?
  - Answer: Ensure session is closed even if transaction throws an error
- **Interview Q**: How would you explain this transaction to a non-technical person?
  - Answer: It's like saying "all 4 of these things must happen together: create contract, mark bid accepted, mark job assigned, reject other bids. If any fails, undo everything."

---

### 6.2 releaseFunds (`/backend/controllers/contractController.js`)
```javascript
const releaseFunds = async (req, res) => {
  let session = null;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const contract = await Contract.findById(req.params.contractId).session(session);
      if (!contract) throw new Error("Contract not found");
      if (contract.status !== "under_review") throw new Error("Contract not under review");
      if (contract.client.toString() !== req.user._id.toString()) throw new Error("Not authorized");

      contract.status = "completed";
      await contract.save({ session });

      const job = await Job.findById(contract.job).session(session);
      job.status = "completed";
      await job.save({ session });
    });

    return res.status(200).json({
      success: true,
      message: "Funds released successfully! Contract completed."
    });
  } catch (error) {
    console.error("releaseFunds error:", error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};
```
- **Transaction Pattern**: `session.withTransaction()`
- **What would happen WITHOUT transaction?**:
  - If contract is marked completed but job update fails: Contract says done but job says under review → inconsistent state
- **Interview Q**: Why check authorization inside transaction?
  - Answer: Even though `protect` middleware checks auth, checking inside transaction ensures the user is still the client for this specific contract at the time of transaction

---

### 6.3 approveRefund & rejectRefund (`/backend/controllers/adminController.js`)
```javascript
// Approve refund
const approveRefund = async (req, res) => {
  let session = null;

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const contract = await Contract.findById(req.params.contractId).session(session);
      if (!contract) throw new Error("Contract not found");
      if (contract.status !== "refund_requested") throw new Error("No refund requested");

      contract.status = "refunded";
      contract.adminDecision = "approved";
      contract.adminNotes = req.body.adminNotes || "";
      contract.refundReviewedAt = new Date();
      await contract.save({ session });

      const job = await Job.findById(contract.job).session(session);
      job.status = "archived";
      await job.save({ session });
    });

    return res.status(200).json({ success: true, message: "Refund approved successfully" });
  } catch (error) {
    console.error("approveRefund error:", error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};

// Reject refund
const rejectRefund = async (req, res) => {
  let session = null;

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const contract = await Contract.findById(req.params.contractId).session(session);
      if (!contract) throw new Error("Contract not found");
      if (contract.status !== "refund_requested") throw new Error("No refund requested");

      contract.status = "under_review";
      contract.adminDecision = "rejected";
      contract.adminNotes = req.body.adminNotes || "";
      contract.refundReviewedAt = new Date();
      await contract.save({ session });
    });

    return res.status(200).json({ success: true, message: "Refund rejected successfully" });
  } catch (error) {
    console.error("rejectRefund error:", error);
    return res.status(400).json({ success: false, message: error.message });
  } finally {
    if (session) await session.endSession();
  }
};
```
- **Transaction Pattern**: Both use `session.withTransaction()`
- **What would happen WITHOUT transaction?**:
  - If contract is updated but job fails: Contract is refunded but job is still under_review → inconsistent state

---

## Part 7: Authentication Deep Dive
### 7.1 generateTokenAndSetCookie (`/backend/utils/generateToken.js`)
```javascript
const jwt = require("jsonwebtoken");

const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return token;
};

module.exports = { generateTokenAndSetCookie };
```
- **Interview Q**: Why HTTP-only cookie instead of localStorage?
  - Answer: localStorage is accessible via JavaScript, vulnerable to XSS attacks; HTTP-only cookies can't be read by JS
- **Interview Q**: Why `sameSite: "none"` in production?
  - Answer: Frontend is on Vercel (different domain) and backend on Render; `sameSite: "none"` allows cross-site cookies (requires `secure: true`)
- **Interview Q**: You're not using CSRF tokens — you're using sameSite: none for cross-origin cookies. Isn't that less secure? How do you defend that choice, and what's the residual risk?
  - Answer: Great question! Here's the defense:
    1. We use `sameSite: "none"` **only in production**, and it's paired with `secure: true` (cookies only sent over HTTPS)
    2. We have strict CORS configuration in server.js with allowed origins and `credentials: true`
    3. HTTP-only cookies prevent XSS from stealing the token
    - Residual risk: CSRF attacks are still theoretically possible, but with our setup (single-page app, no HTML forms that submit cross-site), the risk is minimized. For a production app with higher security needs, we would add CSRF tokens (e.g., using csurf middleware)

---

### 7.2 protect Middleware (`/backend/middlewares/authMiddleware.js`)
```javascript
const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) return res.status(401).json({ success: false, message: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.error("protect middleware error:", error);
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};
```
- **Line-by-line**:
  1. Reads `jwt` cookie from request
  2. If no token → 401
  3. Verifies JWT with secret
  4. Finds user (excludes password with `.select("-password")`)
  5. If no user → 401
  6. Attaches user to `req.user`
  7. Calls `next()` to proceed to controller

---

### 7.3 restrictTo Middleware
```javascript
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission for this action"
      });
    }
    next();
  };
};
```
- **Example usage**: `router.post("/jobs", protect, restrictTo("client"), createJob)`
- **Interview Q**: Why is restrictTo a function that returns a middleware?
  - Answer: To accept arguments (roles array) and create a custom middleware function for each route

---

### 7.4 authController.js
```javascript
const register = async (req, res) => {
  // Validate with Zod
  // Check if user exists
  // Create user
  // Generate JWT cookie
  // Return user
};

const login = async (req, res) => {
  // Validate
  // Find user with password
  // Compare password
  // Generate cookie
  // Return user
};

const logout = async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
  });
  return res.status(200).json({ success: true, message: "Logged out" });
};

const getMe = async (req, res) => {
  return res.status(200).json({ success: true, data: { user: req.user } });
};
```

---

## Part 8: Feature Workflows (NEW)
### 8.1 Job Posting Workflow
**Purpose**: Allow clients to post new jobs for freelancers to bid on

**Complete Workflow**:
1. **Frontend Action**: Client fills out PostJobPage form and clicks "Post Job"
2. **API Call**: `createJob()` from `jobApi.js` sends POST to `/api/jobs` with title, description, budget, skillsRequired
3. **Backend Route**: `router.post("/", protect, restrictTo("client"), createJob)` in jobRoutes.js
4. **Middleware**: `protect` checks auth, `restrictTo("client")` ensures role
5. **Controller**: `jobController.createJob()`:
   - Validates request body with Zod schema
   - Creates new Job with `postedBy: req.user._id`
   - Sends 201 response with job data
6. **Database**: Job saved to MongoDB
7. **Response**: Frontend gets success response
8. **UI Update**:
   - Sonner toast shows "Job posted successfully!"
   - React Query invalidates "jobs" and "myJobs" caches
   - Navigates to job detail page

**Interview Q&A for Job Posting**:
- **Q**: Why use Zod validation on the backend when frontend already validates?
  - A: Never trust the frontend! Users can bypass frontend validation (e.g., using Postman), so backend validation is mandatory for security and data integrity
- **Q**: How do you prevent a client from posting a job with a zero budget?
  - A: The Job schema has `budget: { min: 1 }`, and createJobSchema Zod validator also enforces min: 1
- **Q**: Why do we invalidate React Query caches after creating a job?
  - A: To force a re-fetch of job data so the new job appears in the job feed and client dashboard immediately
- **Q**: What happens if a freelancer tries to call the POST /api/jobs endpoint?
  - A: The restrictTo("client") middleware returns 403 Forbidden
- **Q**: Why use timestamps in the Job schema?
  - A: To track when jobs are posted and updated; helpful for sorting (newest first)

---

### 8.2 Bidding & Negotiation Workflow
**Purpose**: Freelancers submit bids on open jobs; clients can accept, reject, or counter-offer; freelancers can respond to counter-offers

**Complete Workflow (Submit Bid)**:
1. **Frontend**: Freelancer fills out bid form on JobDetailPage, clicks "Submit Bid"
2. **API Call**: `submitBid()` from `bidApi.js` sends POST to `/api/bids`
3. **Backend**:
   - `protect` + `restrictTo("freelancer")` middleware
   - Checks if job exists and is open
   - Prevents client from bidding on own job
   - Checks for existing active bid from same freelancer
   - Creates Bid and populates freelancer data
4. **UI Update**: Shows success toast, updates bids list

**Interview Q&A for Bidding**:
- **Q**: How do we prevent a freelancer from bidding multiple times on same job?
  - A: We check for existing bids with `status: pending/accepted/countered` before creating new bid; also, compound index on `{ job: 1, freelancer: 1 }` adds DB-level uniqueness
- **Q**: What's the purpose of `negotiationHistory` in the Bid schema?
  - A: To track all counter-offers (amount, message, who offered, timestamp) for audit trail and display
- **Q**: Why do we use `line-clamp-3` on job description in JobCard?
  - A: To keep job cards uniform height in the grid
- **Q**: How does pagination work in the job feed?
  - A: Frontend sends `page` and `limit` query params; backend uses `skip` and `limit` in MongoDB query; returns total pages

---

### 8.3 Contract Lifecycle & Stripe Escrow Workflow
**Purpose**: Escrow payments ensure clients pay upfront and freelancers get paid only after work is approved

**Complete Stripe Payment Flow**:
1. **Client Action**: On ContractDetailPage, clicks "Fund Contract"
2. **API Call**: `createPaymentIntent()` in paymentController:
   - Finds contract, verifies client ownership and pending_payment status
   - Creates Stripe PaymentIntent with `amount = agreedAmount * 100` (Stripe uses cents)
   - Attaches `contractId` and `clientId` to PaymentIntent metadata
   - Saves `paymentIntent.id` to Contract
   - Returns `clientSecret` to frontend
3. **Frontend**: Uses Stripe Elements with clientSecret to collect card details
4. **Stripe Webhook**: After successful payment, Stripe sends POST to `/api/payments/webhook`
   - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
   - If `event.type === "payment_intent.succeeded"`:
     - Updates Contract status to "funded"
     - Freelancer can now start work
5. **Milestones**: Freelancer submits work via `submitWork()` (uploads file to Cloudinary, contract status to under_review)
6. **Client Decision**: Client can request revision (back to funded) or release funds (triggers transaction)
7. **Refunds**: Client can request refund → admin approves/rejects via transaction

**Interview Q&A for Stripe**:
- **Q**: Why does Stripe use cents instead of dollars?
  - A: To avoid floating-point precision errors (e.g., $0.1 + $0.2 = $0.30000000000000004)
- **Q**: Why do we use Stripe webhooks instead of just trusting the frontend?
  - A: Frontend can be manipulated; webhooks come directly from Stripe's servers and are cryptographically signed
- **Q**: Why do we use `express.raw()` on the webhook route instead of `express.json()`?
  - A: Stripe signs the raw body of the request; if we parse to JSON first, the signature breaks
- **Q**: What happens if our server is down when Stripe sends the webhook?
  - A: Stripe automatically retries webhooks for several days with exponential backoff
- **Q**: Why do we save `stripePaymentIntentId` to the Contract?
  - A: For auditing and reconciling payments with Stripe dashboard

---

### 8.4 Real-time Chat with Socket.io
**Purpose**: Allow clients and freelancers to communicate instantly

**Workflow**:
1. **Socket.io Connection**: Frontend connects to Socket.io server on mount
2. **Join Conversation Room**: When user navigates to ChatPage, joins a room named `conversation-<conversationId>`
3. **Send Message**: Frontend emits "sendMessage" event with message data
4. **Server Broadcast**: Server saves message to DB, then emits "newMessage" to everyone in the conversation room
5. **Receive Message**: All clients in the room receive "newMessage" and update UI in real-time

**Interview Q&A for Socket.io**:
- **Q**: Why use rooms in Socket.io?
  - A: To limit message broadcasting to only participants of a specific conversation; avoids sending messages to everyone on the platform
- **Q**: How do you handle Socket.io connections in a scaled environment (multiple server instances)?
  - A: Use a Redis adapter for Socket.io to sync events across all server instances
- **Q**: How do you authenticate Socket.io connections?
  - A: Send JWT token via auth option when initializing socket; server verifies token on "connection" event

---

### 8.5 Admin Actions Workflow
**Purpose**: Admin can view platform stats, manage users/jobs/contracts, and approve/reject refunds

**Workflow (Approve Refund)**:
1. **Admin Action**: On AdminDashboard, views refund requests and clicks "Approve"
2. **API Call**: `approveRefund()` from contractApi.js sends POST to `/api/admin/refunds/:contractId/approve`
3. **Middleware**: `protect`, `restrictTo("admin")`
4. **Controller**: Runs transaction to update contract and job, saves admin notes and timestamp
5. **UI Update**: Shows success toast, refreshes refund requests list

---

## Part 9: API Documentation
| Endpoint | Method | Auth Required? | Role Required? | Description |
|----------|--------|----------------|----------------|-------------|
| /api/health | GET | No | None | Server health check with DB status |
| /api/auth/register | POST | No | None | Register new user |
| /api/auth/login | POST | No | None | Login user, set JWT cookie |
| /api/auth/logout | POST | Yes | None | Logout user, clear cookie |
| /api/auth/me | GET | Yes | None | Get current user profile |
| /api/jobs | GET | No | None | Get all jobs (search, filter, pagination) |
| /api/jobs | POST | Yes | Client | Create new job |
| /api/jobs/my-jobs | GET | Yes | Client | Get current client's jobs |
| /api/jobs/:id | GET | No | None | Get single job by ID |
| /api/bids | POST | Yes | Freelancer | Submit bid on job |
| /api/bids/my-bids | GET | Yes | Freelancer | Get current freelancer's bids |
| /api/contracts/accept-bid/:bidId | POST | Yes | Client | Accept bid, create contract |
| /api/contracts/my-contracts | GET | Yes | Client/Freelancer | Get user's contracts |
| /api/contracts/:contractId/submit | POST | Yes | Freelancer | Submit work (file upload) |
| /api/contracts/:contractId/release | POST | Yes | Client | Release funds, complete contract |
| /api/contracts/:contractId/request-refund | POST | Yes | Client | Request refund |
| /api/payments/create-intent/:contractId | POST | Yes | Client | Create Stripe PaymentIntent |
| /api/payments/webhook | POST | No | None | Stripe webhook |
| /api/reviews | POST | Yes | Client | Submit review for freelancer |
| /api/admin/stats | GET | Yes | Admin | Get platform overview stats |
| /api/admin/refunds | GET | Yes | Admin | Get all refund requests |
| /api/admin/refunds/:contractId/approve | POST | Yes | Admin | Approve refund |
| /api/admin/refunds/:contractId/reject | POST | Yes | Admin | Reject refund |

---

## Part 10: 80+ Interview Questions (Easy → Medium → Hard → System Design)
### Easy Questions (1-20)
1. What is the MERN stack?
Answer: MongoDB (database), Express.js (backend framework), React (frontend library), Node.js (JavaScript runtime for backend)

2. What is your project?
Answer: FreelanceHub — a full-stack MERN freelancer marketplace with escrow payments via Stripe, real-time chat via Socket.io, role-based authentication, and a responsive UI; deployed to Vercel (frontend) and Render (backend)

3. What is JWT?
Answer: JSON Web Token — a compact, URL-safe token that securely transmits information between parties as JSON; used for stateless authentication

4. What is bcrypt?
Answer: A password-hashing function designed to be slow and resistant to rainbow table attacks; we use 12 salt rounds

5. What's the difference between Authentication and Authorization?
Answer: Authentication = verifying who you are (login/register); Authorization = what you're allowed to do (role-based access to routes/features)

6. What is Mongoose?
Answer: ODM (Object Document Mapper) for MongoDB in Node.js; provides schema validation and model-based access to collections

7. What is middleware in Express?
Answer: Functions that have access to req, res, and next(); they execute between request and response (e.g., authentication, CORS, logging)

8. What is CORS?
Answer: Cross-Origin Resource Sharing; allows browsers to make requests to different domains; we configure allowed origins in server.js

9. Why store JWT in HTTP-only cookie instead of localStorage?
Answer: HTTP-only cookies can't be accessed via JavaScript, preventing XSS attacks from stealing tokens

10. What is React Query used for in your project?
Answer: For fetching, caching, synchronizing, and updating server state; e.g., caches job feed data, automatically refetches when cache is invalidated

11. Walk me through your createContractFromBid transaction (actual answer, 60-90 seconds):
Answer: Sure! So when a client accepts a bid, we need to do 4 things atomically: create a new contract, mark the accepted bid as accepted, mark the job as assigned to the freelancer, and reject all other pending/countered bids on that job. First, we start a Mongoose session. Then we use session.withTransaction() which wraps all 4 operations: creating the contract with session option, then updating the accepted bid with session, updating the job with session, and rejecting other bids with session. If any operation throws an error, withTransaction automatically aborts everything, so we don't end up in an inconsistent state like two accepted bids. If all succeed, it commits. Finally, we always end the session in a finally block, even if there's an error. This is critical because without a transaction, if, say, the bid update works but the job update fails, we'd have an accepted bid but the job is still open, which is bad!

12. What is ACID?
Answer: Atomicity (all operations succeed or fail together), Consistency (database remains valid), Isolation (transactions don't interfere), Durability (committed changes are permanent)

13. What is a MongoDB replica set?
Answer: A group of MongoDB servers that maintain the same data; primary handles writes, secondaries replicate; required for transactions and provides high availability

14. What is Socket.io used for in your project?
Answer: Real-time bidirectional communication between client and server; used for the chat feature between clients and freelancers

15. What are Stripe webhooks?
Answer: HTTP POST requests Stripe sends to our backend when events happen (e.g., payment succeeded); we use them to update contract status after payment completes

16. What is Zod?
Answer: TypeScript-first schema validation library; we use it to validate request bodies on the backend (e.g., createJobSchema, loginUserSchema)

17. What is the purpose of .select("-password")?
Answer: Excludes the password field from MongoDB query results; we never want to send passwords (even hashed) to the frontend

18. Why do we use timestamps in Mongoose schemas?
Answer: Automatically adds createdAt and updatedAt fields to documents; useful for sorting, auditing, and display

19. What is the difference between HTTP PUT and PATCH?
Answer: PUT replaces the entire resource; PATCH applies partial updates to a resource; our project uses PUT for updates like updateJob

20. What is a cookie's maxAge?
Answer: How long the cookie is valid; we set it to 7 days (in milliseconds: 7*24*60*60*1000)

---

### Medium Questions (21-50)
21. Why did you choose MongoDB instead of SQL (PostgreSQL/MySQL)?
Answer: For this marketplace, flexible schema was nice for evolving features; MERN stack is popular and well-documented; MongoDB Atlas is easy to deploy; relationships are simple enough for document-based design (using refs and populate)

22. Explain how the protect middleware works line-by-line.
Answer: First, reads the jwt cookie from req.cookies. If no token, returns 401. Then verifies token with JWT_SECRET using jwt.verify. Finds user by decoded.userId, selects everything except password. If user not found, returns 401. Attaches user to req.user, calls next() to proceed to controller.

23. Explain how restrictTo middleware works.
Answer: restrictTo is a function that accepts roles (array), returns a middleware function. The middleware checks if req.user.role is in allowed roles; if not, returns 403 Forbidden; if yes, calls next().

24. Why does restrictTo return a function instead of being a normal middleware?
Answer: To accept arguments (the allowed roles array); allows us to create custom middleware per route (e.g., restrictTo("client") vs restrictTo("admin"))

25. What's the purpose of pre-save hook in User model?
Answer: Hashes the password before saving to database; only hashes if password was modified (avoids re-hashing when updating name/email)

26. Why 12 salt rounds for bcrypt?
Answer: Balance between security and performance; 12 rounds take ~100ms per hash, which is slow enough to resist brute-force attacks but fast enough for good UX

27. What is XSS, and how do you prevent it?
Answer: Cross-Site Scripting; attacker injects malicious JS into page; we prevent it by storing JWT in HTTP-only cookie, sanitizing user inputs, using React which auto-escapes JSX

28. What's the difference between session.withTransaction() and manual start/commit/abort?
Answer: withTransaction() automatically handles retries for transient errors, commits if no errors, aborts on exceptions; manual requires explicit startSession(), startTransaction(), commitTransaction(), abortTransaction(); more boilerplate, less safe

29. Explain populate() in Mongoose.
Answer: Replaces ObjectId references with actual documents from referenced collections; e.g., job.populate("postedBy") replaces postedBy ObjectId with full User document

30. Why do we use Promise.all() in some controllers (e.g., getStats, getAllJobs)?
Answer: To run multiple async operations in parallel instead of sequential; improves performance (e.g., totalUsers, totalJobs, etc. all fetched at same time instead of one after another)

31. What's the purpose of unique compound index in Review model?
Answer: Prevents a reviewer from leaving multiple reviews on the same contract; compound index on { contract: 1, reviewer: 1 }

32. How does pagination work in the job feed?
Answer: Frontend sends page and limit query params; backend uses skip = (page-1)*limit and limit in MongoDB find(); returns total, page, pages for frontend pagination UI

33. What's the purpose of line-clamp-3 in JobCard?
Answer: Limits description preview to 3 lines, keeping job cards uniform height in the grid layout

34. How does Cloudinary work in your project?
Answer: Used for file uploads (freelancer work submission, user avatars); Multer handles file upload to backend, then we upload to Cloudinary using cloudinary.uploader.upload(), then save the Cloudinary URL to database

35. What's the difference between findByIdAndUpdate and save() on a Mongoose document?
Answer: findByIdAndUpdate runs directly on database, doesn't trigger pre-save hooks; save() is called on a document instance, triggers pre-save/post-save hooks

36. Why do we set secure: true on cookies in production?
Answer: Secure cookies are only sent over HTTPS, preventing man-in-the-middle attacks

37. Why sameSite: "none" in production?
Answer: Because frontend (Vercel) and backend (Render) are on different domains; sameSite: "none" allows cross-site cookies, but requires secure: true

38. What's the purpose of req.user in controllers?
Answer: req.user is set by protect middleware; contains authenticated user document, so controllers know who's making the request (e.g., check job ownership, contract client)

39. How do you handle CORS in server.js?
Answer: Use cors middleware with origin set to process.env.FRONTEND_URL and credentials: true; allows cookies to be sent cross-origin

40. Explain the Stripe payment intent flow.
Answer: 1. Frontend asks backend to create payment intent. 2. Backend calls Stripe PaymentIntents.create() with amount in cents, metadata includes contractId. 3. Backend returns clientSecret to frontend. 4. Frontend uses Stripe Elements + clientSecret to collect card details and confirm payment. 5. Stripe processes payment, sends webhook to backend. 6. Backend updates contract status to funded.

41. Why does Stripe require amounts in cents?
Answer: To avoid floating-point precision errors (e.g., $0.1 + $0.2 = 0.30000000000000004); using integers is precise

42. What's a transient transaction error, and how does withTransaction handle it?
Answer: Temporary errors (e.g., network blip, primary replica change); withTransaction automatically retries these errors a few times before giving up

43. Why do we use .sort({ createdAt: -1 }) in queries?
Answer: Sorts results in descending order of creation time (newest first); used for job feed, my jobs, etc.

44. What's the purpose of the finally block in transactions?
Answer: Ensures session.endSession() is called whether transaction succeeds or fails; prevents resource leaks

45. Explain FormData in frontend file uploads.
Answer: FormData is an interface for constructing key-value pairs that represent form fields and their values; used for file uploads because JSON can't handle binary files; we set Content-Type: undefined so browser sets it with multipart/form-data boundary

46. What's the purpose of Sonner in your project?
Answer: Toast notifications for user feedback (e.g., "Job posted successfully!", "Payment failed"); improves UX

47. What's the difference between useState and useQuery?
Answer: useState is for local component state; useQuery is for server state — handles caching, background refetching, loading/error states, invalidation

48. Why do we invalidate React Query queries after mutations (e.g., after createJob)?
Answer: To force React Query to refetch fresh data from backend; ensures UI shows updated state (new job appears in feed/dashboard)

49. What's a Mongoose instance method?
Answer: Method defined on schema that's available on document instances; e.g., user.comparePassword() is an instance method

50. What's the difference between Mongoose schema and model?
Answer: Schema defines structure, validations, methods for a document; Model is a compiled schema, interface to database collection for creating/querying documents

---

### Hard Questions (51-75)
51. Walk me through your releaseFunds transaction. What would happen without a transaction?
Answer: In releaseFunds, we start a session, use withTransaction, find contract, verify it's under_review and user is client, update contract to completed, find job and update to completed, save both with session. Without transaction, if contract update succeeds but job fails, we have inconsistent state (contract says completed, job says under_review); with transaction, all or nothing.

52. Walk me through your approveRefund and rejectRefund transactions.
Answer: Both start session, use withTransaction, find contract, verify status is refund_requested, update contract status and adminDecision/adminNotes/refundReviewedAt, save with session. Approve also updates job to archived; reject sets contract back to under_review. Finally end session in finally block.

53. How would you scale FreelanceHub to 100,000+ users?
Answer: - Add Redis for caching (job feed, user profiles) - Use load balancer for backend - Add MongoDB read replicas for read-heavy queries - Use Elasticsearch for better job search/filtering - Use CDN for static files and avatars - Optimize indexes on frequently queried fields - Add rate limiting to prevent abuse - Implement background jobs with BullMQ for non-urgent tasks (e.g., email notifications)

54. What are some security best practices you implemented?
Answer: - JWT in HTTP-only, secure, sameSite cookies - bcrypt password hashing with 12 salt rounds - Zod input validation on backend - Role-based access control - CORS with allowed origins - Stripe webhook signature verification - Never sending hashed passwords to frontend - Input sanitization (React auto-escapes)

55. How would you add email verification?
Answer: When user registers, generate random 6-digit code or JWT verification token, save to User model, send email via SendGrid/Nodemailer with verification link. When user clicks link, verify token, set user.isVerified to true. Add middleware to restrict sensitive routes to verified users.

56. How would you implement password reset?
Answer: User enters email, backend generates short-lived JWT reset token, sends email with reset link. User clicks link, enters new password, backend verifies token, hashes new password, saves to user, clears reset token.

57. Explain MongoDB aggregation pipeline using Review averageRating as example.
Answer: In submitReview, we use Review.aggregate([ { $match: { reviewee: freelancerId } }, { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } } ]). $match filters reviews for that freelancer; $group groups all matching docs, calculates average of rating field, counts total reviews. Then we update user's averageRating and totalReviews.

58. How would you test your transactions?
Answer: Use Jest/Mocha; write test cases: 1. Happy path: all operations succeed. 2. Failure case: mock one operation to throw, verify all rolled back. 3. Test idempotency: ensure same operation run twice doesn't cause issues.

59. What's idempotency, and why is it important for Stripe?
Answer: Idempotent operation means applying it multiple times has same effect as once; Stripe uses idempotency keys to prevent duplicate charges if request is retried.

60. How would you add push notifications?
Answer: Use Firebase Cloud Messaging (FCM) for mobile, Service Workers for web. When new message/review is created, send push notification via FCM. Save user's FCM tokens in User model.

61. What's the N+1 query problem, and how do you avoid it with Mongoose?
Answer: N+1 = query for N items, then query each item's related data separately (1 + N queries); avoid using populate() which does a single $in query for related docs, or use aggregation pipeline $lookup.

62. How would you optimize MongoDB queries?
Answer: - Add indexes on frequently queried fields (status, postedBy, freelancer, etc.) - Use .select() to fetch only needed fields - Use pagination (skip/limit or keyset pagination) - Use lean() for read-only queries (faster, no Mongoose document overhead) - Use read replicas for read-heavy queries

63. What's the difference between Mongoose lean() and normal queries?
Answer: lean() returns plain JavaScript objects instead of Mongoose documents; much faster, skips document methods/hooks; good for read-only queries like job feed.

64. Explain keyset pagination vs offset pagination.
Answer: Offset pagination: skip/limit, easy to implement but slow for large offsets (MongoDB has to scan all skipped docs). Keyset pagination: use last seen value (e.g., last createdAt) to fetch next page, faster for large datasets; our project uses offset pagination for simplicity.

65. How would you implement analytics for the admin dashboard?
Answer: Use MongoDB aggregation to compute stats (weekly signups, job volume, revenue, etc.), cache results in Redis with TTL, pre-aggregate daily/weekly stats for faster queries.

66. How would you handle file uploads at scale?
Answer: Use Cloudinary or AWS S3 for storage; use signed URLs to upload directly from frontend to cloud storage (avoids backend being bottleneck); validate file size/type on frontend and backend.

67. Explain WebSockets vs Socket.io.
Answer: WebSockets is browser API for bidirectional communication; Socket.io is library that wraps WebSockets, adds fallbacks (long polling), rooms, namespaces, reconnection, etc. Our project uses Socket.io for ease of use.

68. How would you handle Socket.io in a multi-server setup?
Answer: Use Socket.io Redis adapter to sync events across all server instances; all servers publish/subscribe to Redis, so events from one server reach clients connected to other servers.

69. What's eventual consistency vs strong consistency?
Answer: Strong consistency: reads always see latest write. Eventual consistency: reads may see stale data temporarily, but will catch up. MongoDB primary is strong consistency, secondaries are eventual by default. Our transactions use primary for strong consistency.

70. How would you add payment splitting between platform and freelancer?
Answer: Use Stripe Connect; create connected accounts for freelancers, split payment at time of PaymentIntent, specify application fee for platform, transfer rest to freelancer's connected account.

71. How would you implement a dispute resolution system?
Answer: Add dispute model with fields (contractId, reason, evidence, status, adminId), allow client/freelancer to submit dispute with evidence, assign to admin, add admin resolution, update contract status accordingly.

72. Explain the difference between authentication and authorization in your project, with examples.
Answer: Authentication: "who are you?" (protect middleware checks JWT, sets req.user). Authorization: "what can you do?" (restrictTo("client") only lets clients post jobs; contractController checks if req.user is contract.client before releasing funds).

73. What's a MongoDB transaction, and when would you use one?
Answer: Multi-document operation that's atomic (all succeed or fail together); use when multiple related documents need to be updated atomically (e.g., create contract + update bid + update job + reject other bids; release funds + update contract + update job; approve refund + update contract + update job).

74. How would you implement logging and monitoring in production?
Answer: Use Winston/Pino for structured logging, send logs to Datadog/New Relic/ELK; use Prometheus + Grafana for metrics (response time, error rate, throughput); set up alerts for high error rates, server downtime, etc.

75. What's your biggest technical challenge in this project, and how did you solve it?
Answer: Production CORS and cookie issues between Vercel (frontend) and Render (backend)! At first, cookies weren't being sent cross-origin. Fixed by setting sameSite: "none" and secure: true in production, adding proper CORS config (credentials: true, origin set to frontend URL), and updating both generateToken and logout to use the same cookie settings.

---

### System Design Questions (76-80)
76. Design FreelanceHub from scratch. Walk through your architecture.
Answer: - Frontend: React, React Router, Tailwind, React Query, Axios, deployed to Vercel. - Backend: Node.js/Express, deployed to Render. - Database: MongoDB Atlas (replica set for transactions). - File Storage: Cloudinary. - Payments: Stripe Connect for payment splitting, webhooks for status updates. - Real-time: Socket.io with Redis adapter for scaling. - Caching: Redis for job feed, user profiles. - Search: Elasticsearch for advanced job search/filtering. - Auth: JWT in HTTP-only cookies.

77. How would you design the database for FreelanceHub? What collections would you have, what relationships?
Answer: Collections: User, Job, Bid, Contract, Conversation, Message, Review, Dispute, AdminAction. Relationships: Use ObjectId refs and populate(). User has many Jobs (postedBy), many Bids (freelancer), many Contracts (client/freelancer), many Conversations, many Messages, many Reviews (reviewer/reviewee). Job has many Bids, one Contract. Contract has one Job, one Client, one Freelancer, one Review. Conversation has two Participants, many Messages.

78. How would you design a real-time chat system?
Answer: Use Socket.io for bidirectional communication. Rooms per conversation. Store messages in MongoDB with conversationId, senderId, content, timestamp. On frontend, join conversation room on mount. On send, emit "sendMessage" to server; server saves message, emits "newMessage" to room. Scale with Redis adapter for multi-server.

79. How would you design an escrow payment system?
Answer: Use Stripe PaymentIntents. Payment flow: 1. Create contract. 2. Client funds via PaymentIntent, money held by Stripe. 3. Freelancer submits work. 4. Client approves: transfer money to freelancer (Stripe Connect). 5. Client requests refund: admin reviews, if approved, refund to client. Use webhooks for all Stripe status updates. Use transactions for all contract/job updates.

80. How would you design a review system for a marketplace?
Answer: Review model with contractId, reviewerId, revieweeId, rating (1-5), comment, timestamps. Compound unique index { contractId: 1, reviewerId: 1 } to prevent multiple reviews per contract/reviewer. When review is created, recalculate reviewee's averageRating via aggregation pipeline, update User document. Only allow reviews after contract is completed.

---

## Part 11: HR Questions & Answers (with Project-Specific Stories)
### Q: What was your biggest challenge in building FreelanceHub, and how did you solve it?
Answer: Getting CORS and cookies working correctly in production between Vercel (frontend) and Render (backend)! At first, after deploying, the JWT cookie wasn't being sent from frontend to backend at all — users would log in but then immediately be logged out again because /api/auth/me couldn't find the cookie. 

First, I realized I needed to set `sameSite: "none"` because frontend and backend were on different domains, but that requires `secure: true` (only HTTPS). Then I had to make sure the CORS middleware in server.js had `origin: process.env.FRONTEND_URL` and `credentials: true`. Also, I had to update both `generateTokenAndSetCookie` AND the `logout` function to use the same cookie settings in production (sameSite: none, secure: true) vs development (sameSite: strict, secure: false). After fixing all three places, cookies worked perfectly!

### Q: What did you learn from this project?
Answer: A ton! I learned:
- Full-stack end-to-end development (frontend to backend to DB to deployment)
- How to implement JWT authentication securely with HTTP-only cookies
- How to use MongoDB ACID transactions with Mongoose to avoid inconsistent state
- How to integrate Stripe (PaymentIntents, webhooks, signature verification)
- How to use Socket.io for real-time chat
- How to use Cloudinary and Multer for file uploads
- How to deploy frontend (Vercel) and backend (Render) with proper environment variables
- How to debug production issues (CORS, cookies, env vars, DB connection)
- The importance of validation (Zod on backend) and never trusting frontend inputs

### Q: If you had more time, what would you improve or add to FreelanceHub?
Answer: So many things! Here's my priority list:
1. Email verification (for new signups) and password reset
2. Push notifications for new messages, bid updates, contract status changes
3. Automated dispute resolution (or better admin dispute tools)
4. Better job search/filtering with Elasticsearch (skills, location, budget range, etc.)
5. Analytics dashboard for freelancers (earnings, bid acceptance rate, etc.)
6. Stripe Connect for payment splitting (take platform fee, send rest directly to freelancer)
7. Multiple milestones per contract (partial payments for each milestone)
8. Unit/integration tests with Jest and React Testing Library
9. CI/CD pipeline with GitHub Actions (run tests on PR, auto-deploy on merge)
10. WebSocket authentication (verify JWT on Socket.io connection)
11. Redis caching for job feed and user profiles to improve performance at scale

### Q: Why did you choose the MERN stack for this project?
Answer: A few reasons:
1. I wanted to practice full-stack JavaScript (only one language across frontend/backend/DB)
2. MERN stack is super popular, has great documentation and community support
3. React is awesome for reusable components and has a great ecosystem (React Query, Tailwind, etc.)
4. MongoDB has flexible schema which was great for evolving the project as I built it
5. MongoDB Atlas is easy to deploy and scale
6. I wanted to learn how to use Mongoose ODM

### Q: Tell me about a time you had to debug a difficult issue in this project.
Answer: Oh, the time when Render couldn't connect to MongoDB Atlas! I deployed the backend, but the logs showed "MONGO_URI is undefined" — turns out I forgot to add the environment variables to Render's dashboard! I had the .env file locally, but Render doesn't read .env (it's gitignored, which is good). So I went to Render → backend → Environment → added all env vars (MONGO_URI, JWT_SECRET, NODE_ENV, etc.), redeployed, and it worked! Then I also had to add NODE_ENV=production specifically to enable secure cookies and sameSite: none.

### Q: How do you approach learning a new technology (e.g., Socket.io, Stripe)?
Answer: My process is:
1. Read official docs first (always start there — best source of truth)
2. Build a tiny proof-of-concept (e.g., for Stripe, a simple "pay $1" button)
3. Integrate it into the project incrementally
4. Test edge cases
5. If stuck, look up tutorials, Stack Overflow, or ask for help
6. Once working, refactor for best practices

For Socket.io, I first made a simple "hello world" chat, then added rooms, then integrated into FreelanceHub's Conversation/Message models.

### Q: Tell me about a time you had to refactor code in this project.
Answer: I initially put the createContractFromBid logic directly in bidController, but it was getting messy, and I realized I needed to reuse the transaction logic for the freelancer's "accept counter-offer" flow too. So I refactored it into a separate contractService.js file! That way, both controllers could use the same transaction function, keeping code DRY and making it easier to test.

---

## Part 12: Cheat Sheets & Final Revision Notes
### Quick Project Recap Cheat Sheet
- **Name**: FreelanceHub
- **Tech**: MERN, Stripe, Socket.io, Cloudinary
- **Key Features**: Job posting/bidding, contract escrow, real-time chat, reviews, admin panel
- **Transactions**: createContractFromBid, releaseFunds, approveRefund, rejectRefund (all use session.withTransaction())
- **Auth**: JWT HTTP-only cookies, protect/restrictTo middlewares
- **Deploy**: Vercel (frontend), Render (backend), MongoDB Atlas

### Last-Minute Interview Tips
1. **Know your transactions cold**: Be able to explain createContractFromBid line-by-line, what can go wrong without transaction, why withTransaction()
2. **Know your schemas**: Be able to talk about User, Job, Bid, Contract, Review — fields, indexes, relationships
3. **Know your auth flow**: Protect middleware, restrictTo, generateToken, cookie settings
4. **Know your feature workflows**: Job posting, Stripe escrow, Socket.io chat
5. **Have specific stories ready**: CORS/cookie production issue, Render env var issue, refactoring to contractService
6. **Be honest about limitations**: Be able to talk about what you'd improve next

---

## Final Verification of Claims (Fixed)
1. **Job.js Indexes**: Confirmed — NO indexes except default `_id`
2. **Contract.js Stripe Fields**: Confirmed — ONLY `stripePaymentIntentId`, no other Stripe fields

---

Congratulations! You are now fully prepared for your FreelanceHub MERN stack interviews! 🚀 Good luck!

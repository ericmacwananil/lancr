const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const Bid = require("../models/Bid");
const Job = require("../models/Job");

const createContractFromBid = async (bid, clientUserId) => {
  let session = null;
  let newContract = null;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const [contract] = await Contract.create(
        [
          {
            job: bid.job._id,
            client: clientUserId,
            freelancer: bid.freelancer,
            agreedAmount: bid.amount,
          },
        ],
        { session }
      );
      newContract = contract;

      await Bid.findByIdAndUpdate(
        bid._id,
        { $set: { status: "accepted" } },
        { session }
      );

      await Job.findByIdAndUpdate(
        bid.job._id,
        {
          $set: {
            status: "assigned",
            assignedTo: bid.freelancer,
          },
        },
        { session }
      );

      await Bid.updateMany(
        {
          job: bid.job._id,
          _id: { $ne: bid._id },
          status: { $in: ["pending", "countered"] },
        },
        { $set: { status: "rejected" } },
        { session }
      );
    });

    const populatedContract = await Contract.findById(newContract._id)
      .populate("job", "title description budget")
      .populate("client", "name email avatar")
      .populate("freelancer", "name email avatar skills");

    return { success: true, contract: populatedContract };
  } catch (error) {
    console.error("createContractFromBid error:", error);
    return { success: false, error };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

module.exports = { createContractFromBid };

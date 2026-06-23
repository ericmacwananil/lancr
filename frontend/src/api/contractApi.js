import axiosInstance from "./axiosInstance";

/*
 * Client calls this when they click "Accept Bid".
 * bidId = the ID of the bid being accepted.
 * This triggers the ACID transaction on the backend.
 */
export const acceptBid = async (bidId) => {
  const { data } = await axiosInstance.post(
    `/contracts/accept-bid/${bidId}`
  );
  return data;
};

// Fetch a single contract by its ID (for ContractDetailPage)
export const getContractById = async (contractId) => {
  const { data } = await axiosInstance.get(`/contracts/${contractId}`);
  return data;
};

// Fetch all contracts for the logged-in user
export const getMyContracts = async () => {
  const { data } = await axiosInstance.get("/contracts/my-contracts");
  return data;
};




// ADD this function to existing contractApi.js

/*
 * submitWork sends a file to the backend.
 * WHY FormData?
 * Files can't be sent as JSON (JSON is text only).
 * FormData is the format used to send files over HTTP.
 * It matches the multipart/form-data Content-Type that Multer reads.
 */
export const submitWork = async ({ contractId, file }) => {
  /*
   * FormData works like a key-value store for form fields.
   * formData.append("workFile", file) adds the file with key "workFile".
   * "workFile" must match upload.single("workFile") in the route.
   */
  const formData = new FormData();
  formData.append("workFile", file);

  const { data } = await axiosInstance.post(
    `/contracts/${contractId}/submit`,
    formData,
    {
      /*
       * When sending FormData, we must set Content-Type to
       * multipart/form-data so the server knows it's a file upload.
       *
       * We also need to override the default "application/json"
       * that axiosInstance sets globally.
       */
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
};




// ADD these two functions to existing contractApi.js

/*
 * Client releases funds → triggers ACID transaction on backend.
 * This is the final step of the escrow flow.
 */
export const releaseFunds = async (contractId) => {
  const { data } = await axiosInstance.post(
    `/contracts/${contractId}/release`
  );
  return data;
};

/*
 * Client requests revision → sends work back to freelancer.
 * Contract status goes back to "funded".
 */
export const requestRevision = async (contractId) => {
  const { data } = await axiosInstance.post(
    `/contracts/${contractId}/revision`
  );
  return data;
};
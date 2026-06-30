import axiosInstance from "./axiosInstance";

/*
 * Ask the backend to create a PaymentIntent for this contract.
 * Returns { clientSecret, amount }
 * clientSecret is what Stripe Elements needs to process the payment.
 */
export const createPaymentIntent = async (contractId) => {
  const { data } = await axiosInstance.post(
    `/payments/create-intent/${contractId}`
  );
  return data;
};

/*
 * DEVELOPMENT ONLY: Manually mark contract as funded
 */
export const manuallyFundContract = async (contractId) => {
  const { data } = await axiosInstance.post(
    `/payments/manually-fund/${contractId}`
  );
  return data;
};
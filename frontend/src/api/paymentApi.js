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
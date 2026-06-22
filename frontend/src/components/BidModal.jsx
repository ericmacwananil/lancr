import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, DollarSign } from "lucide-react";

import { submitBid } from "@/api/bidApi";

/*
 * WHAT IS THIS COMPONENT?
 * A modal (popup) for freelancers to place a bid on a job.
 *
 * Props:
 * - isOpen    → boolean: show or hide the modal
 * - onClose   → function: closes the modal
 * - job       → object: the job being bid on (we need job._id and job.budget)
 */

const BidModal = ({ isOpen, onClose, job }) => {
  const queryClient = useQueryClient();

  // Form state
  const [amount, setAmount] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  /*
   * useMutation for submitting the bid.
   * On success:
   * 1. Show success toast
   * 2. Invalidate "myBids" cache so freelancer's bid list updates
   * 3. Close the modal
   * 4. Reset the form fields
   */
  const { mutate: placeBid, isPending } = useMutation({
    mutationFn: submitBid,
    onSuccess: () => {
      toast.success("Bid submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["myBids"] });
      onClose();
      setAmount("");
      setCoverLetter("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit bid");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    placeBid({
      jobId: job._id,
      amount: Number(amount), // Convert to number for Zod validation
      coverLetter,
    });
  };

  // Don't render anything if modal is closed
  if (!isOpen) return null;

  return (
    /*
     * Fixed overlay covering the entire screen.
     * Clicking the dark background closes the modal.
     */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={onClose}
    >
      {/*
       * e.stopPropagation() prevents clicks INSIDE the modal
       * from bubbling up to the overlay and closing it.
       */}
      <div
        className="w-full max-w-lg p-6 border rounded-2xl border-slate-800 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Place a Bid</h2>
            {/* Show the job title so freelancer knows what they're bidding on */}
            <p className="mt-1 text-sm text-slate-400 line-clamp-1">
              {job?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Client's Budget Reference */}
        <div className="p-4 mb-5 rounded-xl bg-slate-800">
          <p className="text-xs tracking-wider uppercase text-slate-500">
            Client's Budget
          </p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            ${job?.budget}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Submit a competitive bid to increase your chances
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Bid Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Your Bid Amount (USD) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              {/* Dollar sign icon inside the input */}
              <DollarSign
                size={16}
                className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400"
              />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 450"
                required
                min="1"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-4 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Cover Letter */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Cover Letter <span className="text-red-400">*</span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Introduce yourself, explain why you're the best fit, describe your approach to this project..."
              required
              rows={5}
              minLength={30}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            {/* Character counter — turns red when near limit */}
            <p className={`mt-1 text-right text-xs ${
              coverLetter.length > 900 ? "text-red-400" : "text-slate-500"
            }`}>
              {coverLetter.length}/1000
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-slate-300 transition hover:border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Submitting..." : "Submit Bid"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default BidModal;
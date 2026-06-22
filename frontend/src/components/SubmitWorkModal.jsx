import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Upload, FileText, AlertCircle } from "lucide-react";

import { submitWork } from "@/api/contractApi";

/*
 * WHAT IS THIS COMPONENT?
 * A modal where the freelancer uploads their finished work file.
 *
 * Props:
 * - isOpen    → show/hide modal
 * - onClose   → close the modal
 * - contract  → the contract they're submitting work for
 * - onSuccess → callback after successful submission
 */

const SubmitWorkModal = ({ isOpen, onClose, contract, onSuccess }) => {
  const [file, setFile] = useState(null);           // the selected file
  const [dragOver, setDragOver] = useState(false);  // drag-and-drop state

  /*
   * useMutation for submitting work.
   * We send FormData (not JSON) because we're uploading a file.
   */
  const { mutate: handleSubmit, isPending } = useMutation({
    mutationFn: ({ contractId, file }) => submitWork({ contractId, file }),
    onSuccess: () => {
      toast.success("Work submitted! Client is now reviewing.");
      setFile(null);
      onSuccess(); // refresh contracts list in parent
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit work");
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }
    handleSubmit({ contractId: contract._id, file });
  };

  // ─── Drag and Drop Handlers ───────────────────────────────
  /*
   * HTML5 drag-and-drop API:
   * onDragOver: fires when user drags a file over the drop zone.
   * e.preventDefault() allows the drop to happen.
   *
   * onDrop: fires when user releases the file over the drop zone.
   * e.dataTransfer.files[0] = the dropped file.
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  // Format file size: 245000 → "245 KB"
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 border rounded-2xl border-slate-800 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Submit Work</h2>
            <p className="mt-0.5 text-sm text-slate-400 line-clamp-1">
              {contract?.job?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">

          {/*
           * File Drop Zone
           * User can either click to browse or drag-and-drop a file.
           */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Work File <span className="text-red-400">*</span>
            </label>

            {/*
             * The actual <input type="file"> is hidden (sr-only).
             * The styled div below acts as the visible upload area.
             * Clicking the div triggers the hidden input via its id.
             */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("workFileInput").click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                dragOver
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <Upload size={32} className="mx-auto mb-3 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">
                Drop file here or click to browse
              </p>
              <p className="mt-1 text-xs text-slate-500">
                JPG, PNG, PDF, DOC, DOCX, ZIP — Max 10MB
              </p>
            </div>

            {/* Hidden file input */}
            <input
              id="workFileInput"
              type="file"
              className="sr-only"    // visually hidden but accessible
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.zip"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>

          {/*
           * Selected File Preview
           * Shows the file name and size after user selects a file.
           * Gives user confidence that the right file is selected.
           */}
          {file && (
            <div className="flex items-center gap-3 p-4 border rounded-xl border-violet-500/30 bg-violet-500/5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 bg-violet-500/20">
                <FileText size={18} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                {/* truncate: cuts long file names with "..." */}
                <p className="text-sm font-medium text-white truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
              {/* Remove selected file */}
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-slate-400 hover:text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Warning */}
          <div className="flex gap-2 p-3 rounded-xl bg-yellow-500/5">
            <AlertCircle size={16} className="shrink-0 text-yellow-400 mt-0.5" />
            <p className="text-xs text-slate-400">
              Once submitted, the client will review your work and release funds
              or request a revision.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-slate-300 transition hover:border-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !file}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={14} />
              {isPending ? "Uploading..." : "Submit Work"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default SubmitWorkModal;
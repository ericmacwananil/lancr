import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";

import { updateUserProfile } from "@/api/userApi";
import { useAuth } from "@/context/AuthContext";

/*
 * WHAT IS THIS COMPONENT?
 * A modal (popup) that lets users edit their bio and skills.
 *
 * Props received from FreelancerProfilePage:
 * - isOpen  → boolean: should the modal be visible?
 * - onClose → function: call this to close the modal
 * - user    → object: current user data to pre-fill the form
 */

const EditProfileModal = ({ isOpen, onClose, user }) => {
  const queryClient = useQueryClient();
  const { currentUser, refetchUser } = useAuth();

  // Local form state — starts empty, filled when modal opens
  const [bio, setBio] = useState("");
  const [skillInput, setSkillInput] = useState(""); // single skill being typed
  const [skills, setSkills] = useState([]);          // array of all added skills

  /*
   * useEffect runs when 'user' data changes.
   * WHY? When the modal opens, we want to pre-fill
   * the form with the user's CURRENT bio and skills.
   *
   * Dependency array [user]: runs every time 'user' changes.
   */
  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setSkills(user.skills || []);
    }
  }, [user]);

  /*
   * Add a skill to the skills array.
   * We trim() to remove extra spaces.
   * We check if it's not already in the array (no duplicates).
   */
  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput(""); // clear the input after adding
  };

  /*
   * Remove a skill from the array.
   * .filter() returns a new array WITHOUT the clicked skill.
   */
  const handleRemoveSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Allow pressing Enter key to add a skill
  const handleSkillKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // prevent form submit
      handleAddSkill();
    }
  };

  /*
   * useMutation for updating the profile.
   *
   * onSuccess:
   * 1. Invalidate the profile cache so it re-fetches fresh data
   * 2. Refetch the auth user so navbar/header shows updated info
   * 3. Close the modal
   * 4. Show success toast
   */
  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      /*
       * queryClient.invalidateQueries tells React Query:
       * "The cached data for this key is outdated, re-fetch it."
       * This makes the profile page automatically show new data.
       */
      queryClient.invalidateQueries({ queryKey: ["profile", currentUser?._id] });
      refetchUser(); // update global auth state too
      toast.success("Profile updated successfully!");
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile({ bio, skills });
  };

  /*
   * If isOpen is false, render nothing.
   * The modal is completely removed from the DOM when closed.
   */
  if (!isOpen) return null;

  return (
    /*
     * Overlay: dark background behind the modal.
     * onClick on overlay closes the modal when clicking outside.
     * The inner div has onClick={(e) => e.stopPropagation()
     * to prevent clicks inside the modal from closing it.
     */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg p-6 border rounded-2xl border-slate-800 bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          {/* X button to close modal */}
          <button
            onClick={onClose}
            className="p-1 transition rounded-lg text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Bio Field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients about yourself, your experience, and what makes you unique..."
              rows={4}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
            {/* Character counter */}
            <p className="mt-1 text-xs text-right text-slate-500">
              {bio.length}/500
            </p>
          </div>

          {/* Skills Field */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Skills
            </label>

            {/* Skill Input + Add Button */}
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="e.g. React, Node.js, MongoDB"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            {/* Skills Tags */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm text-violet-300"
                  >
                    {skill}
                    {/* Click X to remove the skill */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-violet-400 hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
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
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
import { create } from "zustand";
import { apiClient } from "app";
import { toast } from "sonner";
import { CheckCodeResponse } from "types";

interface ActivationStore {
  isLoading: boolean;
  isClaiming: boolean;
  error: string | null;
  
  checkCode: (code: string) => Promise<CheckCodeResponse | null>;
  claimCode: (code: string) => Promise<boolean>;
}

export const useActivationStore = create<ActivationStore>((set) => ({
  isLoading: false,
  isClaiming: false,
  error: null,
  
  checkCode: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.check_code(code);
      const data = await response.json();
      set({ isLoading: false });
      return data;
    } catch (error) {
      console.error("Error checking activation code:", error);
      set({ isLoading: false, error: "Failed to verify code" });
      return null;
    }
  },
  
  claimCode: async (code) => {
    set({ isClaiming: true, error: null });
    try {
      const response = await apiClient.claim_code({ code });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to claim code");
      }
      
      const data = await response.json();
      toast.success(data.message || "Code claimed successfully!");
      set({ isClaiming: false });
      return true;
    } catch (error: any) {
      console.error("Error claiming activation code:", error);
      toast.error(error.message || "Failed to claim code. It may be invalid or already claimed.");
      set({ isClaiming: false, error: error.message });
      return false;
    }
  }
}));

import { create } from "zustand";

interface PresenceStore {
  onlineUsers: Set<string>;
  setOnlineUsers: (users: Set<string>) => void;
  isOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceStore>((set, get) => ({
  onlineUsers: new Set(),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  isOnline: (userId) => get().onlineUsers.has(userId),
}));

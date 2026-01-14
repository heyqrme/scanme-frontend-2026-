import { create } from "zustand";
import { apiClient } from "app";

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string; // ISO string
  ticketCode: string; // The QR code content
  status: "valid" | "used" | "refunded";
  purchaseDate: string; // ISO string
  price: number;
}

interface TicketStore {
  tickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  fetchMyTickets: () => Promise<void>;
}

export const useTicketStore = create<TicketStore>((set) => ({
  tickets: [],
  isLoading: false,
  error: null,

  fetchMyTickets: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement Firebase-based ticket system
      // For now, return empty array
      set({ tickets: [], isLoading: false });
      
      // const response = await apiClient.get_my_tickets();
      // const data = await response.json();
      // set({ tickets: data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
      set({ error: "Failed to load tickets", isLoading: false });
    }
  },
}));

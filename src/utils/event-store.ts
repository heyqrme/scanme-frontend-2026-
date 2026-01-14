import { create } from "zustand";
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { apiClient } from "app";
import { CreateEventRequest, BodyUploadEventImage, UpdateEventRequest } from "types";

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location?: string;
  imageURL?: string;
  price?: number;
  ticketLink?: string;
  supportsScanning?: boolean;
  category?: string;
}

// Define the input type for creating an event
export interface CreateEventInput {
  title: string;
  description: string;
  date: Date;
  location: string;
  imageURL?: string;
  price?: number;
  ticketLink?: string;
  supportsScanning?: boolean;
  category?: string;
}

interface EventStore {
  events: Event[];
  currentEvent: Event | null;
  isLoading: boolean;
  error: string | null;
  
  fetchEvents: (category?: string) => Promise<void>;
  fetchEvent: (id: string) => Promise<void>;
  createEvent: (event: CreateEventRequest) => Promise<void>;
  updateEvent: (id: string, event: UpdateEventRequest) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  uploadEventImage: (file: File) => Promise<string>;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,

  fetchEvents: async (category?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Pass category to list_events if provided
      const response = await apiClient.list_events(category ? { category } : {});
      const data = await response.json();
      
      const events = data.map((data: any) => {
        // Safely parse date
        let eventDate = new Date(data.date);
        if (isNaN(eventDate.getTime())) {
          console.warn(`Invalid date for event ${data.id}:`, data.date);
          eventDate = new Date(); // Fallback to current date
        }
        
        return {
          id: data.id,
          title: data.title,
          description: data.description,
          // Handle both string (ISO) and Timestamp (if any left)
          date: eventDate, 
          location: data.location,
          imageURL: data.imageURL,
          price: data.price || 0,
          ticketLink: data.ticketLink,
          supportsScanning: data.supportsScanning || false,
          category: data.category || 'general'
        };
      });
      
      set({ events, isLoading: false });
    } catch (error: any) {
      console.error("Error fetching events:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  createEvent: async (eventData: CreateEventRequest) => {
    set({ isLoading: true, error: null });
    try {
      // Use the backend API instead of direct Firestore
      const response = await apiClient.create_event(eventData);
      await response.json(); // Wait for completion

      // Refresh events list
      await get().fetchEvents();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error creating event:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateEvent: async (id: string, eventData: UpdateEventRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.update_event({ eventId: id }, eventData);
      await response.json();

      // Refresh events list and current event
      await get().fetchEvents();
      await get().fetchEvent(id);
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error updating event:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteEvent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.delete_event({ eventId: id });
      await response.json();

      // Refresh events list
      await get().fetchEvents();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error deleting event:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  uploadEventImage: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.upload_event_image({ file });
      const data = await response.json();
      return data.url;
    } catch (error: any) {
      console.error("Error uploading image:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchEvent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // Use backend API to bypass Firestore rules
      const response = await apiClient.get_event({ eventId: id });
      const data = await response.json();
      
      // Safely parse date
      let eventDate = new Date(data.date);
      if (isNaN(eventDate.getTime())) {
        eventDate = new Date(); // Fallback
      }

      const event = {
        id: data.id,
        title: data.title,
        description: data.description,
        date: eventDate,
        location: data.location,
        imageURL: data.imageURL,
        price: data.price || 0,
        ticketLink: data.ticketLink,
        supportsScanning: data.supportsScanning || false
      } as Event;
      
      set({ currentEvent: event, isLoading: false });
    } catch (error: any) {
      console.error("Error fetching event:", error);
      set({ error: error.message, isLoading: false });
    }
  }
}));

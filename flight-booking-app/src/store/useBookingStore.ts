import { create } from 'zustand'

export interface PassengerInfo {
  name: string
  passportNumber: string
  seatId?: string
  seatNumber?: string
}

interface BookingState {
  selectedSeats: { id: string; seatNumber: string }[]
  passengers: PassengerInfo[]
  bookingStatus: 'idle' | 'submitting' | 'confirmed' | 'failed'
  bookingError: string | null
  pnr: string | null
  setSelectedSeats: (seats: { id: string; seatNumber: string }[]) => void
  setPassengers: (passengers: PassengerInfo[]) => void
  setBookingStatus: (status: 'idle' | 'submitting' | 'confirmed' | 'failed') => void
  setBookingError: (error: string | null) => void
  setPnr: (pnr: string | null) => void
  reset: () => void
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedSeats: [],
  passengers: [],
  bookingStatus: 'idle',
  bookingError: null,
  pnr: null,
  setSelectedSeats: (selectedSeats) => set({ selectedSeats }),
  setPassengers: (passengers) => set({ passengers }),
  setBookingStatus: (bookingStatus) => set({ bookingStatus }),
  setBookingError: (bookingError) => set({ bookingError }),
  setPnr: (pnr) => set({ pnr }),
  reset: () =>
    set({
      selectedSeats: [],
      passengers: [],
      bookingStatus: 'idle',
      bookingError: null,
      pnr: null,
    }),
}))

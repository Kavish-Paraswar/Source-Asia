'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plane, Calendar, User, Compass, HelpCircle, XCircle, 
  RefreshCw, ChevronRight, X, AlertTriangle, Info, Wifi, Loader2
} from 'lucide-react'
import { useToastStore } from '@/store/useToastStore'
import { cancelBookingAction, rescheduleBookingAction } from '@/app/actions'
import { useRealtimeSeats } from '@/hooks/useRealtimeSeats'

// Custom type definitions mapping to initialBookings query structure
interface PassengerWithSeat {
  id: string
  name: string
  passport_number: string
  seat_id: string | null
  seats: {
    id: string
    seat_number: string
    class: string
  } | null
}

interface BookingDetails {
  id: string
  pnr: string
  status: string | null
  total_price: number
  created_at: string | null
  flight_id: string
  flights: {
    id: string
    flight_no: string
    origin: string
    destination: string
    departs_at: string
    arrives_at: string
    base_price: number
  } | null
  passengers: PassengerWithSeat[]
}

interface MyBookingsListProps {
  initialBookings: any[]
  userId: string
  availableFlights: any[]
}

export default function MyBookingsList({ 
  initialBookings, 
  userId, 
  availableFlights 
}: MyBookingsListProps) {
  const { addToast } = useToastStore()
  const [bookings, setBookings] = useState<BookingDetails[]>(initialBookings)

  // Cancellation states
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [isCancelLoading, setIsCancelLoading] = useState(false)

  // Reschedule states
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingDetails | null>(null)
  const [selectedFlightId, setSelectedFlightId] = useState<string>('')
  const [selectedSeats, setSelectedSeats] = useState<{ id: string; seatNumber: string }[]>([])
  const [isRescheduleLoading, setIsRescheduleLoading] = useState(false)

  // Realtime hook for the flight being rescheduled to
  const { seats: newFlightSeats, loading: loadingSeats, isConnected } = useRealtimeSeats(
    selectedFlightId || null
  )

  const handleCancelClick = (bookingId: string) => {
    setCancellingId(bookingId)
  }

  const handleCancelConfirm = async () => {
    if (!cancellingId) return
    setIsCancelLoading(true)

    try {
      await cancelBookingAction(cancellingId)
      addToast('Booking successfully cancelled.', 'success')
      setBookings(prev => 
        prev.map(b => b.id === cancellingId ? { ...b, status: 'cancelled' } : b)
      )
      setCancellingId(null)
    } catch (err: any) {
      console.error(err)
      addToast(err.message || 'Failed to cancel booking.', 'error')
    } finally {
      setIsCancelLoading(false)
    }
  }

  const handleRescheduleClick = (booking: BookingDetails) => {
    setRescheduleBooking(booking)
    setSelectedFlightId('')
    setSelectedSeats([])
  }

  const handleSeatClick = (seat: any) => {
    if (!seat.is_available) return
    const passengersCount = rescheduleBooking?.passengers.length || 0

    // Toggle
    const exists = selectedSeats.find(s => s.id === seat.id)
    if (exists) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id))
    } else {
      if (selectedSeats.length >= passengersCount) {
        addToast(`You can only select up to ${passengersCount} seats.`, 'info')
        return
      }
      setSelectedSeats([...selectedSeats, { id: seat.id, seatNumber: seat.seat_number }])
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !selectedFlightId) return
    const passengersCount = rescheduleBooking.passengers.length

    if (selectedSeats.length !== passengersCount) {
      addToast(`Please select exactly ${passengersCount} seats.`, 'error')
      return
    }

    setIsRescheduleLoading(true)

    // Map old passengers to new seats
    const payload = rescheduleBooking.passengers.map((p, index) => ({
      name: p.name,
      passportNumber: p.passport_number,
      seatId: selectedSeats[index].id,
      seatNumber: selectedSeats[index].seatNumber
    }))

    try {
      const result = await rescheduleBookingAction(rescheduleBooking.id, selectedFlightId, payload)
      addToast(`Rescheduled successfully! New PNR: ${result.newPnr}`, 'success')
      // Refresh page data
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      addToast(err.message || 'Failed to reschedule.', 'error')
    } finally {
      setIsRescheduleLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {bookings.length === 0 ? (
        <div className="glass-premium rounded-3xl p-12 text-center">
          <Plane className="h-10 w-10 text-slate-500 mx-auto rotate-45 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Bookings Found</h3>
          <p className="text-slate-400 max-w-sm mx-auto mb-6">
            You don't have any booked flight tickets yet.
          </p>
        </div>
      ) : (
        bookings.map((booking) => {
          const flight = booking.flights
          if (!flight) return null

          const departs = new Date(flight.departs_at)
          const arrives = new Date(flight.arrives_at)

          // 2-hour cancellation validation
          const isCancelled = booking.status === 'cancelled'
          const timeToDepartureMs = departs.getTime() - Date.now()
          const canCancel = !isCancelled && timeToDepartureMs > 2 * 60 * 60 * 1000

          return (
            <motion.div
              layout
              key={booking.id}
              className={`glass rounded-2xl p-6 border transition-all ${
                isCancelled ? 'opacity-60 border-slate-900 bg-slate-950/20' : 'border-border-dark hover:border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border-dark/50 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-slate-950 rounded-lg text-slate-400 font-mono text-sm border border-border-dark">
                    PNR: <span className="text-white font-bold">{booking.pnr}</span>
                  </div>
                  {isCancelled ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-950/30 border border-red-900/40 text-red-400 text-xs font-semibold uppercase">
                      Cancelled
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs font-semibold uppercase">
                      Confirmed
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-400">
                  Fare: <span className="text-primary font-bold">${booking.total_price}</span>
                </div>
              </div>

              {/* Flight Routing Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Details */}
                <div className="md:col-span-8 grid grid-cols-3 gap-4 items-center">
                  <div className="text-left">
                    <span className="text-xs text-slate-500 font-semibold block">Origin</span>
                    <span className="text-lg font-bold text-white block">{flight.origin}</span>
                    <span className="text-xs text-slate-400">{departs.toLocaleDateString()}</span>
                    <span className="text-xs text-slate-450 block font-medium mt-0.5">
                      {departs.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{flight.flight_no}</span>
                    <Plane className="h-4 w-4 text-primary rotate-90 my-1" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Direct</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-semibold block">Destination</span>
                    <span className="text-lg font-bold text-white block">{flight.destination}</span>
                    <span className="text-xs text-slate-400">{arrives.toLocaleDateString()}</span>
                    <span className="text-xs text-slate-450 block font-medium mt-0.5">
                      {arrives.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="md:col-span-4 flex flex-row md:flex-col justify-end gap-3 w-full border-t md:border-t-0 md:border-l border-border-dark pt-4 md:pt-0 md:pl-6">
                  {!isCancelled && (
                    <>
                      <button
                        onClick={() => handleRescheduleClick(booking)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all text-sm cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4" /> Reschedule
                      </button>
                      <button
                        disabled={!canCancel}
                        onClick={() => handleCancelClick(booking.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all text-sm cursor-pointer ${
                          canCancel 
                            ? 'bg-red-950/20 border border-red-950 hover:bg-red-950/40 text-red-400' 
                            : 'bg-slate-900 border border-slate-850 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <XCircle className="h-4 w-4" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Passengers details dropdown list */}
              <div className="mt-4 pt-4 border-t border-border-dark/40">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">Passengers & Seats</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {booking.passengers.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-xs bg-slate-950/40 p-2.5 rounded-lg border border-border-dark/60">
                      <div>
                        <span className="text-slate-200 font-semibold">{p.name}</span>
                        <span className="text-slate-450 font-mono block mt-0.5">PP: {p.passport_number}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-primary/10 text-primary-light font-bold">
                        Seat {p.seats?.seat_number || 'N/A'} ({p.seats?.class || 'E'})
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!canCancel && !isCancelled && (
                <div className="flex items-center gap-2 mt-4 text-xs text-yellow-500 bg-yellow-950/20 border border-yellow-950 p-2.5 rounded-xl">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Late Cancellation Rule: Cancellations are locked within 2 hours of flight departure.</span>
                </div>
              )}
            </motion.div>
          )
        })
      )}

      {/* CANCELLATION DIALOG */}
      <AnimatePresence>
        {cancellingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-border-dark rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setCancellingId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Cancel Flight Ticket</h3>
              <p className="text-slate-400 text-sm mb-6">
                Are you sure you want to cancel this booking? This will instantly release your reserved seats. This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setCancellingId(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-white hover:bg-slate-700 font-bold rounded-xl transition-all text-sm cursor-pointer"
                >
                  No, Keep
                </button>
                <button
                  disabled={isCancelLoading}
                  onClick={handleCancelConfirm}
                  className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl transition-all text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESCHEDULE DIALOG */}
      <AnimatePresence>
        {rescheduleBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-slate-900 border border-border-dark rounded-3xl p-6 max-w-xl w-full shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setRescheduleBooking(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <RefreshCw className="text-primary h-5 w-5 animate-spin-slow" /> Reschedule Flight ticket
              </h3>

              <div className="space-y-4">
                {/* Select New Flight */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Choose New Flight Route</label>
                  <select
                    value={selectedFlightId}
                    onChange={(e) => {
                      setSelectedFlightId(e.target.value)
                      setSelectedSeats([])
                    }}
                    className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 px-4 focus:outline-none focus:border-primary text-sm font-medium"
                  >
                    <option value="">Select a flight option...</option>
                    {availableFlights
                      .filter(f => f.id !== rescheduleBooking.flight_id) // Exclude current flight
                      .map(f => (
                        <option key={f.id} value={f.id}>
                          {f.flight_no} ({f.origin} ➔ {f.destination}) - departs {new Date(f.departs_at).toLocaleDateString()} at {new Date(f.departs_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${f.base_price}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Seat Map mapping for the selected rescheduled flight */}
                {selectedFlightId && (
                  <div className="border border-border-dark/65 bg-slate-950/30 p-4 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select New Seats</span>
                      <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-emerald-950 bg-emerald-950/20 text-emerald-400 text-[10px] font-semibold">
                        <Wifi className="h-3 w-3 animate-pulse" />
                        {isConnected ? 'Realtime Connected' : 'Connecting...'}
                      </div>
                    </div>

                    {loadingSeats ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Select class matches old class */}
                        <p className="text-[11px] text-slate-400">
                          Select exactly {rescheduleBooking.passengers.length} seat(s) matching your original flight ticket cabin class.
                        </p>

                        <div className="flex justify-center max-h-[220px] overflow-y-auto no-scrollbar">
                          <div className="grid grid-cols-7 gap-1.5 p-3 bg-slate-950 rounded-2xl border border-border-dark">
                            {Array.from({ length: 10 }, (_, r) => {
                              const rowNum = r + 1
                              return (
                                <div key={rowNum} className="contents">
                                  {['A', 'B', 'C'].map((col) => {
                                    const seatNo = `${rowNum}${col}`
                                    const seat = newFlightSeats.find(s => s.seat_number === seatNo)
                                    const isSelected = selectedSeats.some(s => s.id === seat?.id)
                                    const isAvailable = seat?.is_available

                                    return (
                                      <button
                                        key={col}
                                        disabled={!isAvailable && !isSelected}
                                        onClick={() => seat && handleSeatClick(seat)}
                                        className={`h-7 w-7 text-[10px] font-bold rounded flex items-center justify-center transition-all ${
                                          isSelected
                                            ? 'bg-primary text-white'
                                            : !isAvailable
                                            ? 'bg-slate-900 border border-slate-800 text-slate-700 cursor-not-allowed'
                                            : 'bg-white border border-slate-300 text-slate-800 hover:text-primary cursor-pointer'
                                        }`}
                                      >
                                        {seatNo}
                                      </button>
                                    )
                                  })}
                                  <div className="flex items-center justify-center font-bold text-slate-600 text-[10px] w-4">
                                    {rowNum}
                                  </div>
                                  {['D', 'E', 'F'].map((col) => {
                                    const seatNo = `${rowNum}${col}`
                                    const seat = newFlightSeats.find(s => s.seat_number === seatNo)
                                    const isSelected = selectedSeats.some(s => s.id === seat?.id)
                                    const isAvailable = seat?.is_available

                                    return (
                                      <button
                                        key={col}
                                        disabled={!isAvailable && !isSelected}
                                        onClick={() => seat && handleSeatClick(seat)}
                                        className={`h-7 w-7 text-[10px] font-bold rounded flex items-center justify-center transition-all ${
                                          isSelected
                                            ? 'bg-primary text-white'
                                            : !isAvailable
                                            ? 'bg-slate-900 border border-slate-800 text-slate-700 cursor-not-allowed'
                                            : 'bg-white border border-slate-300 text-slate-800 hover:text-primary cursor-pointer'
                                        }`}
                                      >
                                        {seatNo}
                                      </button>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Modal footer submit */}
                <div className="flex gap-4 pt-4 border-t border-border-dark">
                  <button
                    onClick={() => setRescheduleBooking(null)}
                    className="flex-1 py-3 bg-slate-800 text-white hover:bg-slate-700 font-bold rounded-xl transition-all text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isRescheduleLoading || !selectedFlightId || selectedSeats.length !== rescheduleBooking.passengers.length}
                    onClick={handleRescheduleSubmit}
                    className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all text-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isRescheduleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Change'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

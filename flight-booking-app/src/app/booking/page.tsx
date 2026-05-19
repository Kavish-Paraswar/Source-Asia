'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plane, User, Shield, CreditCard, ChevronRight, CheckCircle2, 
  ChevronLeft, AlertCircle, Wifi, Users, Compass 
} from 'lucide-react'
import { useSearchStore } from '@/store/useSearchStore'
import { useBookingStore, PassengerInfo } from '@/store/useBookingStore'
import { useToastStore } from '@/store/useToastStore'
import { useRealtimeSeats } from '@/hooks/useRealtimeSeats'
import { createClient } from '@/lib/supabase/client'
import { bookSeatsAction } from '@/app/actions'
import { Database } from '@/types/database.types'

type Flight = Database['public']['Tables']['flights']['Row']

export default function BookingPage() {
  const router = useRouter()
  const { searchQuery, selectedFlightId } = useSearchStore()
  const { 
    selectedSeats, setSelectedSeats, 
    passengers, setPassengers,
    bookingStatus, setBookingStatus,
    bookingError, setBookingError,
    pnr, setPnr,
    reset: resetBooking
  } = useBookingStore()
  
  const { addToast } = useToastStore()
  
  // Realtime hook
  const { seats, loading: loadingSeats, isConnected } = useRealtimeSeats(selectedFlightId)

  // Local Wizard Step: 1 = Passengers, 2 = Seat Map, 3 = Confirm/Submit, 4 = Confirmed
  const [step, setStep] = useState(1)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [loadingFlight, setLoadingFlight] = useState(true)

  // Passenger form input state
  const [passengerForms, setPassengerForms] = useState<{ name: string; passportNumber: string }[]>([])

  // Payment states
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 16)
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ')
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4)
    let formatted = value
    if (value.length > 2) {
      formatted = value.substring(0, 2) + '/' + value.substring(2)
    }
    setCardExpiry(formatted)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 3)
    setCardCvv(value)
  }

  // Load flight details client-side
  useEffect(() => {
    if (!selectedFlightId) {
      addToast('No flight selected. Redirecting to search.', 'error')
      router.push('/')
      return
    }

    const supabase = createClient()
    setLoadingFlight(true)
    supabase
      .from('flights')
      .select('*')
      .eq('id', selectedFlightId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          addToast('Failed to load flight details.', 'error')
          router.push('/')
        } else {
          setFlight(data)
          // Initialize passenger forms based on search query
          const count = searchQuery?.passengers || 1
          setPassengerForms(Array.from({ length: count }, () => ({ name: '', passportNumber: '' })))
        }
        setLoadingFlight(false)
      })
  }, [selectedFlightId, searchQuery, router, addToast])

  if (loadingFlight || !flight || !searchQuery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Plane className="h-10 w-10 text-primary animate-pulse rotate-45 mb-4" />
        <p className="text-slate-400">Loading flight details...</p>
      </div>
    )
  }

  const passengersCount = searchQuery.passengers
  const selectedClass = searchQuery.class

  const handlePassengerSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validation
    const emptyField = passengerForms.some(f => !f.name.trim() || !f.passportNumber.trim())
    if (emptyField) {
      addToast('Please fill out all passenger details.', 'error')
      return
    }
    
    // Save to Zustand store
    setPassengers(passengerForms)
    setStep(2)
  }

  // Filter seats based on flight class selected during search
  const classSeats = seats.filter(s => s.class === selectedClass)

  const handleSeatClick = (seat: typeof seats[0]) => {
    if (!seat.is_available) {
      addToast('This seat is already occupied.', 'error')
      return
    }

    // Toggle logic (up to passengersCount seats)
    const exists = selectedSeats.find(s => s.id === seat.id)
    if (exists) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id))
    } else {
      if (selectedSeats.length >= passengersCount) {
        addToast(`You can only select up to ${passengersCount} seat${passengersCount > 1 ? 's' : ''}.`, 'info')
        return
      }
      setSelectedSeats([...selectedSeats, { id: seat.id, seatNumber: seat.seat_number }])
    }
  }

  const handleSeatSelectionSubmit = () => {
    if (selectedSeats.length !== passengersCount) {
      addToast(`Please select exactly ${passengersCount} seat${passengersCount > 1 ? 's' : ''}.`, 'error')
      return
    }
    if (passengers[0]?.name) {
      setCardName(passengers[0].name)
    }
    setStep(3)
  }

  const handleFinalBooking = async () => {
    // Payment validation
    if (!cardName.trim()) {
      addToast('Cardholder name is required.', 'error')
      return
    }
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      addToast('Please enter a valid 16-digit card number.', 'error')
      return
    }
    if (cardExpiry.length !== 5 || !cardExpiry.includes('/')) {
      addToast('Please enter a valid expiration date (MM/YY).', 'error')
      return
    }
    if (cardCvv.length !== 3) {
      addToast('Please enter a valid 3-digit CVV.', 'error')
      return
    }

    setBookingStatus('submitting')
    setBookingError(null)

    // Map passengers to selected seats
    const finalPassengers = passengers.map((p, index) => ({
      ...p,
      seatId: selectedSeats[index].id,
      seatNumber: selectedSeats[index].seatNumber
    }))

    try {
      const result = await bookSeatsAction(flight.id, finalPassengers)
      setPnr(result.pnr)
      setBookingStatus('confirmed')
      setStep(4)
      addToast('Flight booked successfully!', 'success')
    } catch (err: any) {
      console.error(err)
      setBookingStatus('failed')
      setBookingError(err.message || 'An error occurred during booking.')
      addToast(err.message || 'Booking failed. Reselect seats and try again.', 'error')
      // Rollback to step 2 so user can choose available seats
      setStep(2)
    }
  }

  const basePriceMultiplier = selectedClass === 'first' ? 3.5 : selectedClass === 'business' ? 2 : 1
  const totalPrice = Math.round(flight.base_price * basePriceMultiplier * passengersCount)

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Step Indicators */}
      <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
        {[
          { label: 'Travelers', s: 1 },
          { label: 'Seats', s: 2 },
          { label: 'Confirm', s: 3 },
          { label: 'Success', s: 4 }
        ].map((item, index) => (
          <div key={item.s} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all ${
                step >= item.s 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-slate-900 border-border-dark text-slate-500'
              }`}>
                {step > item.s ? '✓' : item.s}
              </div>
              <span className={`text-xs mt-1 font-semibold ${step >= item.s ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
            </div>
            {index < 3 && (
              <div className={`h-[2px] flex-1 mx-2 ${step > item.s ? 'bg-primary' : 'bg-slate-800'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: PASSENGERS */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="glass-premium rounded-3xl p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <User className="text-primary h-6 w-6" /> Passenger Information
              </h2>
              
              <form onSubmit={handlePassengerSubmit} className="space-y-6">
                {passengerForms.map((form, index) => (
                  <div key={index} className="space-y-4 border-b border-border-dark/50 pb-6 last:border-b-0 last:pb-0">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      Passenger #{index + 1}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Full Name</label>
                        <input 
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => {
                            const newForms = [...passengerForms]
                            newForms[index].name = e.target.value
                            setPassengerForms(newForms)
                          }}
                          placeholder="e.g. John Doe"
                          className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 px-4 focus:outline-none focus:border-primary font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Passport Number</label>
                        <input 
                          type="text"
                          required
                          value={form.passportNumber}
                          onChange={(e) => {
                            const newForms = [...passengerForms]
                            newForms[index].passportNumber = e.target.value
                            setPassengerForms(newForms)
                          }}
                          placeholder="e.g. A12345678"
                          className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 px-4 focus:outline-none focus:border-primary font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all cursor-pointer"
                  >
                    Select Seats <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* STEP 2: SEATS */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="glass-premium rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Plane className="text-primary h-6 w-6 rotate-45" /> Select Seats ({selectedClass})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select exactly {passengersCount} seat{passengersCount > 1 ? 's' : ''} in the {selectedClass} class cabin.
                  </p>
                </div>
                {/* Realtime status banner */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-950 bg-emerald-950/20 text-emerald-400 text-xs font-semibold">
                  <Wifi className="h-3 w-3 animate-pulse" />
                  {isConnected ? 'Realtime Connected' : 'Connecting...'}
                </div>
              </div>

              {loadingSeats ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Plane className="h-8 w-8 text-primary animate-pulse rotate-45 mb-2" />
                  <p className="text-slate-400 text-sm">Loading cabin map...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Seat Map Legend */}
                  <div className="flex justify-center gap-6 text-sm border-b border-border-dark pb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-white border border-slate-300 rounded" />
                      <span className="text-slate-400">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-primary rounded" />
                      <span className="text-slate-400">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-slate-800 border border-slate-700 rounded" />
                      <span className="text-slate-400">Occupied</span>
                    </div>
                  </div>

                  {/* Seat Grid Layout */}
                  <div className="flex justify-center overflow-x-auto py-4 no-scrollbar">
                    <div className="grid grid-cols-7 gap-2 min-w-[320px] bg-slate-950/50 p-6 rounded-3xl border border-border-dark">
                      {/* Row markers and Seats */}
                      {Array.from({ length: 10 }, (_, r) => {
                        const rowNum = r + 1
                        const rowClass = rowNum <= 2 ? 'business' : 'economy'
                        const isClassMatch = rowClass === selectedClass

                        return (
                          <div key={rowNum} className="contents">
                            {['A', 'B', 'C'].map((col) => {
                              const seatNo = `${rowNum}${col}`
                              const seat = seats.find(s => s.seat_number === seatNo)
                              const isSelected = selectedSeats.some(s => s.id === seat?.id)
                              const isAvailable = seat?.is_available && isClassMatch

                              return (
                                <button
                                  key={col}
                                  onClick={() => seat && isClassMatch && handleSeatClick(seat)}
                                  disabled={!isAvailable && !isSelected}
                                  className={`h-10 w-10 text-xs font-bold rounded flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-primary text-white shadow-lg' 
                                      : !isClassMatch 
                                      ? 'bg-slate-900 border border-slate-800 text-slate-700 cursor-not-allowed'
                                      : !seat?.is_available 
                                      ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                                      : 'bg-white border border-slate-300 text-slate-850 hover:border-primary hover:text-primary cursor-pointer'
                                  }`}
                                >
                                  {seatNo}
                                </button>
                              )
                            })}

                            {/* Aisle */}
                            <div className="flex items-center justify-center font-bold text-slate-500 text-xs w-6">
                              {rowNum}
                            </div>

                            {['D', 'E', 'F'].map((col) => {
                              const seatNo = `${rowNum}${col}`
                              const seat = seats.find(s => s.seat_number === seatNo)
                              const isSelected = selectedSeats.some(s => s.id === seat?.id)
                              const isAvailable = seat?.is_available && isClassMatch

                              return (
                                <button
                                  key={col}
                                  onClick={() => seat && isClassMatch && handleSeatClick(seat)}
                                  disabled={!isAvailable && !isSelected}
                                  className={`h-10 w-10 text-xs font-bold rounded flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-primary text-white shadow-lg' 
                                      : !isClassMatch 
                                      ? 'bg-slate-900 border border-slate-800 text-slate-700 cursor-not-allowed'
                                      : !seat?.is_available 
                                      ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                                      : 'bg-white border border-slate-300 text-slate-850 hover:border-primary hover:text-primary cursor-pointer'
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

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4 border-t border-border-dark">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" /> Passenger Info
                    </button>
                    <button
                      onClick={handleSeatSelectionSubmit}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all cursor-pointer"
                    >
                      Review & Book <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 3: CONFIRM */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Flight & Passenger Summaries */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Flight summary */}
                <div className="glass-premium rounded-3xl p-6 border border-border-dark">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Flight Details</h3>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Flight No.</span>
                      <span className="text-lg font-bold text-white">{flight.flight_no}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-semibold block">Cabin Cabin</span>
                      <span className="text-sm font-bold text-primary capitalize">{selectedClass}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Departs</span>
                      <span className="font-semibold text-white">{flight.origin}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">{new Date(flight.departs_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">Arrives</span>
                      <span className="font-semibold text-white">{flight.destination}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">{new Date(flight.arrives_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Passengers details overview */}
                <div className="glass-premium rounded-3xl p-6 border border-border-dark">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Passenger & Seat Summary</h3>
                  <div className="space-y-3">
                    {passengers.map((p, index) => (
                      <div key={index} className="flex justify-between items-center text-sm border-b border-border-dark/55 pb-2.5 last:border-0 last:pb-0">
                        <div>
                          <span className="font-bold text-white block">{p.name}</span>
                          <span className="text-xs text-slate-400">Passport: {p.passportNumber}</span>
                        </div>
                        <div className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary-light font-bold rounded-lg text-xs">
                          Seat {selectedSeats[index]?.seatNumber || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price summary */}
                <div className="glass-premium rounded-3xl p-6 border border-border-dark">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Fare Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Class Rate</span>
                      <span className="text-white capitalize font-semibold">{selectedClass}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Passengers Count</span>
                      <span className="text-white font-semibold">{passengersCount}</span>
                    </div>
                    <div className="flex justify-between border-t border-border-dark/50 pt-3 mt-3">
                      <span className="text-base font-bold text-white">Total Charge</span>
                      <span className="text-2xl font-extrabold text-primary">${totalPrice}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Interactive Payment Form */}
              <div className="lg:col-span-6 glass-premium rounded-3xl p-6 border border-border-dark space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Payment Details</h3>

                {/* Animated Credit Card Visual Graphic */}
                <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-900 via-primary-dark/40 to-primary-light/35 p-5 flex flex-col justify-between border border-white/10 relative overflow-hidden shadow-2xl">
                  {/* Decorative card background details */}
                  <div className="absolute right-[-40px] top-[-40px] w-36 h-36 bg-white/5 rounded-full blur-xl" />
                  
                  <div className="flex justify-between items-start z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-7 bg-amber-500/80 rounded-md border border-amber-600/30 flex items-center justify-center">
                        {/* Metallic chip graphic */}
                        <div className="grid grid-cols-3 gap-0.5 w-6 h-4">
                          <div className="border border-amber-450/40 rounded-sm" />
                          <div className="border border-amber-450/40 rounded-sm" />
                          <div className="border border-amber-450/40 rounded-sm" />
                        </div>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">SkyGlide Pay</span>
                    </div>
                    <div className="text-white/80 font-bold italic tracking-wide text-sm">VISA</div>
                  </div>

                  <div className="text-lg sm:text-xl font-mono text-white tracking-widest z-10 my-4 text-center">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex justify-between items-end z-10">
                    <div>
                      <span className="text-[8px] text-white/50 uppercase tracking-wider block">Cardholder</span>
                      <span className="text-xs font-semibold text-white uppercase tracking-wide block truncate max-w-[150px]">
                        {cardName || 'Cardholder Name'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-white/50 uppercase tracking-wider block">Expires</span>
                      <span className="text-xs font-semibold text-white font-mono block">
                        {cardExpiry || 'MM/YY'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Input fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 px-4 focus:outline-none focus:border-primary text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary text-sm font-medium"
                      />
                      <CreditCard className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Expiry Date</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 px-4 focus:outline-none focus:border-primary text-sm font-medium text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">CVV</label>
                      <input
                        type="password"
                        required
                        value={cardCvv}
                        onChange={handleCvvChange}
                        placeholder="•••"
                        className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 px-4 focus:outline-none focus:border-primary text-sm font-medium text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Step Actions footer */}
                <div className="flex justify-between items-center pt-4 border-t border-border-dark/50">
                  <button
                    disabled={bookingStatus === 'submitting'}
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" /> Change Seats
                  </button>
                  <button
                    disabled={bookingStatus === 'submitting'}
                    onClick={handleFinalBooking}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-50 text-sm"
                  >
                    {bookingStatus === 'submitting' ? 'Securing Seat...' : `Confirm & Pay $${totalPrice}`}
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-md mx-auto"
          >
            <div className="glass-premium rounded-3xl p-8 text-center border border-emerald-950/40 relative overflow-hidden">
              {/* Confetti / spark design */}
              <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

              <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-6" />
              <h2 className="text-3xl font-extrabold text-white mb-2">Booking Confirmed!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Your flight reservation has been secured. Your digital boarding details are linked below.
              </p>

              {/* PNR Code */}
              <div className="bg-slate-950/70 border border-border-dark p-6 rounded-2xl mb-8 relative">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold block mb-1">Booking Reference (PNR)</span>
                <span className="text-4xl font-extrabold text-primary tracking-widest uppercase">{pnr || 'PNR123'}</span>
              </div>

              {/* Navigation button */}
              <button
                onClick={() => {
                  resetBooking()
                  router.push('/my-bookings')
                }}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all cursor-pointer"
              >
                Go to My Bookings <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

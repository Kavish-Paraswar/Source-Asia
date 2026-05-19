'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plane, Clock, Shield, Sparkles, Filter, ChevronDown, CheckCircle } from 'lucide-react'
import { useSearchStore } from '@/store/useSearchStore'
import { useBookingStore } from '@/store/useBookingStore'
import { useToastStore } from '@/store/useToastStore'
import { Database } from '@/types/database.types'

type Flight = Database['public']['Tables']['flights']['Row']

interface ResultsListProps {
  initialFlights: Flight[]
  seatCounts: Record<string, number>
  passengersCount: number
  selectedClass: 'economy' | 'business' | 'first'
}

export default function ResultsList({ 
  initialFlights, 
  seatCounts, 
  passengersCount, 
  selectedClass 
}: ResultsListProps) {
  const router = useRouter()
  const { setSelectedFlightId } = useSearchStore()
  const { reset: resetBooking } = useBookingStore()
  const { addToast } = useToastStore()

  // States
  const [flights, setFlights] = useState<Flight[]>(initialFlights)
  const [sortBy, setSortBy] = useState<'price' | 'time'>('price')
  const [maxPrice, setMaxPrice] = useState<number>(1200)

  // Class price multiplier
  const getClassMultiplier = () => {
    if (selectedClass === 'first') return 3.5
    if (selectedClass === 'business') return 2.0
    return 1.0
  }

  const getPrice = (base: number) => {
    return Math.round(base * getClassMultiplier() * passengersCount)
  }

  // Handle Select Flight
  const handleSelectFlight = (flightId: string) => {
    setSelectedFlightId(flightId)
    resetBooking() // Clean old selection
    addToast('Flight selected. Proceeding to passenger details and seat mapping.', 'success')
    router.push('/booking')
  }

  // Filter & Sort logic
  const filteredFlights = flights
    .filter(f => getPrice(f.base_price) <= maxPrice)
    .sort((a, b) => {
      if (sortBy === 'price') {
        return getPrice(a.base_price) - getPrice(b.base_price)
      }
      // Sort by departure time
      return new Date(a.departs_at).getTime() - new Date(b.departs_at).getTime()
    })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar Filters */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass rounded-2xl p-6 border border-border-dark">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" /> Filter Flights
          </h3>

          {/* Sort selection */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Sort By</label>
            <select 
              value={sortBy} 
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-2.5 px-3 focus:outline-none focus:border-primary text-sm font-medium"
            >
              <option value="price">Price (Lowest First)</option>
              <option value="time">Departure Time (Earliest First)</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Max Price</span>
              <span className="text-white">${maxPrice}</span>
            </div>
            <input 
              type="range" 
              min={100} 
              max={2000} 
              step={50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary bg-slate-800 rounded-lg appearance-none h-1.5"
            />
          </div>
        </div>
      </div>

      {/* Flight Cards List */}
      <div className="lg:col-span-3 space-y-4">
        {filteredFlights.map((flight) => {
          const price = getPrice(flight.base_price)
          const availableSeats = seatCounts[flight.id] || 0
          const departs = new Date(flight.departs_at)
          const arrives = new Date(flight.arrives_at)

          // Calculate duration
          const durationDiffMs = arrives.getTime() - departs.getTime()
          const durationHours = Math.floor(durationDiffMs / (1000 * 60 * 60))
          const durationMins = Math.floor((durationDiffMs % (1000 * 60 * 60)) / (1000 * 60))

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={flight.id}
              className="glass hover:border-primary/30 transition-all rounded-2xl overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative group"
            >
              {/* Route & Times */}
              <div className="flex-1 w-full grid grid-cols-3 gap-4 items-center">
                {/* Departs */}
                <div className="text-left">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Departs</span>
                  <p className="text-2xl font-bold text-white mt-1">
                    {departs.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-slate-400">{flight.origin}</p>
                </div>

                {/* Duration visual */}
                <div className="flex flex-col items-center justify-center relative px-2">
                  <span className="text-xs text-slate-400 font-medium mb-1">
                    {durationHours}h {durationMins}m
                  </span>
                  <div className="w-full flex items-center justify-center gap-1">
                    <div className="h-[2px] flex-1 bg-border-dark relative" />
                    <Plane className="h-4 w-4 text-primary shrink-0 rotate-90" />
                    <div className="h-[2px] flex-1 bg-border-dark relative" />
                  </div>
                  <span className="text-xs text-primary-light mt-1 font-semibold uppercase tracking-wider">Direct</span>
                </div>

                {/* Arrives */}
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Arrives</span>
                  <p className="text-2xl font-bold text-white mt-1">
                    {arrives.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-slate-400">{flight.destination}</p>
                </div>
              </div>

              {/* Price & Action */}
              <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto border-t md:border-t-0 md:border-l border-border-dark pt-6 md:pt-0 md:pl-8 gap-4 min-w-[150px]">
                <div className="text-left md:text-center">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Total Price</span>
                  <span className="text-3xl font-extrabold text-white">${price}</span>
                  <span className="text-xs text-slate-400 block mt-0.5 capitalize">
                    {selectedClass} class • {passengersCount} traveler{passengersCount > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-col gap-2 w-auto md:w-full">
                  <button
                    onClick={() => handleSelectFlight(flight.id)}
                    disabled={availableSeats < passengersCount}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all text-center cursor-pointer ${
                      availableSeats >= passengersCount 
                        ? 'bg-primary hover:bg-primary-dark shadow-primary/25' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-700'
                    }`}
                  >
                    {availableSeats >= passengersCount ? 'Select Flight' : 'Sold Out'}
                  </button>
                  <span className={`text-[11px] font-semibold text-center uppercase tracking-wider ${
                    availableSeats > 10 
                      ? 'text-emerald-400' 
                      : availableSeats > 0 
                      ? 'text-yellow-400' 
                      : 'text-red-400'
                  }`}>
                    {availableSeats} seats left
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
  Search, MapPin, Calendar, Users, Shield, Zap, Sparkles, 
  Wifi, HelpCircle, ArrowRightLeft, ArrowRight, Star
} from 'lucide-react'
import { useSearchStore } from '@/store/useSearchStore'
import { useToastStore } from '@/store/useToastStore'

export default function HomePage() {
  const router = useRouter()
  const { setSearchQuery, addRecentSearch } = useSearchStore()
  const { addToast } = useToastStore()

  // Form states
  const [origin, setOrigin] = useState('SIN')
  const [destination, setDestination] = useState('BKK')
  const [departsAt, setDepartsAt] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [flightClass, setFlightClass] = useState<'economy' | 'business' | 'first'>('economy')

  const handleSwapAirports = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    if (!departsAt) {
      addToast('Please select a departure date.', 'error')
      return
    }

    const query = {
      origin,
      destination,
      departsAt,
      passengers,
      class: flightClass
    }

    setSearchQuery(query)
    addRecentSearch(query)

    addToast('Searching for flights...', 'info')
    router.push(`/results?origin=${origin}&destination=${destination}&departsAt=${departsAt}&passengers=${passengers}&class=${flightClass}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      {/* Background visual element */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-background-dark to-background-dark" />

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Headline and Copy */}
          <div className="lg:col-span-6 space-y-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Glide Through the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-purple">Sky</span> Effortlessly
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-400 max-w-lg"
            >
              Experience the next generation of flight booking. Realtime seat maps, instant reservations, and offline booking recovery
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative rounded-2xl overflow-hidden border border-border-dark aspect-video w-full max-w-md shadow-2xl"
            >
              <Image 
                src="/flight_hero.png" 
                alt="SkyGlide Futuristic Airplane"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent" />
            </motion.div>
          </div>

          {/* Search Box Card */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-6"
          >
            <div className="glass-premium rounded-3xl p-6 sm:p-8 relative">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Search className="text-primary h-6 w-6" /> Find Your Next Escape
              </h2>

              <form onSubmit={handleSearch} className="space-y-6">
                {/* Airports Swap Group */}
                <div className="grid grid-cols-1 md:grid-cols-9 gap-2 items-center relative">
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Origin</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <select 
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 pl-10 pr-4 appearance-none focus:outline-none focus:border-primary font-medium"
                      >
                        <option value="SIN">SIN - Singapore Changi</option>
                        <option value="BKK">BKK - Suvarnabhumi, Bangkok</option>
                        <option value="NRT">NRT - Narita, Tokyo</option>
                        <option value="SFO">SFO - San Francisco Intl</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center md:col-span-1 pt-4 md:pt-0">
                    <button 
                      type="button" 
                      onClick={handleSwapAirports}
                      className="p-2 rounded-xl bg-slate-800 border border-border-dark text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-md"
                    >
                      <ArrowRightLeft className="h-5 w-5 md:rotate-90" />
                    </button>
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Destination</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <select 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 pl-10 pr-4 appearance-none focus:outline-none focus:border-primary font-medium"
                      >
                        <option value="BKK">BKK - Suvarnabhumi, Bangkok</option>
                        <option value="SIN">SIN - Singapore Changi</option>
                        <option value="NRT">NRT - Narita, Tokyo</option>
                        <option value="SFO">SFO - San Francisco Intl</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Departure Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                    <input 
                      type="date"
                      value={departsAt}
                      onChange={(e) => setDepartsAt(e.target.value)}
                      className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>

                {/* Passengers & Class Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Passengers</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <select 
                        value={passengers}
                        onChange={(e) => setPassengers(Number(e.target.value))}
                        className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 pl-10 pr-4 appearance-none focus:outline-none focus:border-primary font-medium"
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num} Passenger{num > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Class</label>
                    <div className="relative">
                      <Sparkles className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <select 
                        value={flightClass}
                        onChange={(e) => setFlightClass(e.target.value as any)}
                        className="w-full bg-slate-950/80 border border-border-dark text-white rounded-xl py-3 pl-10 pr-4 appearance-none focus:outline-none focus:border-primary font-medium"
                      >
                        <option value="economy">Economy Class</option>
                        <option value="business">Business Class</option>
                        <option value="first">First Class</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all cursor-pointer text-lg"
                >
                  <Search className="h-5 w-5" /> Search Flights
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Why Choose Us */}
      <section className="mx-auto max-w-7xl px-4 mt-24 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-3xl font-extrabold text-white text-center mb-12">
          Why Choose <span className="text-primary">SkyGlide</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900/50 border border-border-dark p-6 rounded-2xl">
            <Zap className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Realtime Seat Synced</h3>
            <p className="text-slate-400">
              Live updates directly via Supabase Realtime ensure that you never experience double seat booking.
            </p>
          </div>
          <div className="bg-slate-900/50 border border-border-dark p-6 rounded-2xl">
            <Shield className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Row Level Security</h3>
            <p className="text-slate-400">
              Your personal data and booking history is secured at the DB level, allowing access only to you.
            </p>
          </div>
          <div className="bg-slate-900/50 border border-border-dark p-6 rounded-2xl">
            <Wifi className="h-10 w-10 text-primary mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Offline Ready PWA</h3>
            <p className="text-slate-400">
              Access your saved boarding passes and PNR codes even when flying with no network connection.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Routes */}
      <section className="mx-auto max-w-7xl px-4 mt-24 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-extrabold text-white">Popular Destinations</h2>
            <p className="text-slate-400 mt-2">Curated luxury travel options for your next adventure.</p>
          </div>
          <button 
            onClick={() => addToast('More destinations coming soon!', 'info')}
            className="flex items-center gap-1 text-primary font-semibold hover:underline"
          >
            See All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { from: 'SIN', to: 'BKK', name: 'Bangkok, Thailand', price: '$150', rating: 4.8, img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=600&auto=format&fit=crop' },
            { from: 'NRT', to: 'SFO', name: 'San Francisco, USA', price: '$850', rating: 4.9, img: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=600&auto=format&fit=crop' },
            { from: 'SIN', to: 'NRT', name: 'Tokyo, Japan', price: '$520', rating: 4.95, img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop' }
          ].map((dest, idx) => (
            <motion.div
              whileHover={{ y: -8 }}
              key={idx}
              className="bg-slate-900/60 border border-border-dark overflow-hidden rounded-2xl relative shadow-lg group"
            >
              <div className="relative h-48 w-full">
                <img 
                  src={dest.img} 
                  alt={dest.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-950/70 border border-border-dark text-xs font-bold text-white flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" /> {dest.rating}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white">{dest.name}</h3>
                <p className="text-slate-400 text-sm mt-1">{dest.from} to {dest.to}</p>
                <div className="flex justify-between items-center mt-6">
                  <div>
                    <span className="text-xs text-slate-400">Starting from</span>
                    <p className="text-lg font-extrabold text-primary">{dest.price}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setOrigin(dest.from)
                      setDestination(dest.to)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      addToast(`Selected route ${dest.from} ➔ ${dest.to}`, 'success')
                    }}
                    className="p-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 hover:text-primary transition-all"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

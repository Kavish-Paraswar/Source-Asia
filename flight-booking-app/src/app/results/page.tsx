import { createClient } from '@/lib/supabase/server'
import ResultsList from '@/components/ResultsList'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    origin?: string
    destination?: string
    departsAt?: string
    passengers?: string
    class?: string
  }>
}

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const origin = params.origin || 'SIN'
  const destination = params.destination || 'BKK'
  const departsAt = params.departsAt || ''
  const passengers = Number(params.passengers || '1')
  const flightClass = (params.class || 'economy') as 'economy' | 'business' | 'first'

  const supabase = await createClient()

  // Fetch flights matching origin & destination
  const { data: flights, error } = await supabase
    .from('flights')
    .select('*')
    .eq('origin', origin)
    .eq('destination', destination)
    .order('base_price', { ascending: true })

  if (error) {
    console.error('Error fetching flights:', error)
  }

  // Fetch available seats count per flight to display on results
  const flightIds = flights?.map((f) => f.id) || []
  let seatCounts: Record<string, number> = {}

  if (flightIds.length > 0) {
    const { data: seatsData } = await supabase
      .from('seats')
      .select('flight_id, is_available')
      .in('flight_id', flightIds)
      .eq('is_available', true)

    if (seatsData) {
      seatsData.forEach((s) => {
        if (s.flight_id) {
          seatCounts[s.flight_id] = (seatCounts[s.flight_id] || 0) + 1
        }
      })
    }
  }

  return (
    <div className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link 
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 group transition-colors"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Search
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Available Flights
          </h1>
          <p className="text-slate-400 mt-1">
            {origin} to {destination} • {departsAt || 'Any Date'} • {passengers} Passenger{passengers > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {flights && flights.length > 0 ? (
        <ResultsList 
          initialFlights={flights} 
          seatCounts={seatCounts} 
          passengersCount={passengers} 
          selectedClass={flightClass} 
        />
      ) : (
        <div className="glass-premium rounded-3xl p-12 text-center">
          <h3 className="text-xl font-bold text-white mb-2">No Flights Found</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            We couldn't find any direct flights from {origin} to {destination} on the selected criteria. Try checking SIN to BKK or NRT to SFO.
          </p>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-all"
          >
            Modify Search
          </Link>
        </div>
      )}
    </div>
  )
}

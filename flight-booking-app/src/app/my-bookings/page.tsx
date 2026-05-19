import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import MyBookingsList from '@/components/MyBookingsList'
import { Plane, LogIn } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MyBookingsPage() {
  const supabase = await createClient()

  // Get logged-in user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="mx-auto max-w-md w-full px-4 py-16 text-center">
        <div className="glass-premium rounded-3xl p-8 border border-border-dark flex flex-col items-center">
          <LogIn className="h-12 w-12 text-primary mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-slate-400 text-sm mb-6">
            You must be logged in to view and manage your flight bookings. Use the Demo Login button in the top navigation.
          </p>
        </div>
      </div>
    )
  }

  // Fetch user bookings with related flight and passenger/seat info
  // Since we have relationships:
  // - bookings -> flights (on flight_id)
  // - passengers -> bookings (on booking_id)
  // - passengers -> seats (on seat_id)
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      pnr,
      status,
      total_price,
      created_at,
      flight_id,
      flights (
        id,
        flight_no,
        origin,
        destination,
        departs_at,
        arrives_at,
        base_price
      ),
      passengers (
        id,
        name,
        passport_number,
        seat_id,
        seats (
          id,
          seat_number,
          class
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
  }

  // Also fetch all available flights for the reschedule search dropdown
  const { data: availableFlights } = await supabase
    .from('flights')
    .select('*')
    .order('departs_at', { ascending: true })

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">My Reservations</h1>
        <p className="text-slate-400 mt-1">Manage your active flight bookings, view boarding passes, and reschedule or cancel tickets.</p>
      </div>

      <MyBookingsList 
        initialBookings={bookings || []} 
        userId={user.id} 
        availableFlights={availableFlights || []}
      />
    </div>
  )
}

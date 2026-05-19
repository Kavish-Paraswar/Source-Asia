import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type Seat = Database['public']['Tables']['seats']['Row']

export function useRealtimeSeats(flightId: string | null) {
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    if (!flightId) {
      setSeats([])
      setLoading(false)
      return
    }

    const supabase = createClient()
    setLoading(true)

    // Step 1: Initial Fetch
    supabase
      .from('seats')
      .select('*')
      .eq('flight_id', flightId)
      .then(({ data, error }) => {
        if (!error && data) {
          setSeats(data)
        }
        setLoading(false)
      })

    // Step 2: Subscribe to changes (Optimized per-flight)
    const channel = supabase
      .channel(`seats_flight_${flightId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seats',
          filter: `flight_id=eq.${flightId}`,
        },
        (payload) => {
          const updatedSeat = payload.new as Seat
          const deletedSeat = payload.old as Seat

          setSeats((prevSeats) => {
            if (payload.eventType === 'DELETE') {
              return prevSeats.filter((s) => s.id !== deletedSeat.id)
            }
            if (payload.eventType === 'INSERT') {
              return [...prevSeats, updatedSeat]
            }
            // UPDATE
            return prevSeats.map((s) => (s.id === updatedSeat.id ? updatedSeat : s))
          })
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Step 3: Cleanup subscription on unmount or flight change
    return () => {
      supabase.removeChannel(channel)
    }
  }, [flightId])

  return { seats, loading, isConnected }
}

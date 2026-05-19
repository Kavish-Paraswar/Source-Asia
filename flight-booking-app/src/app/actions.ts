'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to generate a 6-character PNR
function generatePNR(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let pnr = ''
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pnr
}

export async function bookSeatsAction(
  flightId: string,
  passengers: { name: string; passportNumber: string; seatId: string; seatNumber: string }[]
) {
  const supabase = await createClient()

  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized. Please log in to complete booking.')
  }

  const seatIds = passengers.map(p => p.seatId)

  // Step 1: Call RPC to reserve and lock seats atomically
  const { data: reserveSuccess, error: rpcError } = await supabase.rpc('reserve_seats', {
    p_flight_id: flightId,
    p_seat_ids: seatIds,
    p_user_id: user.id
  })

  if (rpcError || !reserveSuccess) {
    throw new Error(rpcError?.message || 'Failed to secure selected seats. They may have just been booked.')
  }

  // Step 2: Calculate total price
  const { data: flight, error: flightError } = await supabase
    .from('flights')
    .select('base_price')
    .eq('id', flightId)
    .single()

  if (flightError || !flight) {
    // Revert seats if flight lookup fails
    await supabase.from('seats').update({ is_available: true, locked_by: null, locked_until: null }).in('id', seatIds)
    throw new Error('Flight details not found.')
  }

  const totalPrice = flight.base_price * passengers.length
  const pnr = generatePNR()

  // Step 3: Insert the booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      flight_id: flightId,
      pnr,
      total_price: totalPrice,
      status: 'confirmed'
    })
    .select()
    .single()

  if (bookingError || !booking) {
    // Revert seats if booking creation fails
    await supabase.from('seats').update({ is_available: true, locked_by: null, locked_until: null }).in('id', seatIds)
    throw new Error('Failed to create booking: ' + bookingError?.message)
  }

  // Step 4: Insert the passengers and link them to their seats
  const passengerInserts = passengers.map(p => ({
    booking_id: booking.id,
    name: p.name,
    passport_number: p.passportNumber,
    seat_id: p.seatId
  }))

  const { error: passengerError } = await supabase
    .from('passengers')
    .insert(passengerInserts)

  if (passengerError) {
    // Clean up booking and revert seats if passenger insert fails
    await supabase.from('bookings').delete().eq('id', booking.id)
    await supabase.from('seats').update({ is_available: true, locked_by: null, locked_until: null }).in('id', seatIds)
    throw new Error('Failed to save passenger details: ' + passengerError.message)
  }

  revalidatePath('/my-bookings')
  revalidatePath('/results')
  return { pnr, bookingId: booking.id }
}

export async function cancelBookingAction(bookingId: string) {
  const supabase = await createClient()

  // Get current booking and its passengers/seats
  const { data: booking, error: bookingLookupError } = await supabase
    .from('bookings')
    .select('id, status, flight_id, passengers(seat_id)')
    .eq('id', bookingId)
    .single()

  if (bookingLookupError || !booking) {
    throw new Error('Booking not found.')
  }

  if (booking.status === 'cancelled') {
    throw new Error('Booking is already cancelled.')
  }

  // Step 1: Update status to 'cancelled' (trigger will check 2-hour rule)
  const { error: cancelError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (cancelError) {
    throw new Error(cancelError.message)
  }

  // Step 2: Release the seats
  const seatIds = booking.passengers
    .map(p => p.seat_id)
    .filter((id): id is string => id !== null)

  if (seatIds.length > 0) {
    const { error: seatReleaseError } = await supabase
      .from('seats')
      .update({
        is_available: true,
        locked_by: null,
        locked_until: null
      })
      .in('id', seatIds)

    if (seatReleaseError) {
      console.error('Failed to release seats on cancel:', seatReleaseError.message)
    }
  }

  revalidatePath('/my-bookings')
  revalidatePath('/results')
  return { success: true }
}

export async function rescheduleBookingAction(
  oldBookingId: string,
  newFlightId: string,
  newSeatSelections: { seatId: string; seatNumber: string; name: string; passportNumber: string }[]
) {
  const supabase = await createClient()

  // Fetch old booking details
  const { data: oldBooking, error: oldBookingError } = await supabase
    .from('bookings')
    .select('id, flight_id, status, passengers(seat_id)')
    .eq('id', oldBookingId)
    .single()

  if (oldBookingError || !oldBooking) {
    throw new Error('Original booking not found.')
  }

  if (oldBooking.status === 'cancelled') {
    throw new Error('Cannot reschedule a cancelled booking.')
  }

  // Step 1: Create the new booking using our standard bookSeatsAction logic
  const bookResult = await bookSeatsAction(newFlightId, newSeatSelections)

  // Step 2: Cancel the old booking (releasing old seats and checking the 2-hour rule)
  try {
    await cancelBookingAction(oldBookingId)
  } catch (cancelError: any) {
    // If cancellation of the old booking fails (e.g. within 2 hours), roll back the new booking!
    await cancelBookingAction(bookResult.bookingId)
    throw new Error(`Failed to reschedule: ${cancelError.message || 'Late cancellation rule violated.'}`)
  }

  // Step 3: Insert reschedule log
  await supabase
    .from('reschedules')
    .insert({
      old_booking_id: oldBookingId,
      new_booking_id: bookResult.bookingId,
      reason: 'User initiated reschedule'
    })

  revalidatePath('/my-bookings')
  return { success: true, newPnr: bookResult.pnr }
}

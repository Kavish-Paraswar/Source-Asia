-- Schema: flights
CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_no VARCHAR NOT NULL,
    origin VARCHAR NOT NULL,
    destination VARCHAR NOT NULL,
    departs_at TIMESTAMPTZ NOT NULL,
    arrives_at TIMESTAMPTZ NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR DEFAULT 'scheduled'
);

-- Schema: seats
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flight_id UUID REFERENCES flights(id) ON DELETE CASCADE,
    seat_number VARCHAR NOT NULL,
    class VARCHAR NOT NULL,
    is_available BOOLEAN DEFAULT true,
    locked_until TIMESTAMPTZ,
    locked_by UUID REFERENCES auth.users(id),
    UNIQUE(flight_id, seat_number)
);

-- Schema: bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    flight_id UUID REFERENCES flights(id) NOT NULL,
    pnr VARCHAR NOT NULL UNIQUE,
    status VARCHAR DEFAULT 'confirmed',
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Schema: passengers
CREATE TABLE passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    passport_number VARCHAR NOT NULL,
    seat_id UUID REFERENCES seats(id) ON DELETE SET NULL
);

-- Schema: reschedules
CREATE TABLE reschedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    new_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to flights" ON flights FOR SELECT USING (true);
CREATE POLICY "Public read access to seats" ON seats FOR SELECT USING (true);

-- Users can only read their own bookings and passengers
CREATE POLICY "Users can view their own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own passengers" ON passengers FOR SELECT USING (EXISTS (
  SELECT 1 FROM bookings WHERE bookings.id = passengers.booking_id AND bookings.user_id = auth.uid()
));
CREATE POLICY "Users can insert their own passengers" ON passengers FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM bookings WHERE bookings.id = passengers.booking_id AND bookings.user_id = auth.uid()
));

-- RPC: reserve_seats
CREATE OR REPLACE FUNCTION reserve_seats(
  p_flight_id UUID,
  p_seat_ids UUID[],
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_count INT;
BEGIN
  -- Attempt to lock seats using SELECT ... FOR UPDATE
  WITH locked_seats AS (
    SELECT id FROM seats
    WHERE id = ANY(p_seat_ids)
      AND flight_id = p_flight_id
      AND (is_available = true OR (locked_by = p_user_id AND locked_until > now()))
    FOR UPDATE
  )
  UPDATE seats
  SET is_available = false,
      locked_by = p_user_id,
      locked_until = now() + interval '15 minutes'
  WHERE id IN (SELECT id FROM locked_seats);

  GET DIAGNOSTICS v_locked_count = ROW_COUNT;

  IF v_locked_count = array_length(p_seat_ids, 1) THEN
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Concurrency error: One or more seats are no longer available.';
  END IF;
END;
$$;

-- Cancellation Trigger
CREATE OR REPLACE FUNCTION check_cancellation_time()
RETURNS TRIGGER AS $$
DECLARE
  v_departs_at TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    SELECT departs_at INTO v_departs_at FROM flights WHERE id = NEW.flight_id;
    IF v_departs_at < (now() + interval '2 hours') THEN
      RAISE EXCEPTION 'Cannot cancel booking within 2 hours of departure.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_late_cancellations
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_cancellation_time();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE seats;

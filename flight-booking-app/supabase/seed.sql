-- Seed Flights
INSERT INTO flights (id, flight_no, origin, destination, departs_at, arrives_at, base_price)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'SA101', 'SIN', 'BKK', now() + interval '5 days', now() + interval '5 days 2 hours', 150.00),
  ('22222222-2222-2222-2222-222222222222', 'SA202', 'NRT', 'SFO', now() + interval '10 days', now() + interval '10 days 9 hours', 850.00);

-- Generate Seats for SA101 (Rows 1-10, A-F)
DO $$
DECLARE
  row INT;
  col CHAR;
  flight_uuid UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  FOR row IN 1..10 LOOP
    FOREACH col IN ARRAY ARRAY['A', 'B', 'C', 'D', 'E', 'F'] LOOP
      INSERT INTO seats (flight_id, seat_number, class, is_available)
      VALUES (flight_uuid, row || col, CASE WHEN row <= 2 THEN 'business' ELSE 'economy' END, true);
    END LOOP;
  END LOOP;
END $$;

-- Generate Seats for SA202 (Rows 1-10, A-F)
DO $$
DECLARE
  row INT;
  col CHAR;
  flight_uuid UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  FOR row IN 1..10 LOOP
    FOREACH col IN ARRAY ARRAY['A', 'B', 'C', 'D', 'E', 'F'] LOOP
      INSERT INTO seats (flight_id, seat_number, class, is_available)
      VALUES (flight_uuid, row || col, CASE WHEN row <= 2 THEN 'business' ELSE 'economy' END, true);
    END LOOP;
  END LOOP;
END $$;

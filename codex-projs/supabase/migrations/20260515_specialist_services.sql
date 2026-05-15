-- Many-to-many: specialist ↔ service
CREATE TABLE IF NOT EXISTS specialist_services (
  specialist_id uuid NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  service_id    uuid NOT NULL REFERENCES services(id)    ON DELETE CASCADE,
  PRIMARY KEY (specialist_id, service_id)
);

ALTER TABLE specialist_services ENABLE ROW LEVEL SECURITY;

-- Public (anon) read — required for the booking wizard
CREATE POLICY "public read specialist_services"
  ON specialist_services FOR SELECT
  USING (true);

-- Authenticated users (admins) can do everything
CREATE POLICY "auth all specialist_services"
  ON specialist_services FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

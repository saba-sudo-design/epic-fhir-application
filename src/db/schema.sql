CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  ehr_id VARCHAR(255) NOT NULL UNIQUE,
  given_name VARCHAR(255),
  family_name VARCHAR(255),
  phone VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  ehr_id VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  ehr_id VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  ehr_id VARCHAR(255) NOT NULL UNIQUE,
  patient_ehr_id VARCHAR(255),
  provider_ehr_id VARCHAR(255),
  location_ehr_id VARCHAR(255),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_ehr_id ON appointments(patient_ehr_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_ehr_id ON appointments(provider_ehr_id);
CREATE INDEX IF NOT EXISTS idx_appointments_location_ehr_id ON appointments(location_ehr_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

import { config } from '../config';
import { pool } from '../db/pool';
import { EpicFhirClient } from '../epic/client';
import {
  extractAppointmentReferences,
  extractHumanName,
  extractLocationName,
  extractPhone,
  extractPractitionerName,
  resolveFhirResourceId,
} from '../epic/fhir-mappers';
import {
  FhirAppointment,
  FhirLocation,
  FhirPatient,
  FhirPractitioner,
} from '../epic/types';
import { logger } from '../utils/logger';

export interface IngestCounts {
  patients: number;
  providers: number;
  locations: number;
  appointments: number;
}

async function upsertPatient(patient: FhirPatient): Promise<number> {
  const ehrId = resolveFhirResourceId(patient);
  if (!ehrId) {
    logger.warn('Skipping patient without ehr_id', { patient });
    return 0;
  }

  const { givenName, familyName } = extractHumanName(patient.name);
  const phone = extractPhone(patient);

  const result = await pool.query(
    `INSERT INTO patients (ehr_id, given_name, family_name, phone, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (ehr_id) DO UPDATE SET
       given_name = EXCLUDED.given_name,
       family_name = EXCLUDED.family_name,
       phone = EXCLUDED.phone,
       updated_at = NOW()
     RETURNING id`,
    [ehrId, givenName, familyName, phone]
  );

  return result.rowCount ?? 0;
}

async function upsertProvider(ehrId: string, displayName: string | null): Promise<number> {
  const result = await pool.query(
    `INSERT INTO providers (ehr_id, display_name, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (ehr_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       updated_at = NOW()
     RETURNING id`,
    [ehrId, displayName]
  );

  return result.rowCount ?? 0;
}

async function upsertLocation(ehrId: string, displayName: string | null): Promise<number> {
  const result = await pool.query(
    `INSERT INTO locations (ehr_id, display_name, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (ehr_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       updated_at = NOW()
     RETURNING id`,
    [ehrId, displayName]
  );

  return result.rowCount ?? 0;
}

async function upsertAppointment(
  appointment: FhirAppointment,
  refs: ReturnType<typeof extractAppointmentReferences>
): Promise<number> {
  const ehrId = resolveFhirResourceId(appointment);
  if (!ehrId) {
    logger.warn('Skipping appointment without ehr_id', { appointment });
    return 0;
  }

  const result = await pool.query(
    `INSERT INTO appointments (
       ehr_id, patient_ehr_id, provider_ehr_id, location_ehr_id,
       start_time, end_time, status, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (ehr_id) DO UPDATE SET
       patient_ehr_id = EXCLUDED.patient_ehr_id,
       provider_ehr_id = EXCLUDED.provider_ehr_id,
       location_ehr_id = EXCLUDED.location_ehr_id,
       start_time = EXCLUDED.start_time,
       end_time = EXCLUDED.end_time,
       status = EXCLUDED.status,
       updated_at = NOW()
     RETURNING id`,
    [
      ehrId,
      refs.patientEhrId,
      refs.providerEhrId,
      refs.locationEhrId,
      appointment.start ?? null,
      appointment.end ?? null,
      appointment.status ?? null,
    ]
  );

  return result.rowCount ?? 0;
}

export class IngestService {
  constructor(private readonly client = new EpicFhirClient()) {}

  async ingest(): Promise<IngestCounts> {
    logger.info('Starting Epic FHIR ingest');

    const patients = await this.client.searchPatients();
    logger.info('Fetched patients from Epic', { count: patients.length });

    let patientCount = 0;
    for (const patient of patients) {
      patientCount += await upsertPatient(patient);
    }

    const appointments = await this.client.searchAppointments(
      patients
        .map((p) => resolveFhirResourceId(p))
        .filter((id): id is string => Boolean(id))
        .concat(config.epic.testPatientIds)
        .filter((id, index, all) => all.indexOf(id) === index)
    );
    logger.info('Fetched appointments from Epic', { count: appointments.length });

    const practitionerCache = new Map<string, FhirPractitioner>();
    const locationCache = new Map<string, FhirLocation>();
    const patientCache = new Map<string, FhirPatient>();
    for (const patient of patients) {
      const ehrId = resolveFhirResourceId(patient);
      if (ehrId) patientCache.set(ehrId, patient);
    }

    let providerCount = 0;
    let locationCount = 0;
    let appointmentCount = 0;

    for (const appointment of appointments) {
      const refs = extractAppointmentReferences(appointment);

      if (refs.patientEhrId && !patientCache.has(refs.patientEhrId)) {
        try {
          const patient = await this.client.getPatient(refs.patientEhrId);
          const patientEhrId = resolveFhirResourceId(patient) ?? refs.patientEhrId;
          patient.id = patientEhrId;
          patientCache.set(patientEhrId, patient);
          patientCount += await upsertPatient(patient);
        } catch (error) {
          logger.warn('Failed to resolve patient reference', {
            patientEhrId: refs.patientEhrId,
            error,
          });
        }
      }

      if (refs.providerEhrId && !practitionerCache.has(refs.providerEhrId)) {
        try {
          const practitioner = await this.client.getPractitioner(refs.providerEhrId);
          practitionerCache.set(practitioner.id, practitioner);
          providerCount += await upsertProvider(
            practitioner.id,
            extractPractitionerName(practitioner)
          );
        } catch (error) {
          logger.warn('Failed to resolve practitioner reference', {
            providerEhrId: refs.providerEhrId,
            error,
          });
        }
      }

      if (refs.locationEhrId && !locationCache.has(refs.locationEhrId)) {
        try {
          const location = await this.client.getLocation(refs.locationEhrId);
          locationCache.set(location.id, location);
          locationCount += await upsertLocation(
            location.id,
            extractLocationName(location)
          );
        } catch (error) {
          logger.warn('Failed to resolve location reference', {
            locationEhrId: refs.locationEhrId,
            error,
          });
        }
      }

      appointmentCount += await upsertAppointment(appointment, refs);
    }

    const counts = {
      patients: patientCount,
      providers: providerCount,
      locations: locationCount,
      appointments: appointmentCount,
    };

    logger.info('Epic FHIR ingest completed', counts);
    return counts;
  }
}

import { config } from '../config';
import { logger } from '../utils/logger';
import { getAccessToken } from './auth';
import { resolveFhirResourceId } from './fhir-mappers';
import {
  FhirAppointment,
  FhirBundle,
  FhirBundleLink,
  FhirLocation,
  FhirPatient,
  FhirPractitioner,
} from './types';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EpicFhirClient {
  private accessToken: string | null = null;

  private async ensureToken(): Promise<string> {
    if (!this.accessToken) {
      this.accessToken = await getAccessToken();
    }
    return this.accessToken;
  }

  private async request<T>(path: string, attempt = 1): Promise<T> {
    const token = await this.ensureToken();
    const url = path.startsWith('http')
      ? path
      : `${config.epic.fhirBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/fhir+json',
        },
        signal: AbortSignal.timeout(config.epic.requestTimeoutMs),
      });

      if (response.status === 401 && attempt === 1) {
        this.accessToken = null;
        return this.request<T>(path, attempt + 1);
      }

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`FHIR request failed (${response.status}) for ${url}: ${text}`);
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if (attempt < config.epic.maxRetries) {
        const delay = config.epic.retryDelayMs * attempt;
        logger.warn('FHIR request failed, retrying', { path, attempt, delay, error });
        await sleep(delay);
        return this.request<T>(path, attempt + 1);
      }
      throw error;
    }
  }

  async fetchAllPages<T>(initialPath: string): Promise<T[]> {
    const resources: T[] = [];
    let nextUrl: string | null = initialPath;

    while (nextUrl) {
      const bundle: FhirBundle<T> = await this.request<FhirBundle<T>>(nextUrl);
      for (const entry of bundle.entry ?? []) {
        if (!entry.resource) continue;

        const resource = entry.resource as T & { id?: string; resourceType?: string };
        const resourceId = resolveFhirResourceId(resource, entry.fullUrl);
        if (resourceId && !resource.id) {
          resource.id = resourceId;
        }

        if (resourceId) {
          resources.push(resource);
        }
      }

      const nextLink: FhirBundleLink | undefined = bundle.link?.find(
        (l: FhirBundleLink) => l.relation === 'next'
      );
      nextUrl = nextLink?.url ?? null;
      logger.debug('Fetched FHIR page', {
        path: nextUrl ?? initialPath,
        pageCount: bundle.entry?.length ?? 0,
        totalSoFar: resources.length,
      });
    }

    return resources;
  }

  async searchPatients(): Promise<FhirPatient[]> {
    const patients: FhirPatient[] = [];
    const seen = new Set<string>();

    for (const patientId of config.epic.testPatientIds) {
      try {
        const patient = await this.getPatient(patientId);
        const ehrId = resolveFhirResourceId(patient) ?? patientId;
        patient.id = ehrId;
        if (!seen.has(ehrId)) {
          seen.add(ehrId);
          patients.push(patient);
        }
      } catch (error) {
        logger.warn('Failed to fetch sandbox patient by ID', { patientId, error });
      }
    }

    const demographicQueries = [
      'Patient?family=Lin&given=Derrick&birthdate=1973-06-03',
      'Patient?family=Ross&given=Linda',
    ];

    for (const query of demographicQueries) {
      try {
        const results = await this.fetchAllPages<FhirPatient>(query);
        for (const patient of results) {
          const ehrId = resolveFhirResourceId(patient);
          if (!ehrId || seen.has(ehrId)) continue;
          patient.id = ehrId;
          seen.add(ehrId);
          patients.push(patient);
        }
      } catch (error) {
        logger.warn('Demographic patient search failed', { query, error });
      }
    }

    return patients;
  }

  async searchAppointments(patientIds: string[] = config.epic.testPatientIds): Promise<FhirAppointment[]> {
    const appointments: FhirAppointment[] = [];
    const seen = new Set<string>();

    for (const patientId of patientIds) {
      try {
        const results = await this.fetchAllPages<FhirAppointment>(
          `Appointment?patient=${encodeURIComponent(patientId)}`
        );
        for (const appointment of results) {
          const ehrId = resolveFhirResourceId(appointment);
          if (!ehrId || seen.has(ehrId)) continue;
          appointment.id = ehrId;
          seen.add(ehrId);
          appointments.push(appointment);
        }
      } catch (error) {
        logger.warn('Appointment search failed for patient', { patientId, error });
      }
    }

    return appointments;
  }

  async getPatient(id: string): Promise<FhirPatient> {
    return this.request<FhirPatient>(`Patient/${id}`);
  }

  async getPractitioner(id: string): Promise<FhirPractitioner> {
    return this.request<FhirPractitioner>(`Practitioner/${id}`);
  }

  async getLocation(id: string): Promise<FhirLocation> {
    return this.request<FhirLocation>(`Location/${id}`);
  }
}

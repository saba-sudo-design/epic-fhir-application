import {
  FhirAppointment,
  FhirHumanName,
  FhirLocation,
  FhirPatient,
  FhirPractitioner,
} from './types';

export function extractPhone(patient: FhirPatient): string | null {
  const phone = patient.telecom?.find((t) => t.system === 'phone' && t.value);
  return phone?.value ?? null;
}

export function extractHumanName(names?: FhirHumanName[]): {
  givenName: string | null;
  familyName: string | null;
  displayName: string | null;
} {
  if (!names?.length) {
    return { givenName: null, familyName: null, displayName: null };
  }

  const preferred =
    names.find((n) => n.use === 'official') ??
    names.find((n) => n.use === 'usual') ??
    names[0];

  const givenName = preferred.given?.join(' ') ?? null;
  const familyName = preferred.family ?? null;
  const displayName =
    preferred.text ??
    ([givenName, familyName].filter(Boolean).join(' ') || null);

  return { givenName, familyName, displayName };
}

export function extractPractitionerName(practitioner: FhirPractitioner): string | null {
  return extractHumanName(practitioner.name).displayName;
}

export function extractLocationName(location: FhirLocation): string | null {
  return location.name ?? null;
}

export function parseReferenceId(reference?: string): string | null {
  if (!reference) return null;
  const parts = reference.split('/');
  return parts[parts.length - 1] || null;
}

export function resolveFhirResourceId(
  resource: { id?: string; resourceType?: string },
  fullUrl?: string
): string | null {
  if (resource.id) return resource.id;
  if (!fullUrl) return null;

  const fromUrl = parseReferenceId(fullUrl);
  if (!fromUrl || fromUrl === '_history') return null;

  if (resource.resourceType && fullUrl.includes(`/${resource.resourceType}/`)) {
    return fromUrl;
  }

  return fromUrl;
}

export function extractAppointmentReferences(appointment: FhirAppointment): {
  patientEhrId: string | null;
  providerEhrId: string | null;
  locationEhrId: string | null;
} {
  let patientEhrId: string | null = null;
  let providerEhrId: string | null = null;
  let locationEhrId: string | null = null;

  for (const participant of appointment.participant ?? []) {
    const ref = participant.actor?.reference ?? '';
    const id = parseReferenceId(ref);
    if (!id) continue;

    if (ref.startsWith('Patient/')) {
      patientEhrId = id;
    } else if (ref.startsWith('Practitioner/') || ref.startsWith('PractitionerRole/')) {
      providerEhrId = id;
    } else if (ref.startsWith('Location/')) {
      locationEhrId = id;
    }
  }

  return { patientEhrId, providerEhrId, locationEhrId };
}

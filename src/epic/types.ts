export interface FhirBundleLink {
  relation: string;
  url: string;
}

export interface FhirBundle<T> {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  link?: FhirBundleLink[];
  entry?: Array<{ fullUrl?: string; resource: T }>;
}

export interface FhirHumanName {
  use?: string;
  family?: string;
  given?: string[];
  text?: string;
}

export interface FhirContactPoint {
  system?: string;
  value?: string;
  use?: string;
}

export interface FhirReference {
  reference?: string;
  display?: string;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id?: string;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
}

export interface FhirPractitioner {
  resourceType: 'Practitioner';
  id: string;
  name?: FhirHumanName[];
}

export interface FhirLocation {
  resourceType: 'Location';
  id: string;
  name?: string;
}

export interface FhirAppointmentParticipant {
  actor?: FhirReference;
  status?: string;
}

export interface FhirAppointment {
  resourceType: 'Appointment';
  id?: string;
  status?: string;
  start?: string;
  end?: string;
  participant?: FhirAppointmentParticipant[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

import {
  extractAppointmentReferences,
  extractHumanName,
  extractPhone,
  parseReferenceId,
} from '../src/epic/fhir-mappers';
import { FhirAppointment, FhirPatient } from '../src/epic/types';

describe('FHIR mappers', () => {
  const samplePatient: FhirPatient = {
    resourceType: 'Patient',
    id: 'patient-123',
    name: [
      {
        use: 'official',
        family: 'Smith',
        given: ['Jane', 'Marie'],
      },
    ],
    telecom: [
      { system: 'email', value: 'jane@example.com' },
      { system: 'phone', value: '+1-555-0100', use: 'mobile' },
    ],
  };

  it('extracts phone from Patient.telecom', () => {
    expect(extractPhone(samplePatient)).toBe('+1-555-0100');
  });

  it('extracts human names with official use preferred', () => {
    expect(extractHumanName(samplePatient.name)).toEqual({
      givenName: 'Jane Marie',
      familyName: 'Smith',
      displayName: 'Jane Marie Smith',
    });
  });

  it('parses FHIR reference IDs', () => {
    expect(parseReferenceId('Practitioner/abc-456')).toBe('abc-456');
    expect(parseReferenceId('Location/loc-1')).toBe('loc-1');
    expect(parseReferenceId(undefined)).toBeNull();
  });

  it('extracts appointment participant references', () => {
    const appointment: FhirAppointment = {
      resourceType: 'Appointment',
      id: 'appt-1',
      participant: [
        { actor: { reference: 'Patient/patient-123' } },
        { actor: { reference: 'Practitioner/provider-9' } },
        { actor: { reference: 'Location/location-7' } },
      ],
    };

    expect(extractAppointmentReferences(appointment)).toEqual({
      patientEhrId: 'patient-123',
      providerEhrId: 'provider-9',
      locationEhrId: 'location-7',
    });
  });
});

import { GOOGLE_SCOPES, googleRequest } from './auth';

const MEET_V2 = 'https://meet.googleapis.com/v2';
const MEET_V2_BETA = 'https://meet.googleapis.com/v2beta';

interface MeetSpace {
  name?: string;
  meetingUri?: string;
  meetingCode?: string;
}

interface ConferenceRecord {
  name: string;
}

interface MeetRecording {
  name: string;
  state?: string;
  startTime?: string;
  endTime?: string;
  driveDestination?: { file?: string; exportUri?: string };
}

interface MeetTranscript {
  name: string;
  state?: string;
  endTime?: string;
  docsDestination?: { document?: string; exportUri?: string };
}

export interface MeetArtifact {
  type: 'RECORDING' | 'TRANSCRIPT';
  providerArtifactId: string;
  driveFileId: string | null;
  url: string | null;
  durationSec: number | null;
  availableAt: Date | null;
}

export async function createInstantSpace(): Promise<{
  spaceName: string;
  joinUrl: string;
  meetingCode: string;
}> {
  const space = await googleRequest<MeetSpace>({
    url: `${MEET_V2}/spaces`,
    method: 'POST',
    scopes: [GOOGLE_SCOPES.meetCreate],
    data: { config: { accessType: 'TRUSTED' } }
  });
  if (!space.name || !space.meetingUri || !space.meetingCode) {
    throw new Error('Meet space was created without a join link');
  }
  return { spaceName: space.name, joinUrl: space.meetingUri, meetingCode: space.meetingCode };
}

/** Turns on automatic recording for the space (recording policy: automatic). */
export async function enableAutoRecording(spaceName: string): Promise<void> {
  await googleRequest<unknown>({
    url: `${MEET_V2_BETA}/${spaceName}`,
    method: 'PATCH',
    scopes: [GOOGLE_SCOPES.meetCreate],
    params: { updateMask: 'config.artifactConfig' },
    data: {
      config: {
        artifactConfig: {
          recordingConfig: { autoRecordingGeneration: 'ON' },
          transcriptionConfig: { autoTranscriptionGeneration: 'ON' }
        }
      }
    }
  });
}

export async function addCohost(spaceName: string, email: string): Promise<void> {
  await googleRequest<unknown>({
    url: `${MEET_V2_BETA}/${spaceName}/members`,
    method: 'POST',
    scopes: [GOOGLE_SCOPES.meetCreate],
    data: { email, role: 'COHOST' }
  });
}

function durationSec(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

/** Lists finished recordings/transcripts for every conference held in the space. */
export async function listSpaceArtifacts(meetingCode: string): Promise<MeetArtifact[]> {
  const scopes = [GOOGLE_SCOPES.meetReadonly];
  const records = await googleRequest<{ conferenceRecords?: ConferenceRecord[] }>({
    url: `${MEET_V2}/conferenceRecords`,
    scopes,
    params: { filter: `space.meeting_code = "${meetingCode}"` }
  });

  const artifacts: MeetArtifact[] = [];
  for (const record of records.conferenceRecords ?? []) {
    const [recordings, transcripts] = await Promise.all([
      googleRequest<{ recordings?: MeetRecording[] }>({
        url: `${MEET_V2}/${record.name}/recordings`,
        scopes
      }),
      googleRequest<{ transcripts?: MeetTranscript[] }>({
        url: `${MEET_V2}/${record.name}/transcripts`,
        scopes
      })
    ]);

    for (const rec of recordings.recordings ?? []) {
      if (rec.state !== 'FILE_GENERATED') continue;
      const fileId = rec.driveDestination?.file ?? null;
      artifacts.push({
        type: 'RECORDING',
        providerArtifactId: rec.name,
        driveFileId: fileId,
        url: rec.driveDestination?.exportUri ?? null,
        durationSec: durationSec(rec.startTime, rec.endTime),
        availableAt: rec.endTime ? new Date(rec.endTime) : null
      });
    }
    for (const tr of transcripts.transcripts ?? []) {
      if (tr.state !== 'FILE_GENERATED') continue;
      artifacts.push({
        type: 'TRANSCRIPT',
        providerArtifactId: tr.name,
        driveFileId: tr.docsDestination?.document ?? null,
        url: tr.docsDestination?.exportUri ?? null,
        durationSec: null,
        availableAt: tr.endTime ? new Date(tr.endTime) : null
      });
    }
  }
  return artifacts;
}

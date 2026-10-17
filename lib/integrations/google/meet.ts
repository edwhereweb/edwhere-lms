import { debug } from '@/lib/debug';
import { GOOGLE_SCOPES, googleRequest } from './auth';

const MEET_V2 = 'https://meet.googleapis.com/v2';

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

export async function createInstantSpace(options?: { enableAutoRecording?: boolean }): Promise<{
  spaceName: string;
  joinUrl: string;
  meetingCode: string;
}> {
  const artifactConfig =
    options?.enableAutoRecording !== false
      ? {
          recordingConfig: { autoRecordingGeneration: 'ON' },
          transcriptionConfig: { autoTranscriptionGeneration: 'ON' },
          smartNotesConfig: { autoSmartNotesGeneration: 'ON' }
        }
      : undefined;

  const space = await googleRequest<MeetSpace>({
    url: `${MEET_V2}/spaces`,
    method: 'POST',
    scopes: [GOOGLE_SCOPES.meetCreate],
    data: {
      config: {
        accessType: 'RESTRICTED',
        ...(artifactConfig ? { artifactConfig } : {})
      }
    }
  });
  if (!space.name || !space.meetingUri || !space.meetingCode) {
    throw new Error('Meet space was created without a join link');
  }
  return { spaceName: space.name, joinUrl: space.meetingUri, meetingCode: space.meetingCode };
}

/**
 * Adds enrolled students as members to the Meet space so they can enter the
 * RESTRICTED space directly without knocking or needing host admission.
 */
export async function addSpaceMembers(spaceName: string, emails: string[]): Promise<void> {
  const uniqueEmails = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()))).filter(
    (e) => !!e && e.includes('@')
  );
  if (uniqueEmails.length === 0) return;

  // Process in batches of 5 to balance throughput and Google API rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
    const batch = uniqueEmails.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map((email) =>
        googleRequest<unknown>({
          url: `${MEET_V2}/${spaceName}/members`,
          method: 'POST',
          scopes: [GOOGLE_SCOPES.meetCreate],
          data: { email, role: 'ROLE_UNSPECIFIED' }
        }).catch((err) => {
          debug('MEET_ADD_MEMBER_FAILED', email, err);
        })
      )
    );
  }
}

/**
 * Retrieves space details given a space name or meeting code alias.
 * Used to resolve the canonical resource name (spaces/{spaceId}) from a meeting code.
 */
export async function getSpace(spaceNameOrCode: string): Promise<MeetSpace> {
  const code = spaceNameOrCode.replace(/^spaces\//, '');
  return await googleRequest<MeetSpace>({
    url: `${MEET_V2}/spaces/${code}`,
    method: 'GET',
    scopes: [GOOGLE_SCOPES.meetCreate]
  });
}

/**
 * Sets the Meet space to TRUSTED access so that calendar attendees (enrolled students)
 * can join without knocking or being admitted from a waiting room.
 * Should be called after creating a Calendar-based Meet event.
 */
export async function setSpaceTrustedAccess(spaceName: string): Promise<void> {
  await googleRequest<unknown>({
    url: `${MEET_V2}/${spaceName}`,
    method: 'PATCH',
    scopes: [GOOGLE_SCOPES.meetCreate],
    params: { updateMask: 'config.accessType' },
    data: { config: { accessType: 'TRUSTED' } }
  });
}

/** Turns on automatic recording and notes for the space (recording policy: automatic). */
export async function enableAutoRecording(spaceName: string): Promise<void> {
  await googleRequest<unknown>({
    url: `${MEET_V2}/${spaceName}`,
    method: 'PATCH',
    scopes: [GOOGLE_SCOPES.meetCreate],
    params: {
      updateMask:
        'config.artifactConfig.recordingConfig,config.artifactConfig.transcriptionConfig,config.artifactConfig.smartNotesConfig'
    },
    data: {
      config: {
        artifactConfig: {
          recordingConfig: { autoRecordingGeneration: 'ON' },
          transcriptionConfig: { autoTranscriptionGeneration: 'ON' },
          smartNotesConfig: { autoSmartNotesGeneration: 'ON' }
        }
      }
    }
  });
}

export async function addCohost(spaceName: string, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    await googleRequest<unknown>({
      url: `${MEET_V2}/${spaceName}/members`,
      method: 'POST',
      scopes: [GOOGLE_SCOPES.meetCreate],
      data: { email: normalizedEmail, role: 'COHOST' }
    });
  } catch (error) {
    // If member already exists, fetch members, remove the existing entry, and re-add as COHOST
    try {
      const list = await googleRequest<{
        members?: Array<{ name: string; email?: string; role?: string }>;
      }>({
        url: `${MEET_V2}/${spaceName}/members`,
        method: 'GET',
        scopes: [GOOGLE_SCOPES.meetCreate]
      });
      const existing = list?.members?.find((m) => m.email?.toLowerCase() === normalizedEmail);
      if (existing) {
        if (existing.role === 'COHOST') return;
        await googleRequest<unknown>({
          url: `${MEET_V2}/${existing.name}`,
          method: 'DELETE',
          scopes: [GOOGLE_SCOPES.meetCreate]
        });
      }
      await googleRequest<unknown>({
        url: `${MEET_V2}/${spaceName}/members`,
        method: 'POST',
        scopes: [GOOGLE_SCOPES.meetCreate],
        data: { email: normalizedEmail, role: 'COHOST' }
      });
    } catch (innerError) {
      debug('ADD_COHOST_FALLBACK_FAILED', normalizedEmail, innerError);
      throw error;
    }
  }
}

function durationSec(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

/** Lists finished recordings/transcripts for every conference held in the space. */
export async function listSpaceArtifacts(spaceOrCode: string): Promise<MeetArtifact[]> {
  const clean = spaceOrCode.trim();
  const filter = clean.startsWith('spaces/')
    ? `space.name = "${clean}"`
    : `space.meeting_code = "${clean}"`;
  const scopes = [GOOGLE_SCOPES.meetReadonly];
  const records = await googleRequest<{ conferenceRecords?: ConferenceRecord[] }>({
    url: `${MEET_V2}/conferenceRecords`,
    scopes,
    params: { filter }
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

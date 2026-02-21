'use client';

import { MentorChat } from './mentor-chat';
import { useRouter } from 'next/navigation';

interface WrapperProps {
  courseId: string;
  currentProfileId: string;
  currentRole: string;
}

export function MentorChatWrapper({ courseId, currentProfileId, currentRole }: WrapperProps) {
  const router = useRouter();

  return (
    <MentorChat
      courseId={courseId}
      currentProfileId={currentProfileId}
      currentRole={currentRole}
      onMarkedRead={() => router.refresh()}
    />
  );
}

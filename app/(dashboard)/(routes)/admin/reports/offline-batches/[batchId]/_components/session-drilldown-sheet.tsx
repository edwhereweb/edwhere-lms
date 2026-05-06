'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { SessionReportDetail } from '@/actions/get-batch-reports';

interface SessionDrilldownSheetProps {
  session: SessionReportDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SessionDrilldownSheet = ({
  session,
  open,
  onOpenChange
}: SessionDrilldownSheetProps) => {
  if (!session) return null;

  const f = session.feedback;

  const chartData = f
    ? [
        { subject: 'Questions', A: f.askingQuestions, fullMark: 10 },
        { subject: 'Pace', A: f.classPace, fullMark: 10 },
        { subject: 'Memory', A: f.memory, fullMark: 10 },
        { subject: 'Quickness', A: f.answeringQuickly, fullMark: 10 },
        { subject: 'Group Talk', A: f.groupTalk, fullMark: 10 },
        { subject: 'Understanding', A: f.understandingIdeas, fullMark: 10 },
        { subject: 'Doing Work', A: f.doingTheWork, fullMark: 10 },
        { subject: 'Fixing', A: f.fixingMistakes, fullMark: 10 },
        { subject: 'Goals', A: f.goalCompletion, fullMark: 10 }
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-background/95 backdrop-blur-md border-l">
        <SheetHeader className="mb-6 mt-4">
          <SheetTitle className="text-xl">{session.title}</SheetTitle>
          <SheetDescription>
            {new Date(session.scheduledAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}
          </SheetDescription>
        </SheetHeader>

        {f ? (
          <div className="space-y-8 pb-10">
            {/* IE Score Badge */}
            <div className="flex items-center gap-4 border p-4 rounded-xl bg-card shadow-sm">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-muted-foreground">IE Score</h4>
                <p className="text-3xl font-bold">
                  {f.ieScore.toFixed(1)}{' '}
                  <span className="text-lg font-normal text-muted-foreground">/ 100</span>
                </p>
              </div>
              <div className="flex-1 border-l pl-4">
                <h4 className="text-sm font-medium text-muted-foreground">Attendance</h4>
                <p className="text-3xl font-bold">{session.attendancePercent ?? 0}%</p>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="border rounded-xl p-4 bg-card shadow-sm">
              <h4 className="text-sm font-medium mb-4">Metric Visualization</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 10]}
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Radar
                      name="Score"
                      dataKey="A"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4 bg-emerald-50/50 border-emerald-100 shadow-sm">
                <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> What went well
                </h4>
                <ul className="space-y-2 text-sm text-emerald-900/80">
                  {f.wentWell.map((item: string, i: number) => (
                    <li
                      key={i}
                      className="pl-3 relative before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-emerald-400"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border rounded-xl p-4 bg-rose-50/50 border-rose-100 shadow-sm">
                <h4 className="text-sm font-semibold text-rose-800 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> What went wrong
                </h4>
                <ul className="space-y-2 text-sm text-rose-900/80">
                  {f.wentWrong.map((item: string, i: number) => (
                    <li
                      key={i}
                      className="pl-3 relative before:absolute before:left-0 before:top-2 before:h-1 before:w-1 before:rounded-full before:bg-rose-400"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Student Feedback (Aggregated) */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold border-b pb-2">
                Student Feedback ({session.studentFeedback.length})
              </h4>

              {session.studentFeedback.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 border rounded-lg bg-card text-center">
                      <p className="text-xs text-muted-foreground uppercase">Instructor</p>
                      <p className="text-xl font-bold">
                        {(
                          session.studentFeedback.reduce((acc, f) => acc + f.instructorRating, 0) /
                          session.studentFeedback.length
                        ).toFixed(1)}{' '}
                        / 5
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg bg-card text-center">
                      <p className="text-xs text-muted-foreground uppercase">Materials</p>
                      <p className="text-xl font-bold">
                        {(
                          session.studentFeedback.reduce((acc, f) => acc + f.materialRating, 0) /
                          session.studentFeedback.length
                        ).toFixed(1)}{' '}
                        / 5
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg bg-card text-center">
                      <p className="text-xs text-muted-foreground uppercase">Activities</p>
                      <p className="text-xl font-bold">
                        {(
                          session.studentFeedback.reduce((acc, f) => acc + f.activityRating, 0) /
                          session.studentFeedback.length
                        ).toFixed(1)}{' '}
                        / 5
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg bg-card text-center">
                      <p className="text-xs text-muted-foreground uppercase">Overall</p>
                      <p className="text-xl font-bold">
                        {(
                          session.studentFeedback.reduce((acc, f) => acc + f.overallRating, 0) /
                          session.studentFeedback.length
                        ).toFixed(1)}{' '}
                        / 5
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h5 className="text-sm font-medium">Comments (Anonymized)</h5>
                    <div className="space-y-3">
                      {session.studentFeedback
                        .filter((f) => f.likedMost || f.improvement)
                        .map((f, idx) => (
                          <div
                            key={idx}
                            className="p-4 border rounded-xl bg-muted/20 text-sm space-y-2"
                          >
                            {f.likedMost && (
                              <p>
                                <span className="font-semibold text-emerald-700">Liked:</span>{' '}
                                {f.likedMost}
                              </p>
                            )}
                            {f.improvement && (
                              <p>
                                <span className="font-semibold text-rose-700">Improvement:</span>{' '}
                                {f.improvement}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                  <p>No student feedback received yet.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            <p>No instructor feedback submitted yet.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

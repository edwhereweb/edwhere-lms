'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, TrendingUp, Clock, CheckCircle, Video, FileText, CheckSquare, Target, AlertTriangle } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CompetencyRadarChart } from '@/components/charts/radar-chart';

interface LearnerReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  studentId: string;
  learnerName: string;
}

interface AnalyticsPayload {
  timeline: { id: string; title: string; isCompleted: boolean; completedAt: string | null; contentType: string; }[];
  quizPerformanceHistory: { id: string; chapterTitle: string; score: number; submittedAt: string; tabSwitches: number; }[];
  benchmarking: { studentAverage: number; courseAverage: number; };
}

export const LearnerReportDrawer = ({ isOpen, onClose, courseId, studentId, learnerName }: LearnerReportDrawerProps) => {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     if (!isOpen || !courseId || !studentId) return;

     const fetchAnalytics = async () => {
        setLoading(true);
        try {
           const res = await axios.get(`/api/courses/${courseId}/analytics/learner/${studentId}`);
           setData(res.data);
        } catch {
           setData(null);
        } finally {
           setLoading(false);
        }
     };

     fetchAnalytics();
  }, [isOpen, courseId, studentId]);

  const handleExportPDF = () => {
      // Stub PDF generation for print layout
      window.print();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto z-[9999]" side="right">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl font-bold">Learner Full Report</SheetTitle>
          <SheetDescription>
            Performance and progress metrics for <span className="font-semibold text-slate-800 dark:text-slate-200">{learnerName}</span>.
          </SheetDescription>
          <div className="pt-2">
             <button onClick={handleExportPDF} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition">
                 Print / Export to PDF
             </button>
          </div>
        </SheetHeader>

        {loading ? (
           <div className="flex items-center justify-center p-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
           </div>
        ) : !data ? (
           <div className="flex justify-center p-12 text-slate-500 text-sm">
              Failed to load analytics or no data exists yet.
           </div>
        ) : (
           <div className="space-y-12 pb-20">
               
               {/* 1. Benchmarking Engine */}
               <section>
                   <div className="flex items-center gap-x-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-semibold">Peer Benchmarking</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900 border rounded-md p-4 flex flex-col items-center justify-center text-center">
                          <span className="text-sm text-slate-500 mb-1">Student Average</span>
                          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
                              {data.benchmarking.studentAverage}%
                          </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 border rounded-md p-4 flex flex-col items-center justify-center text-center">
                          <span className="text-sm text-slate-500 mb-1">Class Average</span>
                          <span className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                              {data.benchmarking.courseAverage}%
                          </span>
                      </div>
                   </div>
               </section>

               {/* 2. Competency Radar Overlay (Built dynamically from their attempt log comparing to class) */}
               {data.quizPerformanceHistory.length > 0 && (
                  <section>
                      <div className="flex items-center gap-x-2 mb-4">
                         <Target className="h-5 w-5 text-indigo-500" />
                         <h3 className="text-lg font-semibold">Competency Map</h3>
                      </div>
                      <div className="border rounded-md bg-white dark:bg-slate-950 p-4">
                           <CompetencyRadarChart 
                              data={data.quizPerformanceHistory.map(history => ({
                                  subject: history.chapterTitle.length > 15 ? history.chapterTitle.slice(0, 15) + '...' : history.chapterTitle,
                                  A: history.score,
                                  B: data.benchmarking.courseAverage,
                                  fullMark: 100
                              }))}
                           />
                           <div className="flex items-center justify-center gap-x-6 text-xs text-slate-500 mt-2">
                               <div className="flex items-center gap-x-1"><div className="w-3 h-3 bg-indigo-500 opacity-60 rounded-full"></div> Student</div>
                               <div className="flex items-center gap-x-1"><div className="w-3 h-3 bg-slate-300 opacity-60 rounded-full"></div> Class Cohort</div>
                           </div>
                      </div>
                  </section>
               )}

               {/* 3. Progression Timeline */}
               <section>
                   <div className="flex items-center gap-x-2 mb-4">
                      <Clock className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-semibold">Lesson Progression Timeline</h3>
                   </div>
                   <div className="border rounded-md bg-white dark:bg-slate-950">
                       {data.timeline.length === 0 && (
                          <div className="p-4 text-sm text-slate-500">No chapters published in this course.</div>
                       )}
                       {data.timeline.map((ch, i) => (
                           <div key={ch.id} className={`flex items-start p-4 ${i !== data.timeline.length - 1 ? 'border-b' : ''}`}>
                               <div className={`mt-0.5 mr-4 rounded-full p-1 border ${ch.isCompleted ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                  <CheckCircle className="h-4 w-4" />
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                     <h4 className={`text-sm font-medium ${ch.isCompleted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>{ch.title}</h4>
                                     {ch.contentType === 'VIDEO_MUX' || ch.contentType === 'VIDEO_YOUTUBE' ? <Video className="h-3 w-3 text-slate-400" /> : ch.contentType === 'EVALUATION' ? <CheckSquare className="h-3 w-3 text-slate-400" /> : <FileText className="h-3 w-3 text-slate-400" />}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                     {ch.isCompleted && ch.completedAt 
                                        ? `Completed ${new Date(ch.completedAt).toLocaleDateString()}` 
                                        : 'Not Started / In Progress'}
                                  </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </section>

               {/* 4. Quiz Attempt Logs */}
               <section>
                   <div className="flex items-center gap-x-2 mb-4">
                      <CheckSquare className="h-5 w-5 text-indigo-500" />
                      <h3 className="text-lg font-semibold">Assessment Attempt Log</h3>
                   </div>
                   {data.quizPerformanceHistory.length === 0 ? (
                       <div className="border rounded-md bg-slate-50 dark:bg-slate-900 p-6 text-center text-sm text-slate-500">
                           No evaluations attempted yet.
                       </div>
                   ) : (
                       <div className="space-y-3">
                          {data.quizPerformanceHistory.map(log => (
                              <div key={log.id} className="border rounded-md p-4 bg-white dark:bg-slate-950 flex flex-col space-y-2">
                                  <div className="flex justify-between items-center">
                                      <span className="font-semibold text-sm">{log.chapterTitle}</span>
                                      <span className={`font-bold text-sm ${log.score >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>{log.score}%</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs text-slate-500">
                                      <span>Submitted: {new Date(log.submittedAt).toLocaleDateString()} at {new Date(log.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      {log.tabSwitches > 0 && (
                                         <span className="text-amber-600 flex items-center bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                            <AlertTriangle className="h-3 w-3 mr-1" /> {log.tabSwitches} Flags
                                         </span>
                                      )}
                                  </div>
                              </div>
                          ))}
                       </div>
                   )}
               </section>
           </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

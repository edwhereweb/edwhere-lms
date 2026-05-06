'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { SessionReportDetail } from '@/actions/get-batch-reports';

interface BatchTimelineChartProps {
  sessions: SessionReportDetail[];
}

export const BatchTimelineChart = ({ sessions }: BatchTimelineChartProps) => {
  const data = sessions.map((s) => ({
    name: new Date(s.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    attendance: s.attendancePercent || 0,
    title: s.title
  }));

  if (!data.length)
    return (
      <div className="text-muted-foreground italic text-sm p-4">No session data available.</div>
    );

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, 'Attendance']}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.title || label}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
          />
          <Line
            type="monotone"
            dataKey="attendance"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

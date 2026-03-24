'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface RadarChartProps {
  data: {
    subject: string;
    A: number; // Student Score
    B?: number; // Class Average Overlay
    fullMark: number;
  }[];
}

export const CompetencyRadarChart = ({ data }: RadarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis 
           angle={30} 
           domain={[0, 100]} 
           tickFormatter={(v) => `${v}%`}
        />
        <Tooltip />
        <Radar 
           name="Student" 
           dataKey="A" 
           stroke="#4f46e5" 
           fill="#4f46e5" 
           fillOpacity={0.4} 
        />
        {data[0]?.B !== undefined && (
           <Radar 
              name="Class Average" 
              dataKey="B" 
              stroke="#cbd5e1" 
              fill="#e2e8f0" 
              fillOpacity={0.4} 
           />
        )}
      </RadarChart>
    </ResponsiveContainer>
  );
};

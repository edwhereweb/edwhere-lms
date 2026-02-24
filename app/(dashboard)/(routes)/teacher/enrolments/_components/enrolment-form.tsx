'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, Upload, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Course {
  id: string;
  title: string;
  price: number | null;
  isPublished: boolean;
}

interface EnrolmentFormProps {
  courses: Course[];
}

interface ParsedStudent {
  name: string;
  email: string;
  phone: string;
}

export const EnrolmentForm = ({ courses }: EnrolmentFormProps) => {
  const router = useRouter();
  const [mode, setMode] = useState<'SINGLE' | 'CSV'>('SINGLE');
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  // Single Enrolment State
  const [singleEmail, setSingleEmail] = useState('');

  // CSV Enrolment State
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [fileName, setFileName] = useState<string>('');

  // Submission State
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    successful: string[];
    failed: { email: string; reason: string }[];
    alreadyEnrolled: string[];
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    // Split by newlines
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

    const parsed: ParsedStudent[] = lines.map((line) => {
      // Handle both comma-separated and tab-separated/multiple-space-separated formats
      // The prompt mentioned: "Manu Francis        manufrancis2@gmail.com        +917356543520"
      // So we split by tabs or multiple spaces, or commas
      let columns = line.split('\t');

      if (columns.length < 2) {
        // Fallback to commas if tabs aren't found
        columns = line.split(',');
      }

      if (columns.length < 2) {
        // Fallback to multiple spaces (e.g. 2 or more spaces)
        columns = line.split(/\s{2,}/);
      }

      // Clean up columns and ensure we have at least 3
      const cleanColumns = columns.map((c) => c.trim());

      return {
        name: cleanColumns[0] || 'N/A',
        email: cleanColumns[1] || 'N/A',
        phone: cleanColumns[2] || 'N/A'
      };
    });

    // Filter out rows that don't look like they have an email (e.g., headers)
    const validRows = parsed.filter((row) => row.email.includes('@'));

    setParsedData(validRows.length > 0 ? validRows : parsed);
  };

  const onSubmit = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }

    const studentsToProcess: ParsedStudent[] = [];

    if (mode === 'SINGLE') {
      if (!singleEmail || !singleEmail.includes('@')) {
        toast.error('Please enter a valid email address');
        return;
      }
      studentsToProcess.push({ name: 'N/A', email: singleEmail, phone: 'N/A' });
    } else {
      if (parsedData.length === 0) {
        toast.error('Please upload a valid CSV file first');
        return;
      }
      studentsToProcess.push(...parsedData.filter((d) => d.email !== 'N/A' && d.email !== ''));
    }

    try {
      setIsLoading(true);
      setResults(null);

      const response = await axios.post(`/api/admin/courses/${selectedCourse}/enrol`, {
        students: studentsToProcess
      });

      setResults(response.data);
      toast.success('Enrolment process completed');
      router.refresh();

      // Reset form if successful array is populated and single mode
      if (mode === 'SINGLE' && response.data.successful.length > 0) {
        setSingleEmail('');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data || 'Something went wrong');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm font-inter">
      {/* Course Selection */}
      <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
          1. Select Course to Enrol Students In
        </label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-slate-900 outline-none"
        >
          <option value="">-- Choose a Course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title} {course.isPublished ? '' : '(Draft)'} -{' '}
              {course.price === 0 || !course.price ? 'Free' : `₹${course.price}`}
            </option>
          ))}
        </select>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => {
            setMode('SINGLE');
            setResults(null);
          }}
          className={`flex-1 py-3 px-4 rounded-md font-medium border-2 transition-all ${
            mode === 'SINGLE'
              ? 'border-[#171717] bg-[#171717] text-white'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
          }`}
        >
          Single Enrolment
        </button>
        <button
          onClick={() => {
            setMode('CSV');
            setResults(null);
          }}
          className={`flex-1 py-3 px-4 rounded-md font-medium border-2 transition-all ${
            mode === 'CSV'
              ? 'border-[#F80602] bg-[#F80602] text-white'
              : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
          }`}
        >
          Bulk CSV Enrolment
        </button>
      </div>

      {/* Input Area */}
      <div className="mb-8">
        {mode === 'SINGLE' ? (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Student Email Address
            </label>
            <Input
              type="email"
              value={singleEmail}
              onChange={(e) => setSingleEmail(e.target.value)}
              placeholder="e.g. jondoe@example.com"
              className="w-full max-w-md"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Upload CSV File
            </label>
            <p className="text-sm text-slate-500 mb-4">
              File should contain columns: Name, Email, Phone Number (separated by commas or tabs).
            </p>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2 rounded-md font-medium text-slate-700 transition">
                <Upload className="w-4 h-4" />
                Select File
                <input
                  type="file"
                  accept=".csv, .txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <span className="text-sm font-medium text-slate-600">
                {fileName ? fileName : 'No file selected'}
              </span>
            </div>

            {/* Preview Table */}
            {parsedData.length > 0 && (
              <div className="mt-8">
                <h3 className="text-md font-semibold text-slate-800 mb-3">
                  Preview ({parsedData.length} records found)
                </h3>
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">Full Name</th>
                        <th className="px-6 py-3">Email</th>
                        <th className="px-6 py-3">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-500">{i + 1}</td>
                          <td className="px-6 py-3 font-medium text-slate-900">{row.name}</td>
                          <td className="px-6 py-3">{row.email}</td>
                          <td className="px-6 py-3">{row.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="border-t border-slate-200 pt-6">
        <Button
          onClick={onSubmit}
          disabled={
            isLoading ||
            !selectedCourse ||
            (mode === 'CSV' && parsedData.length === 0) ||
            (mode === 'SINGLE' && !singleEmail)
          }
          size="lg"
          className="w-full md:w-auto bg-[#171717] hover:bg-[#F80602] transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              {mode === 'SINGLE' ? 'Enrol Student' : `Enrol ${parsedData.length} Students`}
            </>
          )}
        </Button>
      </div>

      {/* Results Component */}
      {results && (
        <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Enrolment Results</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-md">
              <div className="flex items-center gap-2 text-[#171717] font-semibold mb-1">
                <CheckCircle2 className="w-5 h-5" /> Successful
              </div>
              <p className="text-2xl font-bold text-[#171717]">{results.successful.length}</p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-md">
              <div className="flex items-center gap-2 text-neutral-600 font-semibold mb-1">
                <CheckCircle2 className="w-5 h-5" /> Already Enrolled
              </div>
              <p className="text-2xl font-bold text-neutral-700">
                {results.alreadyEnrolled.length}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <div className="flex items-center gap-2 text-[#F80602] font-semibold mb-1">
                <XCircle className="w-5 h-5" /> Failed
              </div>
              <p className="text-2xl font-bold text-[#F80602]">{results.failed.length}</p>
            </div>
          </div>

          {/* Details */}
          {(results.failed.length > 0 || results.alreadyEnrolled.length > 0) && (
            <div className="space-y-4">
              {results.failed.length > 0 && (
                <div className="p-4 bg-white border border-red-100 rounded-md">
                  <h4 className="font-semibold text-[#F80602] mb-2">Failed Enrolments</h4>
                  <ul className="text-sm list-disc pl-5 text-slate-700 space-y-1">
                    {results.failed.map((f, i) => (
                      <li key={i}>
                        <span className="font-medium">{f.email}</span>: {f.reason}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500 mt-3 pt-3 border-t">
                    * Failed enrolments are usually because the user has not yet created an account
                    on the platform using that email address.
                  </p>
                </div>
              )}

              {results.alreadyEnrolled.length > 0 && (
                <div className="p-4 bg-white border border-neutral-200 rounded-md">
                  <h4 className="font-semibold text-neutral-700 mb-2">
                    Skipped (Already Enrolled)
                  </h4>
                  <ul className="text-sm list-disc pl-5 text-slate-700 space-y-1">
                    {results.alreadyEnrolled.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

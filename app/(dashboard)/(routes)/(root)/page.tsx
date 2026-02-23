import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-poppins">
      <div className="max-w-2xl bg-[#FAFAFA] p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-6">
        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-12 h-12"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
          System Under Maintenance
        </h1>
        <p className="text-xl text-gray-800 leading-relaxed mt-2">
          We are currently under maintenance and our systems will be under maintenance till 26th,
          due to an emergency situation.
        </p>
        <p className="text-lg text-gray-500 mt-2">
          Please co-operate with us and we are very sorry for the inconvenience.
        </p>
      </div>
    </div>
  );
}

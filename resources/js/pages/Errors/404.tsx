import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { AlertTriangle } from 'lucide-react';

export default function Error404({ status, message }: { status?: number; message?: string }) {
  return (
    <>
      <Head title="404 - Page Not Found" />

      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center space-y-8 sm:space-y-10">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-50 p-8 sm:p-10 shadow-sm">
              <AlertTriangle className="h-20 w-20 sm:h-24 sm:w-24 text-amber-600" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-8xl sm:text-9xl font-extrabold text-amber-600 tracking-tight drop-shadow-sm">
            404
          </h1>

          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Page Not Found
          </h2>

          <p className="text-sm text-gray-500 pt-4">
            If you believe this should exist, please contact support.
          </p>
        </div>
      </div>
    </>
  );
}
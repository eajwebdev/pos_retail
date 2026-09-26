import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { Ban, AlertTriangle } from 'lucide-react'; // Ban icon for "not allowed"

export default function Error405({ status, message }: { status?: number; message?: string }) {
  return (
    <AdminLayout>
      <Head title="405 - Method Not Allowed" />

      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center space-y-8 sm:space-y-10">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-red-50 p-8 sm:p-10 shadow-sm">
              <Ban className="h-20 w-20 sm:h-24 sm:w-24 text-red-600" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-8xl sm:text-9xl font-extrabold text-red-600 tracking-tight drop-shadow-sm">
            405
          </h1>

          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Method Not Allowed
          </h2>

          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-prose mx-auto">
            {message || "Sorry, this action isn't permitted using the method you tried (e.g. GET instead of POST/PATCH)."}
          </p>

          {/* Action Button - consistent with your palette */}
          <div className="pt-6 sm:pt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-10 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-xl shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 active:scale-100"
            >
              Return to Dashboard
            </Link>
          </div>

          <p className="text-sm text-gray-500 pt-4">
            Double-check the link or form method. If this keeps happening, contact support.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
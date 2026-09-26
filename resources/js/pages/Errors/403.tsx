import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { ShieldAlert } from 'lucide-react';

export default function Error403({ message }: { message?: string }) {
  return (
    <AdminLayout>
      <Head title="403 - Access Denied" />

      <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Icon + Status */}
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-6">
              <ShieldAlert className="h-16 w-16 text-red-600" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-8xl sm:text-9xl font-extrabold text-red-600 tracking-tight drop-shadow-md">
            403
          </h1>

          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Access Denied
          </h2>

          <p className="text-xl text-gray-600 leading-relaxed">
            {message || "Sorry, you don't have permission to view this page."}
          </p>



        </div>
      </div>
    </AdminLayout>
  );
}
<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'name'           => 'COOP',
                'is_campus'      => true,
                'phone'          => '09171234567',
                'address'        => 'Main Campus, University Road',
                'contact_person' => 'Juan Dela Cruz',
            ],
            [
                'name'           => 'ABC Trading',
                'is_campus'      => false,
                'phone'          => '09281234567',
                'address'        => '123 Commerce St., City Center',
                'contact_person' => 'Maria Santos',
            ],
            [
                'name'           => 'XYZ Wholesale',
                'is_campus'      => false,
                'phone'          => '09391234567',
                'address'        => '456 Trade Ave., Uptown',
                'contact_person' => 'Pedro Reyes',
            ],
        ];

        foreach ($suppliers as $data) {
            Supplier::firstOrCreate(['name' => $data['name']], $data);
        }

        $this->command->info('✓ Suppliers seeded (' . count($suppliers) . ')');
    }
}

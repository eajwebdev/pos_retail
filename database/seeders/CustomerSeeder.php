<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $branch = Branch::where('code', 'ABC1')->first() ?? Branch::first();

        $customers = [
            [
                'name'           => 'Juan Dela Cruz',
                'contact_number' => '09171234567',
                'email'          => 'juan.delacruz@example.com',
                'address'        => 'Purok 3, Brgy. San Jose, City Center',
                'notes'          => 'Regular customer - Rice & Feeds buyer',
                'is_active'      => true,
            ],
            [
                'name'           => 'Maria Santos Farm & Poultry',
                'contact_number' => '09289876543',
                'email'          => 'santos.farm@example.com',
                'address'        => 'Sitio Libis, Brgy. Bagong Silang',
                'notes'          => 'Commercial broiler & hog raiser - Credit line ₱50,000',
                'is_active'      => true,
            ],
            [
                'name'           => 'Aling Nena Sari-Sari Store',
                'contact_number' => '09391112233',
                'email'          => 'nena.store@example.com',
                'address'        => 'Blk 12 Lot 5, Mabini St.',
                'notes'          => 'Wholesale grocery & rice reseller',
                'is_active'      => true,
            ],
            [
                'name'           => 'San Isidro Farmers Cooperative',
                'contact_number' => '09185556677',
                'email'          => 'coop.sanisidro@example.com',
                'address'        => 'Coop Compound, Highway Crossing',
                'notes'          => 'Institutional feeds & grain buyer',
                'is_active'      => true,
            ],
            [
                'name'           => 'Carlos "Caloy" Mendoza',
                'contact_number' => '09453334455',
                'email'          => 'caloy.mendoza@example.com',
                'address'        => 'Zone 2, Riverside Subd.',
                'notes'          => 'Gamefowl breeder - Thunderbird buyer',
                'is_active'      => true,
            ],
        ];

        foreach ($customers as $c) {
            Customer::firstOrCreate(
                ['contact_number' => $c['contact_number']],
                array_merge($c, ['branch_id' => $branch?->id])
            );
        }

        $this->command->info('✓ Customers seeded (' . count($customers) . ' customers)');
    }
}

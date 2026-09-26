<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    /**
     * Single Retail Branch for the store.
     */
    public function run(): void
    {
        $supplier = Supplier::where('name', 'ABC Trading')->first() 
            ?? Supplier::first() 
            ?? Supplier::create([
                'name'           => 'Main Supplier',
                'contact_person' => 'Supplier Agent',
                'phone'          => '09171234500',
                'email'          => 'supplier@example.com',
                'address'        => 'Central Hub',
                'is_active'      => true,
            ]);

        $branch = Branch::updateOrCreate(
            ['code' => 'ABC1'],
            [
                'supplier_id'         => $supplier->id,
                'name'                => 'Main Store',
                'code'                => 'ABC1',
                'address'             => '123 Commerce St., City Center',
                'phone'               => '09281234501',
                'contact_person'      => 'Store Manager',
                'is_active'           => true,
                'business_type'       => Branch::TYPE_RETAIL,
                'use_variants'        => true,
                'use_expiry_tracking' => true,
                'use_bundles'         => true,
            ]
        );

        $this->command->info('✓ Single Branch seeded: ' . $branch->name . ' (' . $branch->code . ')');
    }
}

<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Rice',                   'description' => 'Milled rice, organic rice, and sacks by kg or bag'],
            ['name' => 'Feeds & Agri-Veterinary', 'description' => 'Poultry, hog, and livestock feeds by kg or sack'],
            ['name' => 'Food',                   'description' => 'Ready-to-eat food items'],
            ['name' => 'Beverages',              'description' => 'Drinks, juices, coffee, tea'],
            ['name' => 'Snacks',                 'description' => 'Chips, biscuits, candies'],
            ['name' => 'Groceries',              'description' => 'Canned goods, condiments, packaged essentials'],
            ['name' => 'Personal Care',          'description' => 'Hygiene and grooming products'],
            ['name' => 'School Supplies',        'description' => 'Notebooks, pens, paper'],
            ['name' => 'Raw Materials',          'description' => 'Ingredients for cooking or production'],
            ['name' => 'Merchandise',            'description' => 'Clothing, accessories, souvenirs'],
            ['name' => 'Electronics',            'description' => 'Gadgets, components, accessories'],
            ['name' => 'Others',                 'description' => 'Miscellaneous items'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(
                ['name' => $cat['name']],
                [
                    'name'        => $cat['name'],
                    'slug'        => Str::slug($cat['name']),
                    'description' => $cat['description'],
                    'is_active'   => true,
                ]
            );
        }

        $this->command->info('✓ Categories seeded (' . count($categories) . ')');
    }
}

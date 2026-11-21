<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(CatalogSeeder::class);

        User::factory()->admin()->create([
            'name' => 'Taptale Admin',
            'email' => 'admin@taptale.test',
        ]);

        User::factory()->create([
            'name' => 'Test Customer',
            'email' => 'test@example.com',
        ]);
    }
}

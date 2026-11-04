<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! is_string($email) || $email === '' || ! is_string($password) || $password === '') {
            return;
        }

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Admin'),
                'password' => $password,
            ],
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class LinkPageScan extends Model
{
    protected $fillable = [
        'page',
        'scans',
    ];

    protected $casts = [
        'scans' => 'integer',
    ];
}

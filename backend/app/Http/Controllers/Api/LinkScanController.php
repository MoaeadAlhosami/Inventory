<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LinkPageScan;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

final class LinkScanController extends Controller
{
    private const PAGE = 'vaglogic-links';

    public function record(): JsonResponse
    {
        $scans = DB::transaction(function (): int {
            $row = LinkPageScan::query()
                ->where('page', self::PAGE)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                try {
                    $row = LinkPageScan::query()->create([
                        'page' => self::PAGE,
                        'scans' => 0,
                    ]);
                } catch (QueryException) {
                    $row = LinkPageScan::query()
                        ->where('page', self::PAGE)
                        ->lockForUpdate()
                        ->firstOrFail();
                }
            }

            $row->increment('scans');

            return (int) $row->scans;
        });

        return response()->json([
            'scans' => $scans,
        ]);
    }

    public function show(): JsonResponse
    {
        $scans = (int) LinkPageScan::query()
            ->where('page', self::PAGE)
            ->value('scans');

        return response()->json([
            'scans' => $scans,
        ]);
    }
}

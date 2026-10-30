<?php

namespace App\Exports;

use App\Models\Category;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class InventoryExport implements WithEvents
{
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // الترويسة الرئيسية
                $sheet->setCellValue('B2', 'ITEM CODE');
                $sheet->setCellValue('C2', 'PRODUCT NAME');
                $sheet->setCellValue('D2', 'QUANTITY');
                $sheet->setCellValue('E2', 'PURCHASE COST');
                $sheet->setCellValue('F2', 'SELLING PRICE');
                $sheet->setCellValue('G2', 'TOTAL COST');
                $sheet->setCellValue('H2', 'TOTAL SELLING');

                $sheet->getStyle('B2:H2')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F2937']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                ]);

                $row = 3;
                $categories = Category::with('products')->get();

                foreach ($categories as $cat) {
                    if ($cat->products->isEmpty()) continue;

                    // صف تصنيف باللون الرمادي
                    $sheet->setCellValue("C{$row}", strtoupper($cat->name));
                    $sheet->getStyle("B{$row}:H{$row}")->applyFromArray([
                        'font' => ['bold' => true, 'color' => ['rgb' => '111827']],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']],
                    ]);
                    $row++;

                    foreach ($cat->products as $p) {
                        $sheet->setCellValue("B{$row}", $p->item_code);
                        $sheet->setCellValue("C{$row}", $p->product_name);
                        $sheet->setCellValue("D{$row}", (float)$p->quantity);
                        $sheet->setCellValue("E{$row}", (float)$p->purchase_cost);
                        $sheet->setCellValue("F{$row}", (float)$p->selling_price);

                        // معادلات إكسل حية تطابق ملفهم
                        $sheet->setCellValue("G{$row}", "=D{$row}*E{$row}");
                        $sheet->setCellValue("H{$row}", "=D{$row}*F{$row}");
                        $row++;
                    }
                }

                // ضبط العرض تلقائياً
                foreach (range('B', 'H') as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }
            },
        ];
    }
}

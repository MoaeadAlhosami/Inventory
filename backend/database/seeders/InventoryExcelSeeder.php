<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InventoryExcelSeeder extends Seeder
{
    public function run(): void
    {
        $filePath = storage_path('app/Inventory.xlsx');

        if (!file_exists($filePath)) {
            $this->command->error("الملف غير موجود في المسار: {$filePath}");
            return;
        }

        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $currentCategory = 'GENERAL';
        $itemsToProcess = [];

        // خريطة أسماء التصنيفات الشائعة
        $knownCategories = [
            'UPGRADE PARTS',
            'BODY KITS',
            'SERVICE PARTS',
            'OIL',
            'COOLANT',
            'CLEANER',
            'FILTER',
            'SPARK PLUG',
            'REPAIR'
        ];

        // 1. قراءة وتنظيف الصفوف من الشيت
        for ($row = 2; $row <= $highestRow; $row++) {
            $code  = trim((string)$sheet->getCell("B{$row}")->getValue());
            $name  = trim((string)$sheet->getCell("C{$row}")->getValue());
            $qty   = $sheet->getCell("D{$row}")->getValue();
            $cost  = $sheet->getCell("E{$row}")->getValue();
            $price = $sheet->getCell("F{$row}")->getValue();

            // فحص إذا كان الصف عنوان لتصنيف (Category Header)
            if (empty($code) && !empty($name) && is_null($qty) && is_null($cost)) {
                $upperName = strtoupper($name);
                foreach ($knownCategories as $cat) {
                    if (str_contains($upperName, $cat)) {
                        $currentCategory = $cat;
                        break;
                    }
                }
                continue;
            }

            // تجاهل الصفوف الفارغة بالكامل
            if (empty($code) && empty($name) && is_null($qty)) {
                continue;
            }

            // معالجة اللمبات التي ليس لها اسم في نهاية الملف
            if ($code === 'W16W-12V16W' && empty($name)) {
                $name = 'OSRAM W16W BULB';
            } elseif ($code === 'P21/4W-12V21/4W' && empty($name)) {
                $name = 'OSRAM P21/4W BULB';
            }

            // توليد كود تلقائي للقطع الصينية/القطع التي ليس لها كود رسمي
            if (empty($code) && !empty($name)) {
                $slug = Str::slug(Str::limit($name, 25, ''));
                $code = 'CUSTOM-' . strtoupper(str_replace('-', '', $slug));
            }

            if (empty($code)) {
                continue;
            }

            $numericQty = is_numeric($qty) ? (float)$qty : 0.0;
            $numericCost = is_numeric($cost) ? (float)$cost : 0.0;
            $numericPrice = is_numeric($price) ? (float)$price : null;

            // تجميع البيانات لدمج المكررات بحساب المتوسط المرجح
            if (!isset($itemsToProcess[$code])) {
                $itemsToProcess[$code] = [
                    'category'      => $currentCategory,
                    'item_code'     => $code,
                    'product_name'  => $name ?: $code,
                    'total_qty'     => $numericQty,
                    'total_spend'   => ($numericQty * $numericCost),
                    'selling_price' => $numericPrice,
                ];
            } else {
                // إذا تكرر الكود: نجمع الكميات والتكلفة الإجمالية
                $itemsToProcess[$code]['total_qty'] += $numericQty;
                $itemsToProcess[$code]['total_spend'] += ($numericQty * $numericCost);
                if ($numericPrice && !$itemsToProcess[$code]['selling_price']) {
                    $itemsToProcess[$code]['selling_price'] = $numericPrice;
                }
            }
        }

        // 2. إدخال البيانات في قاعدة البيانات
        DB::transaction(function () use ($itemsToProcess) {
            $categoriesCache = [];

            foreach ($itemsToProcess as $item) {
                $catName = $item['category'];
                if (!isset($categoriesCache[$catName])) {
                    $categoriesCache[$catName] = Category::firstOrCreate(['name' => $catName])->id;
                }

                $finalQty = $item['total_qty'];
                // حساب متوسط التكلفة المرجح: إجمالي المبلغ المدفوع / إجمالي الكمية
                $finalCost = ($finalQty > 0) ? ($item['total_spend'] / $finalQty) : 0.0;

                Product::updateOrCreate(
                    ['item_code' => $item['item_code']],
                    [
                        'category_id'     => $categoriesCache[$catName],
                        'product_name'    => $item['product_name'],
                        'quantity'        => $finalQty,
                        'purchase_cost'   => round($finalCost, 3),
                        'selling_price'   => $item['selling_price'],
                        'min_stock_level' => 2,
                        'is_active'       => true,
                    ]
                );
            }
        });

        $count = count($itemsToProcess);
        $this->command->info("تم استيراد وتنظيف {$count} منتج بنجاح بدون تكرار وبحساب متوسط التكلفة!");
    }
}

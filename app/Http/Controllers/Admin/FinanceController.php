<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Finance\SummarizeFinances;
use App\Enums\ExpenseCategory;
use App\Enums\FinanceEntryType;
use App\Enums\FinancePeriod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\FinanceEntryRequest;
use App\Http\Resources\FinanceEntryResource;
use App\Models\FinanceEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    /**
     * Show the finance dashboard and the ledger for the selected period.
     */
    public function index(Request $request, SummarizeFinances $summarizeFinances): Response
    {
        $period = FinancePeriod::tryFrom($request->string('period')->toString()) ?? FinancePeriod::ThisMonth;
        $type = FinanceEntryType::tryFrom($request->string('type')->toString());

        return Inertia::render('admin/finance/index', [
            'summary' => $summarizeFinances->handle($period),
            'entries' => FinanceEntryResource::collection(
                FinanceEntry::query()
                    ->with('recorder:id,name')
                    ->filtered($period, $type)
                    ->latest('occurred_on')
                    ->latest('id')
                    ->paginate(15)
                    ->withQueryString()
            ),
            'filters' => ['period' => $period->value, 'type' => $type->value ?? 'all'],
            'periods' => FinancePeriod::options(),
            'types' => FinanceEntryType::options(),
            'categories' => ExpenseCategory::options(),
        ]);
    }

    /**
     * Record a ledger entry.
     */
    public function store(FinanceEntryRequest $request): RedirectResponse
    {
        FinanceEntry::create([...$request->entryData(), 'recorded_by' => $request->user()->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Entry recorded.')]);

        return back();
    }

    /**
     * Correct a ledger entry.
     */
    public function update(FinanceEntryRequest $request, FinanceEntry $finance): RedirectResponse
    {
        $finance->update($request->entryData());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Entry updated.')]);

        return back();
    }

    /**
     * Delete a ledger entry.
     */
    public function destroy(FinanceEntry $finance): RedirectResponse
    {
        $finance->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Entry deleted.')]);

        return back();
    }
}

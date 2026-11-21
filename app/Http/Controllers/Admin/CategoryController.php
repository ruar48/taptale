<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * List and manage categories.
     */
    public function index(): Response
    {
        return Inertia::render('admin/categories/index', [
            'categories' => CategoryResource::collection(
                Category::query()->withCount('products')->orderBy('sort_order')->orderBy('id')->get()
            ),
        ]);
    }

    /**
     * Create a category.
     */
    public function store(CategoryRequest $request): RedirectResponse
    {
        $category = Category::create($request->categoryData());

        $this->syncImage($request, $category);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category created.')]);

        return to_route('admin.categories.index');
    }

    /**
     * Update a category.
     */
    public function update(CategoryRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->categoryData());

        $this->syncImage($request, $category);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category updated.')]);

        return to_route('admin.categories.index');
    }

    /**
     * Delete a category. Products stay in the catalog.
     */
    public function destroy(Category $category): RedirectResponse
    {
        if ($category->image_path !== null) {
            Storage::disk(config('taptale.media_disk'))->delete($category->image_path);
        }

        $category->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category deleted.')]);

        return to_route('admin.categories.index');
    }

    private function syncImage(CategoryRequest $request, Category $category): void
    {
        $disk = Storage::disk(config('taptale.media_disk'));

        if (($request->boolean('remove_image') || $request->hasFile('image')) && $category->image_path !== null) {
            $disk->delete($category->image_path);
            $category->update(['image_path' => null]);
        }

        if ($request->hasFile('image')) {
            $category->update([
                'image_path' => $request->file('image')->store('categories', config('taptale.media_disk')),
            ]);
        }
    }
}

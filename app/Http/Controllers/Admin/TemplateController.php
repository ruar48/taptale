<?php

namespace App\Http\Controllers\Admin;

use App\Enums\TemplateLayout;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TemplateRequest;
use App\Http\Resources\TemplateResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\Template;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class TemplateController extends Controller
{
    /**
     * List design templates.
     */
    public function index(): Response
    {
        return Inertia::render('admin/templates/index', [
            'templates' => TemplateResource::collection(
                Template::query()->with('categories:id,name,slug')->orderBy('sort_order')->orderBy('id')->get()
            ),
        ]);
    }

    /**
     * Show the form for creating a template.
     */
    public function create(): Response
    {
        return Inertia::render('admin/templates/form', [
            'template' => null,
            ...$this->formOptions(),
        ]);
    }

    /**
     * Store a new template.
     */
    public function store(TemplateRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $template = Template::create($request->templateData());
            $template->categories()->sync($request->validated('category_ids'));
            $template->products()->sync($request->validated('product_ids', []));
            $this->syncImages($request, $template);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Template created.')]);

        return to_route('admin.templates.index');
    }

    /**
     * Show the form for editing a template.
     */
    public function edit(Template $template): Response
    {
        $template->load(['categories:id,name,slug', 'products:id']);

        return Inertia::render('admin/templates/form', [
            'template' => new TemplateResource($template),
            ...$this->formOptions(),
        ]);
    }

    /**
     * Update a template.
     */
    public function update(TemplateRequest $request, Template $template): RedirectResponse
    {
        DB::transaction(function () use ($request, $template): void {
            $template->update($request->templateData());
            $template->categories()->sync($request->validated('category_ids'));
            $template->products()->sync($request->validated('product_ids', []));
            $this->syncImages($request, $template);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Template saved.')]);

        return to_route('admin.templates.index');
    }

    /**
     * Delete a template. Placed orders keep the template name.
     */
    public function destroy(Template $template): RedirectResponse
    {
        $disk = Storage::disk(config('taptale.media_disk'));

        foreach (array_filter([$template->preview_path, $template->mockup_path]) as $path) {
            $disk->delete($path);
        }

        $template->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Template deleted.')]);

        return to_route('admin.templates.index');
    }

    private function syncImages(TemplateRequest $request, Template $template): void
    {
        $diskName = (string) config('taptale.media_disk');
        $disk = Storage::disk($diskName);

        foreach (['preview' => 'preview_path', 'mockup' => 'mockup_path'] as $input => $column) {
            $replacing = $request->hasFile($input);

            if (($replacing || $request->boolean("remove_{$input}")) && $template->{$column} !== null) {
                $disk->delete($template->{$column});
                $template->{$column} = null;
            }

            if ($replacing) {
                $template->{$column} = $this->storeImage($request->file($input), $diskName);
            }
        }

        $template->save();
    }

    /**
     * Store an uploaded template image, failing loudly if the disk rejects it.
     */
    private function storeImage(UploadedFile $file, string $disk): string
    {
        $path = $file->store('templates', $disk);

        if ($path === false) {
            throw new RuntimeException('The template image could not be stored.');
        }

        return $path;
    }

    /**
     * Shared select options for the template form.
     *
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'categories' => Category::query()->orderBy('sort_order')->get(['id', 'name']),
            'products' => Product::query()->orderBy('sort_order')->get(['id', 'name']),
            'layouts' => TemplateLayout::options(),
        ];
    }
}

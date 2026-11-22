<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\TemplateResource;
use App\Models\Category;
use App\Models\Template;
use Inertia\Inertia;
use Inertia\Response;

class TemplateGalleryController extends Controller
{
    /**
     * Browse every active design template.
     */
    public function __invoke(): Response
    {
        return Inertia::render('storefront/templates', [
            'templates' => TemplateResource::collection(
                Template::active()->with(['categories' => fn ($query) => $query->where('is_active', true)])->get()
            ),
            'categories' => CategoryResource::collection(Category::active()->get()),
            'seo' => [
                'title' => 'Keychain Designs',
                'description' => 'Browse personalized keychain designs for every occasion. Add your photos, names and message — or let our designers adapt one for you.',
            ],
        ]);
    }
}

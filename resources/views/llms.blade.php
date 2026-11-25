{{-- Served as text/plain, so values are printed raw: HTML escaping would show up as "&amp;" in the text. --}}
# {!! $business['name'] !!}

> {!! $description !!}

{!! $business['name'] !!} is a small gift studio in {!! $business['town'] !!}, {!! $business['province'] !!}, Philippines. It designs and makes personalized NFC keychains and photo keepsakes by hand. Every keychain comes with its own memory page at no extra cost: photos, a video, a song and a message that open when the keychain is tapped on a phone (no app needed) or its QR code is scanned. Customers approve their design before production starts.

## Location and delivery

- Studio: {!! $business['town'] !!}, {!! $business['province'] !!}, Philippines
- Delivers to: {!! implode(', ', $business['service_area']) !!} ({!! $business['province'] !!})
- Payment: QR Ph (GCash, Maya, bank apps) or cash on delivery
- Prices are in Philippine pesos (PHP)
@if (filled($business['email']))
- Email: {!! $business['email'] !!}
@endif
@if (filled($business['phone']))
- Phone: {!! $business['phone'] !!}
@endif
@if (filled($business['facebook_url']))
- Facebook: {!! $business['facebook_url'] !!}
@endif
@if (filled($business['instagram_url']))
- Instagram: {!! $business['instagram_url'] !!}
@endif

## Gifts by occasion

@foreach ($categories as $category)
- [{!! $category->name !!}]({{ route('categories.show', $category) }}){!! filled($category->tagline) ? ': '.$category->tagline : '' !!}
@endforeach

## Products

@foreach ($products as $product)
- [{!! $product->name !!}]({{ route('products.show', $product) }}): from ₱{{ number_format($product->base_price / 100) }}. {!! $product->short_description !!}
@endforeach

## Frequently asked questions

@foreach ($faqs as $faq)
### {!! $faq['question'] !!}

{!! $faq['answer'] !!}

@endforeach
## More

- [Memory page designs]({{ route('experiences.templates') }})
- [Start an order]({{ route('orders.create') }})
- [Shipping and delivery]({{ route('pages.shipping') }})
- [Returns and refunds]({{ route('pages.returns') }})
- [About us]({{ route('pages.about') }})

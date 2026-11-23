import { useEffect, useState } from 'react';

export type DetectedAddress = {
    address_line: string;
    city: string;
    province: string;
    postal_code: string;
};

type NominatimAddress = Partial<
    Record<
        | 'house_number'
        | 'road'
        | 'quarter'
        | 'suburb'
        | 'village'
        | 'neighbourhood'
        | 'city'
        | 'town'
        | 'municipality'
        | 'state'
        | 'province'
        | 'region'
        | 'postcode',
        string
    >
>;

const REVERSE_GEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Turns an OpenStreetMap address into the checkout's Philippine address
 * fields. Barangays show up as quarter / suburb / village depending on the
 * area, and Metro Manila has a region instead of a province.
 */
function toCheckoutAddress(address: NominatimAddress): DetectedAddress {
    const street = [address.house_number, address.road]
        .filter(Boolean)
        .join(' ');
    const barangay =
        address.quarter ??
        address.suburb ??
        address.village ??
        address.neighbourhood;

    return {
        address_line: [street, barangay].filter(Boolean).join(', '),
        city:
            address.city ??
            address.town ??
            address.municipality ??
            address.village ??
            '',
        province: address.state ?? address.province ?? address.region ?? '',
        postal_code: address.postcode ?? '',
    };
}

function currentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
        }),
    );
}

function positionErrorMessage(error: GeolocationPositionError): string {
    if (error.code === error.PERMISSION_DENIED) {
        return 'Location access was blocked. Allow it in your browser settings, or type your address instead.';
    }

    if (error.code === error.TIMEOUT) {
        return 'Finding your location took too long. Please try again.';
    }

    return 'We couldn’t find your location. Please type your address instead.';
}

/**
 * Looks up the shopper's address from their device location. Coordinates
 * are only requested when they press the button, and are sent to
 * OpenStreetMap's Nominatim service to resolve the street address.
 */
export function useCurrentAddress() {
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isSupported, setIsSupported] = useState(false);

    // Checked after mount so server-rendered markup matches the first paint.
    useEffect(() => {
        setIsSupported(window.isSecureContext && 'geolocation' in navigator);
    }, []);

    const locate = async (): Promise<DetectedAddress | null> => {
        if (!isSupported) {
            setError('Your browser can’t share your location here.');

            return null;
        }

        setIsLocating(true);
        setError(null);

        try {
            let position: GeolocationPosition;

            try {
                position = await currentPosition();
            } catch (positionError) {
                setError(
                    positionErrorMessage(
                        positionError as GeolocationPositionError,
                    ),
                );

                return null;
            }

            const query = new URLSearchParams({
                format: 'jsonv2',
                addressdetails: '1',
                zoom: '18',
                'accept-language': 'en',
                lat: String(position.coords.latitude),
                lon: String(position.coords.longitude),
            });

            const response = await fetch(`${REVERSE_GEOCODE_URL}?${query}`, {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Reverse geocoding failed: ${response.status}`);
            }

            const result = (await response.json()) as {
                address?: NominatimAddress;
            };

            if (!result.address) {
                setError(
                    'We couldn’t match your location to an address. Please type it instead.',
                );

                return null;
            }

            return toCheckoutAddress(result.address);
        } catch {
            setError(
                'We couldn’t look up your address right now. Please type it instead.',
            );

            return null;
        } finally {
            setIsLocating(false);
        }
    };

    return { locate, isLocating, isSupported, error };
}

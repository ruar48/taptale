<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;

/**
 * Rate limiting that counts a whole IPv6 network as one visitor.
 *
 * A single home or phone connection usually owns an entire IPv6 /64, so it
 * can hop through billions of addresses and dodge any limit keyed on the
 * full address. IPv4 addresses are scarce and stay keyed individually.
 * Bound in place of Laravel's ThrottleRequests, so every `throttle:`
 * route uses it; named limiters key with {@see self::networkOf()}.
 */
class ThrottleRequestsByNetwork extends ThrottleRequests
{
    /**
     * The rate-limit identity of an address: an IPv4 address as is, or the
     * /64 network an IPv6 address belongs to (IPv4-mapped IPv6 addresses
     * count as the IPv4 address they carry).
     */
    public static function networkOf(?string $ip): string
    {
        return self::prefixOf($ip, 64);
    }

    /**
     * A wider IPv6 grouping: the /48 an address belongs to. Many providers
     * give one customer a /56 or a /48 (256 to 65,536 /64 networks), so the
     * limits that matter most add a looser limit at this level on top of
     * the /64 one. IPv4 addresses stay as they are.
     */
    public static function wideNetworkOf(?string $ip): string
    {
        return self::prefixOf($ip, 48);
    }

    /**
     * The IPv6 network of the given prefix length (64 or 48) an address
     * belongs to; IPv4 (and IPv4-mapped IPv6) addresses as the IPv4 address.
     */
    private static function prefixOf(?string $ip, int $bits): string
    {
        $ip = (string) $ip;

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) {
            return $ip;
        }

        $packed = inet_pton($ip);

        if ($packed === false) {
            return $ip;
        }

        if (str_starts_with($packed, str_repeat("\0", 10)."\xff\xff")) {
            return (string) inet_ntop(substr($packed, 12));
        }

        $bytes = intdiv($bits, 8);

        return inet_ntop(substr($packed, 0, $bytes).str_repeat("\0", 16 - $bytes)).'/'.$bits;
    }

    /**
     * The network a request comes from, for keying rate limits.
     */
    public static function visitorKey(Request $request): string
    {
        return self::networkOf($request->ip());
    }

    /**
     * Resolve request signature.
     *
     * @param  Request  $request
     * @return string
     */
    protected function resolveRequestSignature($request)
    {
        if ($request->user() === null && ($route = $request->route()) !== null) {
            $identifier = $route->getDomain().'|'.self::visitorKey($request);

            return self::$shouldHashKeys ? sha1($identifier) : $identifier;
        }

        return parent::resolveRequestSignature($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckMenuAccess
{
    public function handle(Request $request, Closure $next, string $menuId): Response
    {
        $user = Auth::user();

        if (!$user) {
            // Not logged in → redirect to login
            return redirect()->route('login');
        }

        if (!$user->hasAccess($menuId)) {
            $home = $user->isCashier() ? route('pos.index') : route('dashboard');

            // Guard against infinite redirect loop if current URL is the target home URL
            if ($request->url() === $home || $request->fullUrl() === $home) {
                abort(403, 'You do not have permission to access this page.');
            }

            return redirect()->to($home)->with('error', 'You do not have access to that page.');
        }

        return $next($request);
    }
}
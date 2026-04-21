<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Handle an authentication attempt.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();

            $user = Auth::user();

            $redirectUrl = match ($user->role) {
                'recipient' => '/recipient/dashboard',
                'admin'     => '/admin/dashboard',
                'staff'     => '/staff/dashboard',
                'wigmaker'  => '/wigmaker/dashboard',
                default     => '/donor/dashboard',
            };

            if ($request->expectsJson()) {
                return response()->json(['redirect' => $redirectUrl]);
            }
            return redirect()->intended($redirectUrl);
        }

        if ($request->expectsJson()) {
            return response()->json(['errors' => ['email' => ['The provided credentials do not match our records.']]], 422);
        }

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email');
    }

    /**
     * Handle user registration.
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'userType' => ['required', Rule::in(['donor', 'recipient'])],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'country' => ['required', 'string', 'max:255'],
            'region' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:255'],
            'age' => ['required', 'integer', 'min:1', 'max:120'],
            'gender' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'regex:/^\+63[0-9]{10}$/', 'max:13'],
        ]);

        $user = User::create([
            'name' => $validated['first_name'] . ' ' . $validated['last_name'],
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'role' => $validated['userType'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'country' => $validated['country'],
            'region' => $validated['region'],
            'postal_code' => $validated['postal_code'],
            'age' => $validated['age'],
            'gender' => $validated['gender'],
            'phone' => $validated['phone'],
        ]);

        event(new Registered($user));


        Auth::login($user);

        $redirectUrl = $user->role === 'recipient' ? '/recipient/dashboard' : '/donor/dashboard';

        if ($request->expectsJson()) {
            return response()->json(['redirect' => $redirectUrl]);
        }

        return redirect($redirectUrl);
    }

    /**
     * Log the user out of the application.
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }

    /**
     * Show the forgot password form.
     */
    public function showForgotPassword()
    {
        return view('pages.forgot-password');
    }

    /**
     * Send a password reset link to the given user.
     */
    public function sendResetLink(Request $request)
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        if ($request->expectsJson()) {
            if ($status === Password::RESET_LINK_SENT) {
                return response()->json(['message' => __($status)]);
            }
            return response()->json(['errors' => ['email' => [__($status)]]], 422);
        }

        return $status === Password::RESET_LINK_SENT
            ? back()->with('success', __($status))
            : back()->withErrors(['email' => __($status)]);
    }

    /**
     * Show the reset password form.
     */
    public function showResetPassword(Request $request, string $token)
    {
        return view('pages.reset-password', [
            'token' => $token,
            'email' => $request->query('email'),
        ]);
    }

    /**
     * Handle an incoming new password request.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token'                 => ['required'],
            'email'                 => ['required', 'email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])
                     ->setRememberToken(Str::random(60));
                $user->save();
                event(new PasswordReset($user));
            }
        );

        if ($request->expectsJson()) {
            if ($status === Password::PASSWORD_RESET) {
                return response()->json(['message' => __($status)]);
            }
            return response()->json(['errors' => ['email' => [__($status)]]], 422);
        }

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('success', 'Password reset successfully. You may now log in.')
            : back()->withErrors(['email' => __($status)]);
    }
}

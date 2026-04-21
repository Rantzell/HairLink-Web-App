# HairLink Backend Operations Documentation

This document summarizes the transition of the HairLink web application from mock-data/localStorage to a fully functional, database-driven Laravel backend.

## 🔗 Key Backend Connections
The application is now integrated with **PostgreSQL (Supabase)**. All major administrative and operational tables are live:
*   **Users:** Manages accounts and roles (`admin`, `staff`, `wigmaker`, `donor`, `recipient`).
*   **Donations:** Real-time tracking of hair donations.
*   **Hair Requests:** Processing and matching of recipient wig requests.
*   **Wig Productions:** Task management for wigmakers.
*   **Status History:** Automated logging of status transitions for every donation/request.

---

## 🛠️ Summary of Major Changes
1.  **Dynamic Dashboards:** Replaced static Blade loops with database queries in `AdminController`, `StaffController`, and `WigmakerController`.
2.  **AJAX Status Updates:** Implemented secure `fetch` handlers in `staff-module.js` and `wigmaker-module.js`. These handle state transitions (e.g., *Processing* to *Completed*) without page reloads.
3.  **Cross-Device Support (Network Testing):** Modified `AppServiceProvider.php` to force **HTTPS** protocols for all assets (`css`, `js`, `images`) when detected behind a proxy (like localtunnel). This prevents "mixed content" errors on mobile devices.
4.  **Automatic Inventory Logic:** The **Hair Stock** and **Wig Stock** now calculate real availability based on database counts.
5.  **Role System Upgrade:** Converted the `role` column in the database to a text-based format to support new roles (`staff`, `wigmaker`) beyond the original three.

---

## 🔍 Troubleshooting & Debugging

### 1. Assets Not Loading (No Styles/JS)
*   **Cause:** Usually occurs when accessing the site via LocalTunnel or a local IP without HTTPS.
*   **Fix:** Ensure you are using the `https://` version of the URL. Check `AppServiceProvider.php` to ensure `URL::forceScheme('https')` is active for your environment.

### 2. Form Submissions Fail (419 Error)
*   **Cause:** Missing or expired CSRF token.
*   **Fix:** Ensure every Blade form has `@csrf`. For AJAX requests, ensure the headers include:
    ```javascript
    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    ```

### 3. Missing Data in Tables
*   **Cause:** Filter mismatch or null relationships.
*   **Fix:** Check the Controller. Most tables now use `->whereIn()` or `->with()`. 
    *   *Example:* If a Wigmaker sees no tasks, verify the record in `wig_productions` has their `user_id`.

### 4. Database Access Logs
Check logs for Supabase connection errors:
*   Windows command: `tail -f storage/logs/laravel.log`

---

## ⚙️ Maintenance & Future Steps

### Adding New Regions/Cities
Update the arrays in `app/Http/Controllers/StaffController.php` under the `donorVerification` or `hairStock` methods to expand geographical filtering.

### Adding New Users
You can use the built-in Seeder to reset testing accounts:
```bash
php artisan db:seed --class=UserRoleSeeder
```
*(Default testing accounts)*:
- **Staff**: `staff@hairlink.ph`
- **Wigmaker**: `wigmaker@hairlink.ph`
- **Admin**: `admin@hairlink.ph`
- **Password**: `password123`

### Database Schema Updates
If you need to add new fields:
1. Create migration: `php artisan make:migration [your_change]`
2. Define the schema in `up()`.
3. Run: `php artisan migrate`

---

## 🔑 Core Files to Monitor
| Layer | File Path |
| :--- | :--- |
| **Routing** | `routes/web.php` |
| **Business Logic** | `app/Http/Controllers/StaffController.php` |
| **Logic (Wigmaker)** | `app/Http/Controllers/WigmakerController.php` |
| **Frontend AJAX** | `public/assets/js/staff-module.js` |
| **Security Config** | `app/Providers/AppServiceProvider.php` |

---
*Document Created: April 2026*

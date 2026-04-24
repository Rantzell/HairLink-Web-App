# 🤖 HairLink Full-Stack Handover & Agent Guide

This document is designed for developers and AI Coding Agents (like Antigravity) to understand, maintain, and extend the HairLink-Web application.

---

## 🏗️ Technical Architecture

### **Backend: Laravel 11 + PostgreSQL (Supabase)**
*   **Routing:** Located in `routes/web.php`. Uses role-based redirection.
*   **Controllers:** 
    *   `StaffController`: Handles donor/recipient verification, tracking, and matching.
    *   `WigmakerController`: Handles production task lifecycle.
    *   `AdminController`: Manages user accounts and system-wide metrics.
*   **Migrations:** Database schema is strictly defined. Always run `php artisan migrate` after pulling changes.
*   **Security:** CSRF is enforced on all routes. HTTPS is forced in `AppServiceProvider` for proxy compatibility.

### **Frontend: Blade + Vite + Vanilla JS/CSS**
*   **Styling:** Located in `public/assets/css/`. Follows a modular approach (e.g., `staff-module.css`).
*   **Logic:** Located in `public/assets/js/`. Uses standard `fetch` API for backend communication.
*   **Live Assets:** Managed by Vite during development (`npm run dev`).

---

## 🚦 Instructions for Future Agents

### **1. Data Consistency**
When adding new features, **DO NOT use localStorage**. Always create a migration, update the Eloquent model, and use AJAX/Fetch to persist data to PostgreSQL.

### **2. Role-Based Access Control (RBAC)**
Most administrative routes are grouped by role. Ensure any new route is added to the correct middleware group in `web.php` or checked within the controller:
```php
if (Auth::user()->role !== 'staff') { abort(403); }
```

### **3. Mobile & Network Testing**
The application uses a custom fix in `app/Providers/AppServiceProvider.php` to handle **Mixed Content Errors**. If assets fail to load on a mobile device tunnel:
*   Ensure the tunnel is using `https`.
*   Ensure `npm run dev` is running locally.

### **4. Adding New Modules**
If creating a new module (e.g., "Logistics"):
1.  **Migration:** Create the table.
2.  **Model:** Define relationships in `app/Models/`.
3.  **Controller:** Create logic.
4.  **Route:** Register in `web.php`.
5.  **JS:** Create a new file in `public/assets/js/` and link it in the Blade view.

---

## 🛠️ Essential Commands

### **Environment Setup**
```bash
composer install
npm install
php artisan migrate
php artisan db:seed --class=UserRoleSeeder
```

### **Local Development**
```bash
php artisan serve
npm run dev
```

### **Mobile/Remote Testing**
```bash
# In separate terminals
php artisan serve
npx localtunnel --port 8000 --subdomain hairlink-testing
```

---

## 📊 Database Schema Highlights
*   `users.role`: Now a `string` (converted from enum) to support dynamic growth.
*   `wig_productions`: Linked to `donations` (hair source) and `users` (assigned wigmaker).
*   `hair_requests`: Linked to `users` (recipients) and contains medical metadata.

---
*Created by Antigravity AI - Full Stack Engineering Agent*

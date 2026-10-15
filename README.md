# Maggie's Treat — customer ordering website + owner dashboard

A mobile-first website for the menu in the supplied Maggie's Treat artwork. Customers can browse the menu, filter by category, add food to a basket, submit their name and phone number, and leave a star review. The owner has a separate login page to see orders, change order status, track daily/weekly/monthly completed sales, and review average ratings.

## Included

- `index.html` — public customer website and online order form
- `admin.html` — private owner dashboard login
- `css/styles.css` — responsive layout, colours, cards and mobile styling
- `js/app.js` — menu, basket, order submission and customer reviews
- `js/admin.js` — secure login flow, orders, statuses and analytics
- `js/config.js` — your Supabase connection settings
- `sql/supabase-setup.sql` — tables, initial menu, triggers, sales statistics and Row Level Security rules
- `assets/` — your uploaded logo and original poster

## How the website works

1. Customers can view all listed products/prices and build a basket.
2. Once Supabase is connected, orders are saved to the database. The database recalculates the order total using its own menu prices instead of trusting the browser.
3. Customers cannot read order records or other customers' personal details.
4. Only the configured admin account can read orders/reviews, update order statuses and see the dashboard statistics.
5. Revenue is based on orders marked **Completed / paid**. Moving an order to that status records the completion time. The daily, weekly and monthly reports use South African time. Cancelled and uncompleted orders are not counted as revenue.
6. If the database has not been connected yet, the customer order form offers a WhatsApp fallback. Online review submission and admin reports need the database setup completed.

## Setup guide (Supabase)

You need a Supabase account for the database and GitHub to host the website. The browser uses the **anon/publishable key only**; never use a service-role/secret key in `js/config.js`.

1. Create a new project at [Supabase](https://supabase.com/). Save the project password somewhere safe.
2. Open **Project Settings / API** (or the project's API/connect details) and copy the project URL and the publishable key (usually starts with `sb_publishable_`). If your project only has a legacy `anon` key, that key also works.
3. Create the owner account in **Authentication → Users**. Use the email address you want to use for the dashboard and set a strong password. Turn off public user sign-ups if you do not need customers to create accounts.
4. Open `sql/supabase-setup.sql`. Replace **every** occurrence of `your-admin-email@example.com` with the exact owner email created in step 3. Paste the complete edited script in **SQL Editor** in Supabase and run it.
5. Open `js/config.js` and replace the three example values:
   - `supabaseUrl`: your Supabase project URL, starting with `https://`
   - `supabasePublishableKey`: your publishable key (usually starts with `sb_publishable_`; a legacy `anon` key also works)
   - `adminEmail`: the same owner email used in steps 3–4
6. Save the file. Do not add your database password or service-role/secret key to the project.
7. Test the customer website and place a small test order. Open `admin.html`, sign in as the owner and confirm the order appears. Change the test order to **Completed / paid** to test the revenue report. Delete or cancel the test order from the Supabase dashboard if needed (do not count it as a real sale).

## Publish the website with GitHub Pages

1. Sign in to [GitHub](https://github.com/) and create a new repository named `maggies-treat`.
2. Upload the **contents** of this folder to the root of that repository. Keep the folder structure exactly as shown (`assets`, `css`, `js`, `sql`). `index.html` must be at the repository root, not inside another nested folder.
3. Open the repository's **Settings → Pages**. Under build/deployment, choose **Deploy from a branch**, choose the `main` branch and `/ (root)` folder, then save.
4. Wait for GitHub Pages to publish the website. The public link will be shown in the Pages section. It should look like `https://YOUR-USERNAME.github.io/maggies-treat/`.
5. Your customer website is the main link. The admin page uses the same link with `admin.html` at the end, for example `https://YOUR-USERNAME.github.io/maggies-treat/admin.html`. Keep the admin link private, and remember that privacy is enforced by login and the database policies—not by hiding the URL.

## Before sharing the website

- Confirm the menu and prices are correct.
- Check that the pickup address and phone number are correct.
- Run the Supabase SQL and fill in `js/config.js` before expecting online orders/reviews to save.
- Test a customer order on another browser/phone and confirm it appears in admin.
- Only mark orders `Completed / paid` after receiving payment. This is what adds them to the revenue figures.
- Keep the admin password private. The Supabase public key is designed to be visible in the browser; the Row Level Security policies in the SQL file protect private customer information.

## Adjusting prices later

The initial menu values are in `sql/supabase-setup.sql`. Once the database has been set up, the live website reads active menu values from `menu_items`. For price changes, update the relevant row in Supabase's Table Editor so the public price and server-calculated order total stay in sync. Do not rerun the original seed `INSERT` without reviewing it, because it updates the menu rows back to the original prices.

## Notes

- This project is a static website, so it can be hosted by GitHub Pages. Supabase stores the actual orders/reviews and enforces access permissions.
- The supplied price list says **Ice Pop — From R2**. The database records the listed starting price (R2) for calculations; adjust the menu/ordering approach if different ice pop flavours cost different amounts.
- The `original-menu-poster.jpg` is included as a reference asset. The website itself shows an accessible text menu so customers can read it easily on phones.

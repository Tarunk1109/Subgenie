# Phase 3 — Missing Requirements: Implementation Guide

This guide describes exactly what needs to be built, modified, or reorganized in the SubGenie project. No code is provided — follow the instructions and implement each task from scratch based on the descriptions. Complete all tasks in order, as some tasks depend on earlier ones.

---

## Project Context

SubGenie is a Node.js + Express app using EJS as its template engine. It uses JWT authentication stored in cookies for web views, and Bearer tokens for the REST API. The `views/` folder currently has a flat structure with partials only. The `controllers/viewController.js` file handles all server-side page rendering. Authentication middleware lives in `middleware/viewAuthMiddleware.js`.

---

## TASK 1 — Fix the Views Folder Structure

### Background
The requirements specify that views must be organized into three subfolders: `layouts/`, `partials/`, and `pages/`. Currently the project only has `partials/` and all page files sit at the root of `views/`. EJS does not have a built-in layout system, so you need to install the `express-ejs-layouts` npm package to enable true layout support.

### What to do

**Install the package:**
Install `express-ejs-layouts` as a production dependency using npm.

**Update `app.js`:**
After the two existing EJS configuration lines (`app.set("view engine", "ejs")` and `app.set("views", ...)`), import and register the `express-ejs-layouts` middleware. Set the default layout to point to `layouts/main` inside the views folder. This tells Express to automatically wrap every rendered page with the layout file.

Also, modify the `app.listen()` call at the bottom of `app.js` so it only starts the server when the environment is NOT set to `"test"`. This is required for the test suite in Task 7. Export the `app` object as the default export from `app.js` so tests can import it.

**Create the `views/layouts/` directory and `views/layouts/main.ejs`:**
This file is the master HTML shell for the entire application. It must contain the full HTML document structure: the `<!DOCTYPE html>` declaration, the `<html>` tag, the full `<head>` section (with charset, viewport, title, Google Fonts for Inter, Tailwind CDN, Chart.js CDN, and the link to the custom CSS file), the opening `<body>` tag, the navigation bar partial included via EJS include, a `<main>` wrapper element, the special `<%- body %>` tag inside main (this is where express-ejs-layouts injects each page's content automatically), the footer partial included via EJS include, the closing `</main>`, `</body>`, `</html>` tags, and the `<script>` tag for `main.js`. The include paths for partials must be relative to the layouts folder (i.e., `../partials/header` and `../partials/footer`). The title tag should dynamically use a `pageTitle` variable if it exists, otherwise fall back to a default app name.

**Update `views/partials/header.ejs`:**
This file currently contains the full HTML boilerplate (doctype, head, body opening tag) plus the nav and the opening `<main>` tag. Since the layout now handles all of that, strip the file down to contain ONLY the `<nav>` element and nothing else. Keep the existing navigation logic — the conditional that shows different links based on whether the user is logged in. Remove the doctype, head, body opening, and main opening tag.

**Update `views/partials/footer.ejs`:**
This file currently closes the main tag, has a footer element, closes body and html, and includes the main.js script. Strip it down to contain ONLY the `<footer>` element. Remove the closing main tag, closing body tag, closing html tag, and the script tag for main.js — all of those are now in the layout.

**Create the `views/pages/` directory and move all page files into it:**
Move the following files from `views/` into `views/pages/`:
- `dashboard.ejs`
- `insights.ejs`
- `landing.ejs`
- `login.ejs`
- `register.ejs`
- `subscriptions.ejs`
- `usage.ejs`

After moving each file, open it and remove the EJS include line at the top that includes the header partial, and remove the EJS include line at the bottom that includes the footer partial. The layout handles these automatically now. Do not change any other content in these files.

**Update all `res.render()` calls in `controllers/viewController.js`:**
Every single `res.render()` call must be updated to use the `pages/` prefix. For example, `res.render("dashboard", ...)` becomes `res.render("pages/dashboard", ...)`. Do this for all seven existing pages: landing, login, register, dashboard, subscriptions, usage, and insights.

---

## TASK 2 — Search, Filter, Sort & Pagination on the Subscriptions Page

### Background
The Phase 2 API already supports search, filter, sort, and pagination on the subscriptions endpoint. However, none of these features are accessible from the frontend. The subscriptions page currently just fetches all subscriptions with no controls. This task adds a working search and filter bar above the subscriptions table and pagination controls below it.

### What to do

**Update the `renderSubscriptions` function in `controllers/viewController.js`:**

The function must now read the following optional query parameters from `req.query`:
- `q` — a search string to filter subscriptions by name (case-insensitive, partial match)
- `category` — filter to only show subscriptions of a specific category (exact match, case-insensitive)
- `billingCycle` — filter by billing cycle, either `"monthly"` or `"yearly"`
- `sort` — how to sort results; support these values: `newest` (by creation date descending), `oldest` (by creation date ascending), `name-asc` (alphabetical), `name-desc` (reverse alphabetical), `cost-asc` (cheapest first), `cost-desc` (most expensive first). Default to `newest`.
- `page` — the current page number, defaulting to 1
- A fixed page size of 8 items per page is appropriate

Build a MongoDB filter object from those parameters. Apply the search term to the `name` field using a case-insensitive regex. Apply category and billingCycle as direct equality filters. Apply the sort to the Mongoose query. Use `.skip()` and `.limit()` for pagination.

After fetching the paginated subscriptions, calculate the total count of matching documents (without skip/limit) and derive `totalPages` from it.

Additionally, query the database for all distinct `category` values belonging to the current user. This will be used to populate the category filter dropdown in the view.

Pass all of the following to the template: the subscriptions array (with usage counts, same as before), the `allCategories` array, the current values of `q`, `category`, `billingCycle`, and `sort` (so the form can pre-populate with the active filters), `currentPage`, `totalPages`, `totalCount`, and the `pageTitle`.

**Update `views/pages/subscriptions.ejs`:**

Add a filter/search bar above the subscriptions table. This should be a real HTML `<form>` with `method="GET"` and `action="/subscriptions"`. Inside it, place the following controls in a responsive grid layout:
- A text input for the search query, pre-filled with the current `q` value
- A dropdown select for category, with an "All Categories" option followed by one option per category from `allCategories`, with the current `categoryFilter` value pre-selected
- A dropdown select for billing cycle with options for All, Monthly, Yearly, with the current value pre-selected
- A dropdown select for sort order with all six sort options, with the current sort pre-selected
- A submit button labeled "Apply Filters"
- A plain link (not a button) to `/subscriptions` with no query params, labeled "Clear", which resets all filters
- A small text label showing the total result count

After the table, add pagination controls. These should only appear when `totalPages` is greater than 1. Render page number links using a loop from 1 to `totalPages`. Each link goes to `/subscriptions` and must carry all current filter params (`q`, `category`, `billingCycle`, `sort`) in the query string, plus the target `page` number. Highlight the current page visually. Also show a "Prev" link if `currentPage > 1` and a "Next" link if `currentPage < totalPages`, both also carrying the current filters.

When there are no results, show a contextual empty state: if filters are active, say no results match and show the Clear link. If no filters are active, show the usual "Add your first subscription" prompt.

---

## TASK 3 — User Profile Page

### Background
There is currently no way for a user to view or update their own account details through the web interface. The REST API already has `GET /api/users/profile` and `PUT /api/users/profile` endpoints, but there is no corresponding web page. This task creates a profile page accessible from the navigation.

### What to do

**Add two new controller functions to `controllers/viewController.js`:**

`renderProfile`: A simple function that renders the profile page, passing the current user object, `pageTitle` set to `"Profile"`, and both `success` and `error` set to `null`.

`handleUpdateProfile`: Handles the `POST /profile` form submission. It must:
- Read `name`, `email`, `password`, and `confirmPassword` from `req.body`
- Validate that name is not empty
- Validate that email is a properly formatted email address
- If password is provided (it is optional — the user may want to update only name/email), validate that it is at least 6 characters long and that it matches `confirmPassword`
- Check that the email is not already registered to a different user in the database
- If any validation fails, re-render the profile page with the error message and the user's current data pre-populated
- If all validation passes, update the user document in MongoDB (hash the new password with bcrypt if one was provided), re-fetch the updated user, and re-render the profile page with a success message

**Add two new routes to `routes/viewRoutes.js`:**
- `GET /profile` — protected with `viewProtect`, calls `renderProfile`
- `POST /profile` — protected with `viewProtect`, calls `handleUpdateProfile`

Also update the import statement at the top of `viewRoutes.js` to include both new controller functions.

**Create `views/pages/profile.ejs`:**

This page should have two main sections:

Section 1 — Profile header: Show the user's avatar (a circle with their first initial), their name, email address, and a role badge that shows either "admin" or "user" — styled differently for each (e.g., amber for admin, grey for user).

Section 2 — Edit form: A `POST` form to `/profile` with the following fields:
- Full Name (text input, pre-filled with `user.name`)
- Email Address (email input, pre-filled with `user.email`)
- New Password (password input, optional, with a note that it can be left blank)
- A password strength meter: a colored progress bar that updates live as the user types in the password field using JavaScript. The strength should be calculated based on length, uppercase letters, numbers, and special characters. Show a text label (Weak / Fair / Good / Strong) alongside the bar.
- Confirm New Password (password input)
- A submit button

If `error` is not null, display the error message in a styled alert box above the form. If `success` is not null, display the success message in a green alert box.

Add inline JavaScript on this page to validate the form before submission:
- Name must not be empty
- Email must match a basic email format regex
- If password is filled in, it must be at least 6 characters and match the confirm field
- Show inline error messages below each invalid field rather than using browser alerts
- The password strength meter updates on every keystroke in the password field

---

## TASK 4 — Admin Users Page

### Background
The `User` model has a `role` field supporting `"user"` and `"admin"` values. The REST API has admin-only routes protected by `adminOnly` middleware. However, there are no admin-specific web pages. This task adds a web-based admin panel where admins can view all registered users and change their roles.

### What to do

**Add `viewAdminOnly` middleware to `middleware/viewAuthMiddleware.js`:**
This new exported function works similarly to the existing `adminOnly` middleware in `authMiddleware.js`, but instead of returning a JSON 403 response, it redirects to `/dashboard` if the user does not have the `admin` role. If the user does have the admin role, it calls `next()`.

**Add two new controller functions to `controllers/viewController.js`:**

`renderAdmin`: Fetches all users from the database (excluding passwords), sorted by creation date descending. For each user, also count how many subscriptions they have. Pass this enhanced array to the template along with the current admin user, a `pageTitle` of `"Admin"`, and a `success` message from `req.query.success` if present.

`handleUpdateUserRole`: Reads a `userId` from `req.params` and a `role` from `req.body`. Validates that the role value is either `"user"` or `"admin"` — reject anything else. Updates the specified user's role in the database. Then redirects to `/admin?success=Role+updated+successfully`.

**Add two new routes to `routes/viewRoutes.js`:**
- `GET /admin` — protected with `viewProtect` then `viewAdminOnly`, calls `renderAdmin`
- `POST /admin/role/:userId` — protected with `viewProtect` then `viewAdminOnly`, calls `handleUpdateUserRole`

Update the import statements in `viewRoutes.js` to include the new controller functions and the `viewAdminOnly` middleware. The complete import list at the top of this file should now include all existing exports plus the four new ones from Tasks 3 and 4.

**Create `views/pages/admin.ejs`:**

This page should have:

A page header with the title "Admin Panel", a visual indicator (e.g., an amber-colored badge) showing this is a restricted page, and a subtitle describing its purpose.

If `success` is truthy, show a green success alert at the top of the content area.

A table listing all users with the following columns:
- User (avatar circle with first initial + full name; also show a small "(you)" label if the user's ID matches the logged-in admin's ID)
- Email address
- Number of subscriptions (from the `subCount` property added in the controller)
- Current role (shown as a styled badge — amber for admin, grey for user)
- Change Role (a form with a role dropdown and an Update button; this form `POST`s to `/admin/role/:userId`; for the currently logged-in admin, show a dash instead of the form so they cannot accidentally demote themselves)

---

## TASK 5 — Role-Based Conditional Rendering

### Background
The requirements specify that certain UI elements must only be visible based on the user's role. Specifically: the Admin link in the nav should only appear for admin users, and Edit and Delete action buttons should only appear for admin users. The profile avatar in the nav should also link to the profile page.

### What to do

**Update `views/partials/header.ejs`:**

In the authenticated nav links section (the one inside the `if user` block):
- Add an "Admin" navigation link that only renders when `user.role === 'admin'`. Style it differently from the regular nav links (e.g., amber text color) to visually distinguish it.
- Make the user avatar and name clickable, linking to `/profile`.

**Update `views/pages/subscriptions.ejs`:**

In the actions column of the subscriptions table, wrap the Edit button and the Delete button inside a conditional block that only renders them when `user.role === 'admin'`. The Log Use button, History link, and Find Alternatives button should remain visible to all logged-in users.

**Update `views/pages/dashboard.ejs`:**

In the subscriptions table on the dashboard (the one at the bottom of the page), the actions cell currently only has a "Log Use" button. Add a conditional block so that when `user.role === 'admin'`, Edit and Delete buttons also appear in that cell alongside the Log Use button. This requires the Add/Edit modal HTML and the delete/edit JavaScript from `main.js` to function on the dashboard page — add the modal HTML to the bottom of the dashboard template as well (same structure as the one on the subscriptions page).

---

## TASK 6 — Frontend JavaScript Form Validation

### Background
Currently, forms rely entirely on HTML5 `required` attributes for frontend validation, which only shows browser-native bubbles and does not validate email format or password strength. The requirements ask for explicit client-side JavaScript validation with inline error messages and a password strength indicator.

### What to do

**Update `views/pages/login.ejs`:**

- Add `novalidate` to the `<form>` element to suppress browser-native validation popups.
- Add a unique `id` to the form element.
- Add error message paragraph tags below each input field (email and password). These should be hidden by default and only made visible by JavaScript.
- Add a `<script>` block at the bottom of the page content. On form submit, prevent default submission, then:
  - Check that the email field is not empty and matches a basic email regex pattern (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
  - Check that the password field is not empty
  - If either check fails, display the appropriate error message below the relevant input and do NOT submit the form
  - If both pass, allow normal form submission

**Update `views/pages/register.ejs`:**

- Add `novalidate` to the `<form>` element.
- Add a unique `id` to the form element.
- Add error message paragraph tags below each of the four input fields.
- Add a password strength meter below the password field: a thin colored bar and a text label. This should be hidden until the user starts typing.
- Add a `<script>` block that:
  - Listens to `input` events on the password field and updates the strength meter in real time. Calculate strength by checking: length at least 8, contains uppercase letter, contains a number, contains a special character. Each check adds one point. Map 1 point → Weak (red), 2 points → Fair (amber), 3 points → Good (yellow-green), 4 points → Strong (green).
  - On form submit, prevent default, then validate:
    - Name must not be empty
    - Email must match the email regex
    - Password must be at least 6 characters
    - Confirm password must match the password field exactly
  - Show inline error messages below each failing field. Do NOT submit if any check fails.

**Update `public/js/main.js`:**

Find the `handleSubscriptionForm` function. Before making any API call, add validation logic:
- Name field must not be empty
- Cost field must be a valid number and must be 0 or greater
- Category field must not be empty

If any of these checks fail, display an error message in the corresponding error paragraph element below each field (these error elements already exist in the subscriptions modal in the updated template from Task 2) and return without making the API call. If all checks pass, proceed with the API call as before.

---

## TASK 7 — Test Suite

### Background
The project currently has no tests. `npm test` just prints an error. The requirements ask for tests that verify correct data rendering, authentication-based access control, form submission success and failure, and error handling. This task sets up a test suite using Mocha, Chai, and Supertest.

### What to do

**Install test dependencies:**
Install `mocha`, `chai`, and `supertest` as dev dependencies.

**Update the `"test"` script in `package.json`:**
Set it to run mocha targeting all `.test.js` files inside a `tests/` folder. Use a timeout of 10 seconds and the `--exit` flag so the process terminates after tests complete (important because the MongoDB connection would otherwise keep the process alive).

**Ensure `app.js` is correctly set up:**
Confirm that from Task 1, `app.js` exports the Express app as its default export and only calls `app.listen()` when `NODE_ENV !== "test"`. This is what allows Supertest to import the app without starting a real server.

**Create a `tests/` folder at the project root with three test files:**

---

### File 1: `tests/auth.test.js`

This file tests the authentication API routes. Use a timestamp-based unique email address for each test run (e.g., append `Date.now()` to a base string) so tests don't conflict with existing database records across multiple runs.

Tests to include:

`POST /api/auth/register`:
- Should return HTTP 400 when the request body is completely empty
- Should return HTTP 400 when the email field is not a valid email address
- Should return HTTP 400 when the password is fewer than 6 characters
- Should return HTTP 201 and a response body containing a `token` property when valid data is provided
- Should return HTTP 400 when attempting to register with the same email a second time (duplicate)

`POST /api/auth/login`:
- Should return HTTP 401 when the email does not exist in the database
- Should return HTTP 401 when the email exists but the password is wrong
- Should return HTTP 200 and a response body with a `token` property when correct credentials are provided

---

### File 2: `tests/subscriptions.test.js`

This file tests the subscription CRUD API routes. Before all tests run, register a new user (with a unique timestamp-based email) and log in to obtain a JWT token. Store this token and use it in the `Authorization: Bearer <token>` header for all subscription requests.

Tests to include:

`GET /api/subscriptions`:
- Should return HTTP 401 when no token is provided
- Should return HTTP 200 and a response body with a `data` property (array) when a valid token is provided

`POST /api/subscriptions`:
- Should return HTTP 201 and a response body with an `_id` property when valid subscription data is provided (name, cost, category, billingCycle)
- Store the `_id` from this response in a variable for use in subsequent tests

`GET /api/subscriptions/:id`:
- Should return HTTP 200 and the correct subscription data using the ID stored from the create test

`PUT /api/subscriptions/:id`:
- Should return HTTP 200 and a response body reflecting the updated name when the name is changed

`GET /api/subscriptions/search?q=...`:
- Should return HTTP 200 and a non-empty array when searching for a term that matches the subscription created above

`DELETE /api/subscriptions/:id`:
- Should return HTTP 200 and a response body with a `message` property containing the word "deleted"

---

### File 3: `tests/views.test.js`

This file tests the server-rendered page routes. No authentication setup is needed for most of these since they test unauthenticated behavior.

Tests to include:

`Redirect unauthenticated users to /login`:
- `GET /dashboard` should return HTTP 302 with a `Location` header pointing to `/login`
- `GET /subscriptions` should return HTTP 302 with a `Location` header pointing to `/login`
- `GET /insights` should return HTTP 302 with a `Location` header pointing to `/login`
- `GET /profile` should return HTTP 302 with a `Location` header pointing to `/login`
- `GET /admin` should return HTTP 302 with a `Location` header pointing to `/login`

`Public pages render correctly`:
- `GET /` should return HTTP 200
- `GET /login` should return HTTP 200
- `GET /register` should return HTTP 200

`Form submission error handling`:
- `POST /login` with an empty body should return HTTP 200 (re-renders login page) and the response HTML should contain the text "Invalid email or password"
- `POST /register` with a password shorter than 6 characters should return HTTP 200 and the response HTML should contain the phrase "at least 6 characters"
- `POST /register` with a password and confirmPassword that don't match should return HTTP 200 and the response HTML should contain the phrase "do not match"

---

## Final Verification Checklist

After implementing all tasks, verify the following manually by running the app:

1. The folder structure `views/layouts/`, `views/partials/`, and `views/pages/` all exist and contain the correct files
2. All public pages (landing, login, register) render without errors
3. Logging in redirects to the dashboard, and the navigation shows the correct links
4. The subscriptions page shows the search bar, filter dropdowns, sort selector, and result count. Entering a search term and submitting the form filters the results. Pagination appears when there are more than 8 subscriptions.
5. The profile page is accessible at `/profile` when logged in. Updating the name and saving shows a success message.
6. Visiting `/admin` when logged in as a regular user redirects to `/dashboard`
7. After manually setting a user's role to `"admin"` in the database (via MongoDB Compass or Atlas) and logging back in, the Admin link appears in the nav, and Edit/Delete buttons appear in the subscriptions and dashboard tables
8. The register form shows inline error messages (not browser popups) when fields are invalid, including the password strength meter appearing as you type
9. The login form shows inline error messages when fields are invalid
10. Running `npm test` executes all tests and they pass (MongoDB must be running and accessible)

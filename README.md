# StudyTracker Pro - Standalone Admin Portal

This is the dedicated, isolated Administrative Management Console for StudyTracker Pro (`admin.mathsrecoding.com`).

## Security Features
1. **Zero Attack Surface in Student App:** The main student-facing web app (`mathsrecoding.com`) contains no admin console code, reducing bundle size and preventing client-side reverse-engineering of admin tools.
2. **Strict Auth Guard:** Only the verified Administrator UID (`m1rddMA36WbVunFW3B0BzuqOwyI2`) can view or interact with this dashboard. Any non-admin sign-in is immediately signed out.
3. **HTML Sanitization:** All student profile strings (names, emails, messages, schools) are safely HTML-escaped to prevent Stored XSS from compromising the administrator's browser.
4. **Cloudflare Zero Trust Compatible:** Can be placed behind Cloudflare Access / Zero Trust for IP restrictions and email OTP verification.

## Deployment to Cloudflare Pages
1. In Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git** (or direct upload).
2. Root directory: `admin-portal`
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Custom Domain: Add `admin.mathsrecoding.com`.
6. Add `admin.mathsrecoding.com` to **Firebase Console** -> **Authentication** -> **Settings** -> **Authorized domains**.


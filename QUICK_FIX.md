# Quick Fix for JWT Error

The error you're seeing ("Invalid API key") is actually an authentication error caused by an invalid JWT token.

## Solution

Clear your browser cookies and log in again:

1. Open Developer Tools (press F12 or right-click → Inspect)
2. Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Expand "Cookies" in the left sidebar
4. Click on "http://localhost:5173"
5. Find and delete the cookie named `token`
6. Refresh the page
7. Log in again with Google

## Why this happened

Your browser had an old JWT token from before the JWT_SECRET was changed in your .env file. The server can't verify the old token's signature, so it treats you as unauthenticated (401 Unauthorized).

## Alternative: JavaScript Console

You can also run this in the browser console (F12 → Console tab):

```javascript
document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
location.reload();
```

This will clear the token cookie and reload the page.

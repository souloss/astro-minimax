---
title: "Setup Umami Analytics: Free Vercel Deployment"
pubDatetime: 2026-03-18T00:00:00.000Z
author: Souloss
description: "A step-by-step guide to deploy Umami analytics for free using Vercel + Neon PostgreSQL and integrate with your astro-minimax blog."
tags:
  - docs
  - analytics
  - deployment
  - vercel
  - neon
category: Tutorial/Configuration
featured: false
draft: false
---

[Umami](https://umami.is/) is an open-source, privacy-friendly web analytics tool. Compared to Google Analytics, Umami doesn't use cookies, doesn't track users across sites, and is fully GDPR compliant. This guide will show you how to deploy Umami for free using Vercel + Neon PostgreSQL and integrate it with your astro-minimax blog.

## Why Choose Umami

| Feature          | Umami                | Google Analytics        |
| ---------------- | -------------------- | ----------------------- |
| Privacy-friendly | Fully GDPR compliant | Requires cookie consent |
| Self-hosted      | Supported            | Not supported           |
| Data ownership   | Full control         | Google holds data       |
| Cookie usage     | None                 | Required                |
| Page size impact | Minimal (< 2KB)      | Larger                  |
| Open source      | MIT license          | Closed source           |

## Deployment Options Comparison

| Option                          | Cost | Advantages                               | Disadvantages                     |
| ------------------------------- | ---- | ---------------------------------------- | --------------------------------- |
| **Vercel + Neon (Recommended)** | Free | Zero ops, one-click deploy, auto updates | Vercel free tier limits           |
| Self-hosted Docker              | Free | Full control, unlimited                  | Requires server, self-maintenance |
| Umami Cloud                     | Paid | No ops, auto updates                     | From $9/month                     |

**Recommended: Vercel + Neon** - Completely free, no server needed, simple deployment, suitable for personal blogs and small websites.

---

## Option A: Vercel + Neon Deployment (Recommended)

Host Umami on Vercel with Neon PostgreSQL database from Vercel Storage for zero-cost deployment.

### Prerequisites

- GitHub account
- Vercel account (login with GitHub)
- Neon account (auto-linked via Vercel Storage)

### Step 1: Fork Umami Repository

1. Visit [Umami GitHub Repository](https://github.com/umami-software/umami)
2. Click **Fork** button in the top right to fork the repository to your account

### Step 2: Deploy Umami on Vercel

1. Login to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select your forked `umami` repository
4. Configure the project:
   - **Framework Preset**: Select `Next.js`
   - **Environment Variables**: Skip for now, configure later
5. Click **Deploy** to start deployment

> First deployment may fail (missing database connection). This is normal - redeploy after configuring the database in the next step.

### Step 3: Create Neon PostgreSQL Database

1. In Vercel Dashboard, go to your Umami project
2. Click **Storage** tab at the top
3. Click **Create Database**
4. Select **Neon PostgreSQL** as database type
5. Login to Neon account to authorize (if not linked)
6. Configure the database:
   - **Project Name**: e.g., `umami-analytics`
   - **Database Name**: Recommended `umami`
   - **Region**: Choose closest to your users
7. Click **Create** to create the database

Once created, Vercel will automatically inject the `DATABASE_URL` environment variable into the project.

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Select the latest deployment
3. Click **Redeploy** to redeploy
4. Wait for deployment to complete (~1-2 minutes)

> `DATABASE_URL` is the only required environment variable. `APP_SECRET` (for session encryption) is now optional - Umami will auto-generate it.

### Step 5: Initialize Umami

1. After successful deployment, click **Visit** to access your Umami instance
2. First login with default credentials:
   - Username: `admin`
   - Password: `umami`
3. **Change default password immediately**: Click avatar in top right → **Profile** → **Change Password**

### Step 6: Bind Custom Domain (Optional)

1. Project → **Settings** → **Domains**
2. Enter your domain, e.g., `umami.yourdomain.com`
3. Add CNAME record in your DNS pointing to `cname.vercel-dns.com`
4. Wait for DNS propagation

---

## Option B: Self-Hosted Docker Deployment

If you have server resources and want full control over data, use Docker for self-hosted deployment.

### Quick Deploy

Create `docker-compose.yml` file:

```yaml file=docker-compose.yml
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://umami:umami@db:5432/umami
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    container_name: umami-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami
    volumes:
      - umami-db-data:/var/lib/postgresql/data

volumes:
  umami-db-data:
```

> `DATABASE_URL` is the only required environment variable. `APP_SECRET` (for session encryption) is optional - Umami will auto-generate it.

Start the service:

```bash
docker compose up -d
```

Service will start at `http://localhost:3001`. Default admin credentials:

- Username: `admin`
- Password: `umami`

> Change default password immediately after first login.

### Production Configuration

#### Reverse Proxy Configuration

Recommended to use Nginx or Caddy as reverse proxy with HTTPS:

**Nginx Example:**

```nginx
server {
    listen 443 ssl http2;
    server_name umami.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy Example (Simpler):**

```caddyfile
umami.your-domain.com {
    reverse_proxy localhost:3001
}
```

Caddy automatically requests and renews HTTPS certificates.

#### Environment Variables

| Variable                | Required | Description                                  |
| ----------------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string                 |
| `APP_SECRET`            | No       | Session encryption, auto-generated           |
| `TRACKER_SCRIPT_NAME`   | No       | Tracker script filename, default `script.js` |
| `DISABLE_TELEMETRY`     | No       | Disable telemetry, set to `1`                |
| `REMOVE_TRAILING_SLASH` | No       | Remove trailing slash from URLs, set to `1`  |

#### PostgreSQL Optimization

For production, adjust PostgreSQL configuration:

```yaml
db:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: umami
    POSTGRES_USER: umami
    POSTGRES_PASSWORD: your-secure-password-here
  volumes:
    - umami-db-data:/var/lib/postgresql/data
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### Data Backup

Backup PostgreSQL data regularly:

```bash
# Backup
docker exec umami-db pg_dump -U umami umami > umami_backup_$(date +%Y%m%d).sql

# Restore
cat umami_backup_20260318.sql | docker exec -i umami-db psql -U umami umami
```

---

## Option C: Umami Cloud

If you don't want to manage operations, use [Umami Cloud](https://umami.is/pricing) hosted service.

### Pricing

| Plan       | Monthly | Websites  | Pageviews     |
| ---------- | ------- | --------- | ------------- |
| Pro        | $9      | 10        | 100,000/month |
| Business   | $19     | 25        | 500,000/month |
| Enterprise | Custom  | Unlimited | Custom        |

### Usage Steps

1. Register for [Umami Cloud account](https://cloud.umami.is/)
2. Login and go to Dashboard
3. Click **Add website** to add your website
4. Get `websiteId` and script URL

---

## Get Website ID

Regardless of which option you use, you need to get the `websiteId` for blog integration.

### Steps

1. Login to Umami dashboard
2. Click **Settings** → **Websites** in top right
3. Click **Add website** to add your site:
   - **Name**: Your blog name
   - **Domain**: Your blog domain (e.g., `blog.example.com`)
4. After adding, click the website name to view details
5. In **Tracking code** section you'll see:
   - `data-website-id`: This is your `websiteId`
   - Script URL: e.g., `https://your-umami-instance/script.js`

Example tracking code:

```html
<script async src="https://umami.example.com/script.js" data-website-id="1419a8ae-a14b-4bb7-8c39-ee5fe00a8a88"></script>
```

Extract from the code above:

- `websiteId`: `1419a8ae-a14b-4bb7-8c39-ee5fe00a8a88`
- `src`: `https://umami.example.com/script.js`

---

## Integrate with Blog

Configure Umami in `src/config.ts`:

```js file=src/config.ts
umami: {
  enabled: true,
  websiteId: "1419a8ae-a14b-4bb7-8c39-ee5fe00a8a88",
  src: "https://umami.example.com/script.js",
},
```

| Option      | Description                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `enabled`   | Enable analytics. Script auto-injected when `true`                                                      |
| `websiteId` | Website ID from Umami dashboard                                                                         |
| `src`       | Umami tracker script URL. Use your domain for self-hosted, `https://cloud.umami.is/script.js` for cloud |

After configuration, rebuild and deploy your blog:

```bash
pnpm run build
```

### Verify Integration

After deployment, open browser developer tools:

1. Check **Network** tab for requests to your Umami service
2. Check **Realtime** page in Umami dashboard to confirm visit records

---

## Environment Variables Reference

If you don't want to commit `websiteId` to the repository, use environment variables:

### Method 1: Build-time Environment Variables

Add in your deployment platform's build configuration:

```bash
UMAMI_WEBSITE_ID=your-website-id
UMAMI_SRC=https://umami.example.com/script.js
```

Modify `src/config.ts`:

```js
umami: {
  enabled: true,
  websiteId: import.meta.env.UMAMI_WEBSITE_ID || "your-website-id",
  src: import.meta.env.UMAMI_SRC || "https://umami.example.com/script.js",
},
```

### Method 2: Use `.env` File

Create `.env` file (add to `.gitignore`):

```bash file=.env
UMAMI_WEBSITE_ID=your-website-id
UMAMI_SRC=https://umami.example.com/script.js
```

---

## Privacy Compliance

Umami was designed with privacy compliance in mind:

### GDPR Compliance

- **No Cookies**: Umami doesn't rely on cookies for tracking
- **No Cross-site Tracking**: Data limited to your website
- **Data Minimization**: Only collects necessary statistics
- **Data Ownership**: With self-hosting, you own all data

### Privacy Policy Suggestion

Declare Umami usage in your privacy policy:

> This website uses Umami for analytics. Umami does not use cookies, does not track personal information, and all data is used solely to improve website experience.

### User Opt-out

Umami supports user opt-out from tracking. Add an opt-out link:

```html
<a href="#" data-umami-track="false">Opt out of tracking</a>
```

Or via JavaScript:

```js
window.umami.trackView = false;
```

---

## Troubleshooting

### Statistics Not Displaying

1. **Check script loading**: In browser developer tools Network tab, confirm `script.js` loads successfully
2. **Check domain configuration**: Ensure domain in Umami matches actual blog domain
3. **Check CSP policy**: If using Content Security Policy, allow Umami script domain

### Vercel Deployment Failed

1. **Check environment variables**: Confirm `DATABASE_URL` and `APP_SECRET` are correctly configured
2. **Check database status**: In Vercel Storage, confirm Neon database is created
3. **View build logs**: Check Deployments page for detailed error messages

### Neon Database Connection Issues

1. **Database suspended**: Neon free tier suspends after idle, first access needs wake-up (~5-10 seconds)
2. **SSL connection**: Neon requires SSL, ensure connection string includes `?sslmode=require`
3. **Connection timeout**: Check region settings, choose closest region for lower latency

### Docker Self-hosted Won't Start

1. **Check database connection**: Ensure PostgreSQL container is running
2. **Check logs**: Run `docker logs umami` to view error messages
3. **Check port**: Ensure port 3001 is not occupied

### CORS Issues

If Umami and blog are on different domains, configure CORS:

**Vercel deployment**: Add environment variable:

```
CORS_ALLOWED_ORIGINS=https://your-blog-domain.com
```

**Docker deployment**: Add to `docker-compose.yml`:

```yaml
environment:
  # ... other config
  CORS_ALLOWED_ORIGINS: https://your-blog-domain.com
```

### Inaccurate Statistics

Umami uses fingerprinting to identify users. These situations may cause statistical bias:

- Users disable JavaScript
- Users use privacy browsers (e.g., Tor)
- Users use ad blockers

---

## Next Steps

After configuring Umami:

- [Configure Waline Comment System](/en/posts/how-to-configure-astro-minimax-theme/#configure-waline-comments) - Add article interaction
- [Configure AI Chat Assistant](/en/posts/how-to-configure-astro-minimax-theme/#configure-ai-chat) - Enhance user experience
- [Deploy Blog to Cloudflare Pages](/en/posts/deployment-guide/) - Enjoy global CDN acceleration

For more Umami features, refer to [Umami Documentation](https://umami.is/docs).

# Deployment Guide

This guide covers deploying the Tempo Tiny Faucet to various platforms.

## 🚫 Why Not Vercel?

Vercel is **not recommended** because:
- Serverless functions are stateless and short-lived
- No built-in Redis (requires external service)
- 10s timeout on free tier, 60s on Pro (blockchain transactions can be slow)
- Cold starts make the service unreliable
- Need persistent wallet connection

## ✅ Recommended Platforms

### Option 1: Railway (Easiest)

**Pros**: Built-in Redis, simple setup, GitHub auto-deploy
**Cost**: ~$5-10/month

#### Steps:

1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add Redis service:
   - Click "New" → "Database" → "Add Redis"
6. Add environment variables:
   - `SERVICE_WALLET_PRIVATE_KEY` (your private key)
   - `REDIS_HOST` (reference from Redis service)
   - All other vars from `.env.example`
7. Deploy!

Railway will automatically:
- Install dependencies
- Build TypeScript
- Start the service
- Provide a public URL

---

### Option 2: Render

**Pros**: Free tier available, managed Redis
**Cost**: Free tier or $7/month for starter

#### Steps:

1. Push code to GitHub
2. Go to [Render.com](https://render.com)
3. Click "New" → "Blueprint"
4. Connect your repository
5. Render will detect `render.yaml` and provision:
   - Web service
   - Redis instance
6. Add your `SERVICE_WALLET_PRIVATE_KEY` in dashboard
7. Deploy!

The `render.yaml` file is already configured in this repo.

---

### Option 3: Fly.io

**Pros**: Great Docker support, global edge deployment
**Cost**: Free tier available

#### Steps:

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login:
```bash
flyctl auth login
```

3. Create Upstash Redis (free tier):
```bash
# Go to https://upstash.com and create a Redis instance
# Get the connection details
```

4. Create app:
```bash
cd tempo-tiny-faucet
flyctl launch
# Say NO to launching now
```

5. Set secrets:
```bash
flyctl secrets set SERVICE_WALLET_PRIVATE_KEY=your_key_here
flyctl secrets set REDIS_HOST=your-redis.upstash.io
flyctl secrets set REDIS_PORT=6379
flyctl secrets set REDIS_PASSWORD=your_redis_password
```

6. Deploy:
```bash
flyctl deploy
```

7. Check status:
```bash
flyctl status
flyctl logs
```

---

### Option 4: DigitalOcean App Platform

**Pros**: Simple, reliable
**Cost**: ~$12/month (includes Redis)

#### Steps:

1. Push code to GitHub
2. Go to DigitalOcean → Apps → Create App
3. Connect GitHub repository
4. Add Redis dev database
5. Configure environment variables
6. Deploy

---

### Option 5: Docker on VPS (Advanced)

**Pros**: Full control, cheapest long-term
**Cost**: $5-10/month (VPS)

#### Steps:

1. Get a VPS (DigitalOcean, Linode, AWS EC2, etc.)

2. SSH into server:
```bash
ssh root@your-server-ip
```

3. Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

4. Install Docker Compose:
```bash
apt-get update
apt-get install docker-compose-plugin
```

5. Clone your repo:
```bash
git clone https://github.com/yourusername/tempo-tiny-faucet.git
cd tempo-tiny-faucet
```

6. Create `.env` file:
```bash
nano .env
# Add your environment variables
```

7. Start with Docker Compose:
```bash
docker compose up -d
```

8. Check logs:
```bash
docker compose logs -f
```

9. Set up reverse proxy (optional but recommended):
```bash
# Install Caddy for automatic HTTPS
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy

# Create Caddyfile
nano /etc/caddy/Caddyfile
```

Add to Caddyfile:
```
faucet.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Restart Caddy:
```bash
systemctl reload caddy
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Use environment variables for all secrets (never commit `.env`)
- [ ] Enable HTTPS (most platforms do this automatically)
- [ ] Set `NODE_ENV=production`
- [ ] Review rate limiting settings
- [ ] Set up monitoring/alerting
- [ ] Consider adding API key authentication for public deployments
- [ ] Add CAPTCHA for public endpoints (optional)
- [ ] Set up log aggregation (Datadog, Logtail, etc.)
- [ ] Configure firewall rules if using VPS
- [ ] Regularly rotate service wallet if needed

## 📊 Monitoring

Add health check monitoring with services like:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Better Uptime](https://betteruptime.com)
- [Pingdom](https://www.pingdom.com)

Monitor this endpoint:
```
GET https://your-domain.com/api/health
```

## 🔄 CI/CD

Most platforms support auto-deploy from GitHub:

1. Push to `main` branch
2. Platform detects changes
3. Automatic build and deploy

For manual control, use GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: tempo-tiny-faucet
```

## 💰 Cost Comparison

| Platform | Free Tier | Paid Tier | Notes |
|----------|-----------|-----------|-------|
| Railway | No | ~$5-10/mo | Easiest setup |
| Render | Yes (limited) | $7/mo | Good free tier |
| Fly.io | Yes (limited) | $5-10/mo | Global edge |
| DigitalOcean | No | $12/mo | Includes Redis |
| VPS (DIY) | No | $5-10/mo | Most control |

## 🎯 Recommendation

**For quick demo**: Use **Render** (free tier)
**For production**: Use **Railway** or **Fly.io** (most reliable)
**For learning**: Deploy to **VPS with Docker** (best understanding)

## 📞 Support

If you encounter deployment issues:
1. Check platform-specific docs
2. Review logs: `docker compose logs` or platform dashboard
3. Verify environment variables are set correctly
4. Test locally first with `npm run dev`
5. Open an issue on GitHub

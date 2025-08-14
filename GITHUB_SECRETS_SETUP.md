# GitHub Secrets Setup Guide for Render Deployment

This guide explains how to configure GitHub secrets for automated deployment to Render.com.

## Required GitHub Secrets

For the GitHub Actions workflow to deploy to Render automatically, you need to configure these secrets:

### 1. RENDER_API_KEY
- **Description**: Your Render.com API key for authentication
- **How to get it**:
  1. Go to [Render Dashboard](https://dashboard.render.com)
  2. Navigate to "Account Settings" → "API Keys"
  3. Click "Create API Key"
  4. Copy the generated key

### 2. RENDER_SERVICE_ID
- **Description**: The service ID of your deployed web service
- **How to get it**:
  1. Deploy your service to Render first (manually or via render.yaml)
  2. Go to your service dashboard
  3. The service ID is in the URL: `https://dashboard.render.com/web/srv-XXXXXXXXXX`
  4. Copy the `srv-XXXXXXXXXX` part

## Setting Up GitHub Secrets

1. **Go to your GitHub repository**
2. **Navigate to Settings** → **Secrets and variables** → **Actions**
3. **Click "New repository secret"**
4. **Add each secret**:
   - Name: `RENDER_API_KEY`, Value: [your API key]
   - Name: `RENDER_SERVICE_ID`, Value: [your service ID]

## Alternative: One-Click Deploy (No Secrets Required)

If you prefer not to set up GitHub secrets, you can use Render's blueprint feature:

1. **Fork this repository** to your GitHub account
2. **Go to Render Dashboard** → **New** → **Blueprint**
3. **Connect your GitHub repository**
4. **Render auto-detects** `render.yaml` and deploys everything
5. **Auto-deploy is enabled** - pushes to main/master trigger deployments

## GitHub Actions Workflow

The workflow (`.github/workflows/deploy.yml`) performs:

1. **On Pull Request**: Runs tests and builds (no deployment)
2. **On Push to main/master**: Runs tests, builds, and deploys to Render

### Workflow Steps:
- ✅ Checkout code
- ✅ Setup Node.js 20
- ✅ Install dependencies
- ✅ TypeScript type checking
- ✅ Build application
- ✅ Deploy to Render (main/master only)

## Manual Deployment Option

If you prefer manual control over deployments:

1. **Remove the deploy job** from `.github/workflows/deploy.yml`
2. **Keep only the test job** for CI validation
3. **Deploy manually** through Render dashboard

## Troubleshooting

### Common Issues:

**"Invalid API key"**
- Verify your `RENDER_API_KEY` is correct
- Check the API key hasn't expired
- Ensure the key has necessary permissions

**"Service not found"**
- Verify your `RENDER_SERVICE_ID` is correct
- Ensure the service exists in your Render account
- Check you have access permissions to the service

**Build failures**
- Check build logs in GitHub Actions
- Verify TypeScript compiles without errors
- Ensure all dependencies are in `package.json`

### Getting Help:
- Check GitHub Actions logs for detailed error messages
- Review Render deployment logs in the dashboard
- Use health check endpoints to verify deployment status
- Visit [Render Documentation](https://render.com/docs) for platform help

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Use GitHub secrets** for sensitive configuration
3. **Regularly rotate API keys** for security
4. **Monitor deployment logs** for unauthorized access
5. **Use branch protection rules** to prevent direct pushes to main

## Cost Considerations

### Free Tier:
- **GitHub Actions**: 2,000 minutes/month free
- **Render Web Service**: 750 hours/month free (sleeps after 15 min)
- **Render PostgreSQL**: Free for 90 days, then $7/month

### Paid Tier Benefits:
- **No sleep/downtime** for web services
- **Faster build times** and more concurrent builds
- **Priority support** and SLA guarantees

---

This setup provides a complete CI/CD pipeline with automatic deployments to Render.com whenever you push code to your main branch.
# Exporting to GitHub (manus-cj)

This guide explains how to export the Hunter Agent Platform code to GitHub using the Manus Management UI.

## Step-by-Step Instructions

### 1. Open the Management UI

In the Manus project interface, click the **Management UI** button (usually in the top-right corner or accessible via the project card).

### 2. Navigate to Settings

In the Management UI left sidebar, click **Settings** → **GitHub**

### 3. Configure GitHub Export

You should see a GitHub export panel with the following options:

- **Repository Owner**: Your GitHub username or organization name
- **Repository Name**: `manus-cj` (as specified)
- **Repository Type**: Select "Private" to keep it private
- **Branch**: `main` (default)

### 4. Authenticate with GitHub

If you haven't already authenticated:
1. Click the "Connect GitHub" or "Authenticate" button
2. You'll be redirected to GitHub to authorize the Manus app
3. Approve the permissions (code read/write access)
4. You'll be redirected back to the Management UI

### 5. Export the Code

1. Click the **Export to GitHub** button
2. Confirm the export settings:
   - Owner: `cjaingithub` (your GitHub username)
   - Repository: `manus-cj`
   - Branch: `main`
3. Click **Export**

The system will:
- Create a new GitHub repository (if it doesn't exist)
- Push all project files to the repository
- Create an initial commit with the project code
- Set up the remote for future syncs

### 6. Verify the Export

After export completes:

1. Visit https://github.com/cjaingithub/manus-cj
2. Verify all files are present:
   - `README.md` - Project documentation
   - `ARCHITECTURE.md` - Architecture guide
   - `client/` - Frontend code
   - `server/` - Backend code
   - `drizzle/` - Database schema
   - `package.json` - Dependencies
   - `.gitignore` - Git configuration

3. Check the commit history to see the exported code

## Automatic Syncing (Optional)

After the initial export, you can set up automatic syncing:

1. In the Management UI, enable "Auto-sync to GitHub"
2. Select sync frequency (on every checkpoint, daily, etc.)
3. The system will automatically push changes to GitHub

## Subsequent Checkpoints

After the initial GitHub export, each time you save a checkpoint in Manus:

1. The code is automatically synced to GitHub
2. A new commit is created with the checkpoint message
3. You can view the commit history on GitHub

## Troubleshooting

### Repository Already Exists

If you get an error that the repository already exists:
1. Go to https://github.com/cjaingithub/manus-cj
2. Delete the repository (Settings → Danger Zone)
3. Return to Manus and retry the export

### Authentication Issues

If authentication fails:
1. Go to GitHub Settings → Applications → Authorized OAuth Apps
2. Find "Manus" and click "Revoke"
3. Return to Manus and click "Connect GitHub" again
4. Re-authorize the application

### Permission Denied

If you get a permission error:
1. Verify you have write access to the repository
2. Check that your GitHub token hasn't expired
3. Try re-authenticating with GitHub

## Manual Git Operations (Advanced)

If you prefer to manage the GitHub repository manually:

```bash
# Clone the exported repository
git clone https://github.com/cjaingithub/manus-cj.git
cd manus-cj

# Make changes locally
git add .
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main
```

## Next Steps

After exporting to GitHub:

1. **Set up CI/CD**: Add GitHub Actions for automated testing and deployment
2. **Add collaborators**: Invite team members to the repository
3. **Configure branch protection**: Require reviews before merging to main
4. **Set up issue tracking**: Use GitHub Issues for bug reports and feature requests
5. **Create documentation**: Add additional guides in the wiki

## GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm check
      - run: pnpm test
```

## Questions?

For more information:
- Check the [README.md](./README.md) for project overview
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Visit the [Manus documentation](https://docs.manus.im)

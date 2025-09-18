<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Instructions for Warp AI: Set Up Permanent Preview Link in Vercel

**Objective:**
Configure a permanent, fixed URL in Vercel that always points to the latest deployment of the accounting app from a specific Git branch. This allows the project owner to test progress without changing links. Use the `develop` branch for ongoing work (or adjust as needed). Ensure integration with GitHub and Vercel for automatic updates on commits.

**Prerequisites:**

- The project is already set up with Vercel deployment from GitHub.
- You have access to the GitHub repo and Vercel dashboard credentials.
- Local development is done via Warp AI, with commits pushed to GitHub.

**Step-by-Step Implementation Plan:**

1. **Verify GitHub-Vercel Integration:**
    - In the Vercel dashboard, go to the project settings.
    - Confirm the GitHub repo is linked. If not, connect it under Settings > Git.
    - Set the production branch to `main` (for final releases) and ensure preview branches are enabled.
2. **Create or Select a Dedicated Branch:**
    - In GitHub, create a new branch named `develop` if it doesn't exist:

```bash  
git checkout -b develop  
git push origin develop  
```

    - This branch will hold all ongoing work. Merge changes from local Warp AI sessions into this branch before pushing.
3. **Configure Branch-Specific Deployment in Vercel:**
    - In Vercel dashboard > Project > Settings > Git, ensure "Preview Deployments" are enabled for all branches.
    - Push an initial commit to the `develop` branch to trigger the first deployment.
    - Locate the branch URL in Deployments tab: It will be in the format `<project-name>-git-develop-<username>.vercel.app`.
    - Test the URL to confirm it loads the latest app version.
4. **Automate Updates to the Permanent Link:**
    - For every local change via Warp AI:
        - Commit and push to the `develop` branch.
        - Vercel will auto-deploy the latest commit, updating the branch URL to reflect it.
    - If a deploy fails, use Vercel CLI to redeploy:

```bash  
vercel redeploy --prod=false  
```

5. **Optional: Set Up Custom Domain for Cleaner Link:**
    - If a custom domain is available (e.g., `preview.accountingapp.com`), add it in Vercel:
        - Go to Settings > Domains.
        - Add the domain and assign it to the `develop` branch via the "Git Branch" option.
        - Update DNS records (CNAME to `cname.vercel-dns.com`).
    - Push a commit to verify the custom URL updates automatically.
6. **Testing and Security:**
    - Share the fixed URL (branch or custom) with the owner for testing.
    - Enable Deployment Protection in Vercel (Settings > Deployment Protection) for password access if needed.
    - Monitor deployments in Vercel dashboard for errors.

**Expected Output:**

- Provide the permanent URL (e.g., `accounting-app-git-develop-yourusername.vercel.app`).
- Confirm it updates on new commits without manual intervention.

**Notes for Warp AI:**

- Implement this non-destructively in the existing project.
- If issues arise (e.g., auth errors), prompt for credentials.
- After setup, generate a test commit to verify the link works.
<span style="display:none">[^1][^10][^2][^3][^4][^5][^6][^7][^8][^9]</span>

<div style="text-align: center">⁂</div>

[^1]: https://vercel.com/docs/ai-sdk

[^2]: https://vercel.com/docs/integrations

[^3]: https://ai-sdk.dev/docs/introduction

[^4]: https://vercel.com/docs/ai/openai

[^5]: https://apipie.ai/docs/Integrations/Agent-Frameworks/Vercel-AI

[^6]: https://ai-sdk.dev/docs/advanced/vercel-deployment-guide

[^7]: https://docs.browserless.io/ai-integrations/vercel-ai-sdk

[^8]: https://dev.to/richardshaju/how-warp-ai-terminal-became-an-essential-part-of-my-developer-workflow-4hj1

[^9]: https://vercel.com/docs

[^10]: https://mastra.ai/docs/frameworks/agentic-uis/ai-sdk


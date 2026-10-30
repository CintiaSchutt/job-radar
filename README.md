# Job Radar

A daily job-search helper. Every morning it collects new postings from job boards, keeps the ones
that match your profile, and opens a GitHub Issue for each, so you get them as notifications. You
choose which ones to apply for. If you use Claude Code, a `/tailor` command drafts the application
from your own résumé.

It never applies for you, and it never scrapes sites that forbid it (LinkedIn, Indeed, Glassdoor).

## What you need

| | Needed? | Cost |
| --- | --- | --- |
| A GitHub account | Yes | Free |
| An Adzuna API key (broad job search) | Recommended | Free |
| A Claude plan with Claude Code (for `/tailor` and the weekly routine) | Optional | Your existing plan |
| A Claude API key | **No** | – |

The daily run uses GitHub Actions' free minutes (a run takes 1–2 minutes) and free job APIs, so it
costs nothing. The filter is plain keyword rules; no AI runs in the daily job.

## Set up your copy (about 30 minutes)

1. **Make your own private copy.** On this repo's GitHub page, click **Use this template → Create a
   new repository**. Choose **Private**: your copy will hold your profile and your job list.

2. **Write your profile.** In your new repo, copy `config/profile.example.yml` to
   `config/profile.yml` and edit it. You can do this on github.com: open the example, copy its text,
   then **Add file → Create new file**, name it `config/profile.yml`, paste and edit.
   - `summary`: 3–5 true lines about you.
   - `locations`: where you can work.
   - `sources`: Adzuna search words and the companies you want to watch (the file explains how to
     find a company's board name).
   - `keywords`: the job titles and words for your field. The example is for identity and access
     management (IAM). For another field, replace the lists with your field's titles, tools and terms.

3. **Get a free Adzuna key** at [developer.adzuna.com](https://developer.adzuna.com) (sign up, then
   copy the *Application ID* and *Application Key*). Skip this step to use only company boards and
   Remotive; delete the `adzuna:` block from your profile in that case.

4. **Add the key as secrets.** In your repo: **Settings → Secrets and variables → Actions → New
   repository secret**. Add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`. Secrets are encrypted and never
   appear in logs or files.

5. **Try a dry run.** Go to **Actions → Daily job radar → Run workflow**, tick *Dry run*, and run it.
   Open the run's log to see what it found and what it dropped, and why. Adjust your keywords if needed.

6. **Do a real run.** Run the workflow again without *Dry run*. Matches appear under **Issues**. From
   now on it runs by itself every morning.

7. **Get notified.** On your repo page, click **Watch → All activity**. With the GitHub mobile app,
   new jobs reach your phone.

8. **Optional: a tracker board.** Go to **Projects → New project → Board**, link it to your repo,
   and name the columns *New, Interested, Applied, Interview, Closed*. In the project's **Workflows**,
   turn on *Auto-add to project* with the filter `is:issue label:job`, so new jobs land in *New*.

## Every day

- Read the new Issues. Each one shows the score, why it matched, anything to check, and the link.
- Not interested? **Close** the Issue. Interested? Move it on your board, or add a comment.
- Jobs you've already seen never come back. Up to `max_per_day` new ones arrive each morning, best
  first; extra matches wait for the next day.

## Tune your results

Run a dry run (step 5) after each change; the log lists dropped jobs with the reason.

| You see | Change in `config/profile.yml` |
| --- | --- |
| Too many unrelated jobs | Raise `keep_at`, or add words to `exclude_titles` |
| Good jobs missing | Lower `keep_at`, or add their title words to a tier |
| A company you like is missing | Add its board name under `sources` |
| Jobs in places you can't work | Check `preferred` and `remote_ok` |

**How the score works:** points for the title (tier 1 = core roles, tier 2 = related roles, tier 3 =
broader roles), plus points for each product and concept found in the description, plus points for
the location. A job is kept when it reaches `keep_at` *and* is about your field (a matching title, or
at least 3 field words in the description).

## Prepare an application with `/tailor` (optional, Claude Code)

1. Clone your repo to your computer and open it in Claude Code.
2. Put your master résumé in `resume/`, for example `resume/resume.md`. That folder is ignored by
   Git, so the résumé never leaves your computer.
3. Type `/tailor 12` (the Issue number). Claude reads the job and your résumé, and writes a draft to
   `applications/…/draft.md`: résumé bullets, a cover letter and interview prep. It uses only your
   real experience and names the gaps.
4. Review and edit the draft, then apply yourself.

## Weekly company suggestions (optional, Claude Code)

A weekly Claude routine can suggest companies you're not watching yet. See
[docs/weekly-routine.md](docs/weekly-routine.md).

## Run it on your computer (optional)

Needs Node.js 22.9 or newer.

```bash
npm install
cp config/profile.example.yml config/profile.yml   # then edit it
cp .env.example .env                               # then add your Adzuna key
npm run dry-run     # prints matches; opens no Issues
npm run check       # type-check and tests
```

## How it works

```
config/profile.example.yml   the settings template (your copy: config/profile.yml)
src/sources/                 one file per job source, all returning the same Job shape
src/filter.ts                the scoring rules (tested in src/filter.test.ts)
src/publish.ts               opens the GitHub Issues
src/seen.ts                  remembers jobs already looked at (data/seen.json)
src/main.ts                  runs the steps in order
.github/workflows/daily.yml  the daily schedule
.claude/skills/tailor/       the /tailor command
```

## Privacy and security

- Your copy is private. The template holds no personal data.
- Keys live in GitHub secrets, never in files.
- The workflow can only save `data/seen.json` and open Issues in your repo.
- Your résumé and application drafts stay on your computer (`resume/` and `applications/` are ignored by Git).
- Actions are pinned to exact versions, and Dependabot proposes updates monthly.

## Updates

When the template improves, copy the changed files (usually under `src/`) into your repo. Your
`config/profile.yml` and `data/seen.json` are yours and never need replacing.

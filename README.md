# Job Radar

A daily job-search helper. Every morning it collects new postings from job boards, keeps the ones
that match your profile, and opens a GitHub Issue for each (or adds a row to your Notion job
tracker), so you get them as notifications. You
choose which ones to apply for. If you use Claude Code, a `/tailor` command drafts the application
from your own résumé.

It never applies for you, and it never scrapes sites that forbid it (LinkedIn, Indeed, Glassdoor).

## What you need

| | Needed? | Cost |
| --- | --- | --- |
| A GitHub account | Yes | Free |
| A Notion job tracker (to receive jobs there) | Optional | Free |
| A Claude plan with Claude Code (for `/tailor` and the weekly routine) | Optional | Your existing plan |
| A Claude API key | **No** | – |

The daily run costs nothing: it uses GitHub Actions' free minutes (a run takes 1–2 minutes) and free
sources that need no key: company job boards (Greenhouse, Lever, Ashby) and remote job boards
(Remotive, Jobicy). The filter is plain keyword rules; no AI runs in the daily job.

## Set up your copy (about 30 minutes)

1. **Make your own private copy.** On this repo's GitHub page, click **Use this template → Create a
   new repository**. Choose **Private**: your copy will hold your profile and your job list.

2. **Write your profile.** In your new repo, copy `config/profile.example.yml` to
   `config/profile.yml` and edit it. You can do this on github.com: open the example, copy its text,
   then **Add file → Create new file**, name it `config/profile.yml`, paste and edit.
   - `summary`: 3–5 true lines about you.
   - `skills`: skills you really have. Each job then shows which of its keywords you have and
     which are missing.
   - `locations`: where you can work.
   - `sources`: the companies you want to watch (the file explains how to find a company's board
     name). Company boards are the best source: free, exact and up to date.
   - `keywords`: the job titles and words for your field. The example is for identity and access
     management (IAM). For another field, replace the lists with your field's titles, tools and terms.

3. **Set up email alerts on the big job sites.** Job Radar doesn't read LinkedIn, Indeed or Job Bank
   (their terms forbid it), and it can't read employers' Workday career sites. Each of those offers
   free email alerts for a saved search: set one up on each with the same job titles as your
   profile. Together with Job Radar, that covers most openings.

4. **Add your secret** (only if you use Notion). In your repo: **Settings → Secrets and variables →
   Actions → New repository secret**. Add `NOTION_TOKEN` (see "Send jobs to Notion" below). Secrets
   are encrypted and never appear in logs or files.

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

- Read the new Issues (or Notion rows). Each one shows the score, why it matched, anything to check,
  the link and, if you listed `skills`, which of the job's keywords you have and which are missing:

  ```
  Skills match: 3 of 5
  Have: Okta, OAuth 2.0, TypeScript
  Missing: SAML, SCIM
  ```

- Not interested? **Close** the Issue. Interested? Move it on your board, or add a comment.
- Jobs you've already seen never come back. Up to `max_per_day` new ones arrive each morning, best
  first; extra matches wait for the next day.

## Send jobs to Notion (optional)

If you already track applications in a Notion database, Job Radar can add each match there as a
new row, written into your own column names. It checks your columns before writing anything, and it
skips jobs whose link is already in the database (for example, ones you added by hand).

**No tracker yet?** Start from the
[Job Application Tracker template](https://grave-custard-f07.notion.site/Job-Application-Tracker-Template-b8ba9d30f328838e936a818a5ced2005):
open it, click **Duplicate** (top right), and choose your workspace. Notion copies the whole tracker
into your account, and the copy is yours to change. Its columns match the commented example in
`config/profile.example.yml`, so the mapping in step 4 needs few or no changes.

1. **Create an integration:** go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
   (or in Notion, **Settings → Connections → Develop or manage integrations**) and click **New integration**. Make it an *Internal* integration for your workspace and copy
   its secret. (Notion moves these menus now and then; search its help for "internal integration" if
   they look different.)
2. **Give it access to your tracker only:** open the tracker, click **… → Connections**, and add the
   integration. It can't see anything else in your workspace.
3. **Add the secret:** in your repo, add a repository secret named `NOTION_TOKEN` (as in step 4).
4. **Map your columns:** uncomment the `notion:` block under `outputs` in `config/profile.yml`. Put
   in the database link (open the database as a full page and copy the link) and *your* column names.
   Leave out any line your tracker has no column for. Set `github_issues: false` if you only want Notion.
5. **Check it:** run a dry run. When the settings match your database, the log says *"Notion
   settings match the database."* If not, it says exactly which column or option is wrong.

| Setting | Your column must be | Job Radar writes |
| --- | --- | --- |
| `company` | the title column | the company |
| `title` | text | the job title |
| `type` | select | your *remote* or *hybrid* option, when the posting says so |
| `stage` | status | the `stage_for_new` option, e.g. *To review* |
| `posting_url` | URL | the job link |
| `application_url` | URL | the job link, for company job boards (where you apply directly) |
| `score` | number | the score |

The page body gets the same summary as an Issue, plus the start of the description. Option names
are matched ignoring upper/lower case.

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
3. Type `/tailor 12` (the Issue number) or `/tailor <job link>`. Claude reads the job and your
   résumé, and writes a draft to `applications/…/draft.md`: an **ATS keyword check**, résumé bullets,
   a cover letter and interview prep. It uses only your real experience and names the gaps.

**The ATS check:** applicant tracking systems turn your résumé into fields that recruiters search by
keyword. The draft lists the posting's key terms as found or missing in your résumé, suggests using
the posting's exact wording where it's true for you (for example "OpenID Connect (OIDC)"), and flags
formatting that résumé parsers often misread: tables, columns, text in headers, images. It never
suggests adding a skill you don't have.
4. Review and edit the draft, then apply yourself.

## Weekly company suggestions (optional, Claude Code)

A weekly Claude routine can suggest companies you're not watching yet. See
[docs/weekly-routine.md](docs/weekly-routine.md).

## Run it on your computer (optional)

Needs Node.js 22.9 or newer.

```bash
npm install
cp config/profile.example.yml config/profile.yml   # then edit it
cp .env.example .env                               # then add NOTION_TOKEN, if you use Notion
npm run dry-run     # prints matches; opens no Issues
npm run check       # type-check and tests
```

## How it works

```
config/profile.example.yml   the settings template (your copy: config/profile.yml)
src/sources/                 one file per job source, all returning the same Job shape
src/filter.ts                the scoring rules (tested in src/filter.test.ts)
src/publish.ts               opens the GitHub Issues
src/notion.ts                the optional Notion output (tested in src/notion.test.ts)
src/seen.ts                  remembers jobs already looked at (data/seen.json)
src/main.ts                  runs the steps in order
.github/workflows/daily.yml  the daily schedule
.claude/skills/tailor/       the /tailor command
```

## Privacy and security

- Your copy is private. The template holds no personal data.
- Keys live in GitHub secrets, never in files. The Notion integration can only reach the one
  database you connect it to.
- The workflow can only save `data/seen.json` and open Issues in your repo.
- Your résumé and application drafts stay on your computer (`resume/` and `applications/` are ignored by Git).
- Actions are pinned to exact versions, and Dependabot proposes updates monthly.

## Updates

When the template improves, copy the changed files (usually under `src/`) into your repo. Your
`config/profile.yml` and `data/seen.json` are yours and never need replacing.

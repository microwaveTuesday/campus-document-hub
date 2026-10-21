# Week 11: VS Code and GitHub submission

1. Open CampusDocumentHub.code-workspace in VS Code.
2. Stop any previous app terminal with Ctrl+C before rebuilding.
3. In Terminal → New Terminal, run `powershell -ExecutionPolicy Bypass -File .\start.ps1`.
4. Open http://127.0.0.1:5080. Sign in with the classroom account listed in README.md.
5. Upload tests/fixtures/campus-notes.pdf and campus-photo.png. The report updates after a successful upload. Downloads remain available below the dashboard.
6. Demonstrate the four KPI cards and daily chart. Expand exact daily counts and explain the decision supported by the chart. Explain that these are document uploads.
7. Choose an old date range for empty results. Use browser network throttling for loading. For a manual error demo, stop the API and click Update report, then restart the API and Retry report. API outages may report a browser network error.
8. Run `powershell -ExecutionPolicy Bypass -File .\test.ps1` after stopping the normal app if a rebuild encounters a locked executable. This uses a separate store and regenerates test evidence and screenshots.
9. Ask a classmate to complete docs/PEER-REVIEW.md. Record actual observations and a resulting improvement. Do not submit the blank template as completed feedback.

## Git in the VS Code terminal

The folder already has Git history. Review the changes before committing:

```powershell
git status
git diff --check
git diff
git add Api/Program.cs Client/src Client/tests/browser.mjs tests/integration.py README.md SUBMISSION.md docs
git commit -m "Add Week 11 document reporting dashboard"
git remote -v
```

If no GitHub remote exists, create an empty repository in your GitHub account, then use its actual URL:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git branch --show-current
git push -u origin HEAD
```

If origin already exists, verify it points to the intended repository, then run `git push -u origin HEAD`. Resolve any sign-in prompts yourself. This task does not create a remote repository, commit or push for you.

## Submit

Submit the GitHub repository link with the relevant branch/commit, working screen screenshots, API code, docs/METRICS.md and completed peer-review notes. Check the repository is accessible to your instructor. Use docs/screenshots/11-dashboard-ready.png through 15-dashboard-mobile.png as test evidence, or capture your own demonstration. Include the test reports. Old Week 10 zip/bundle files do not contain this Week 11 work; submit the updated repository.

Do not include private storage, uploaded personal documents, session cookies, node_modules or build folders. Keep the existing .gitignore. The lecture and assignment are the requirements; the event examples were adapted to the document data as explained in METRICS.md.

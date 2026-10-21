# Week 10 submission guide

## Included evidence

- Working React + ASP.NET Core Campus Document Hub source and dependency lockfiles.
- `docs/TEST-RESULTS.md`: 34 executed API tests, with expected result, actual result, pass/fail and defect column.
- `docs/BROWSER-RESULTS.md`: browser verification, including PDF download, JPEG acceptance, rejected content, owner authorization and responsive layout.
- `docs/RECOVERY-RESULTS.md`: process restart, metadata persistence and orphan cleanup.
- `docs/DESIGN.md`: storage trade-off and security/reliability explanation.
- `docs/screenshots/01-sign-in.png`: demo-account sign-in screen.
- `docs/screenshots/02-file-selected.png`: filename and size before upload.
- `docs/screenshots/03-upload-success.png`: successful upload, owner and Available status.
- `docs/screenshots/04-rejected-upload.png`: real rejection of plain text disguised as PNG.
- `docs/screenshots/05-mobile.png`: narrow-screen layout.
- `CampusDocumentHub.git.bundle` and `GIT-COMMIT.txt` in the ZIP: portable history and exact commit details. The working folder itself has its normal `.git` directory.

## Demonstration sequence

1. Run `start.ps1` using the README steps. Sign in as alice.
2. Choose a fixture PDF. Point out its filename and size, then upload it.
3. Show its original display name, size, owner and Available status in the document list.
4. Download it. The server checks the signed-in owner before returning bytes.
5. Choose `tests/fixtures/disguised.png`. This is deliberately plain text. Upload it and show the rejection message. Explain that a filename ending in .png is not proof of PNG content; the server attempts identification and decoding. The test record verifies no metadata is added.
6. Explain the cross-owner test: alice uploads, bob requests the exact known file ID, API returns 404. Anonymous download returns 401. These checks are recorded from actual requests, not simulated UI states.
7. Explain the storage trade-off: local disk plus SQLite is simple for one machine; private object storage would offer durability and shared access across servers with more setup.
8. Show `git log -1 --oneline` and the test records. Add your name/section to any instructor-required cover sheet before uploading the ZIP.

## Review the Git evidence

In the working folder use `git log -1 --stat` and `git status --short`. For the extracted ZIP, use `git bundle verify CampusDocumentHub.git.bundle` from a Git repository, or restore a complete review checkout with:

```powershell
git clone CampusDocumentHub.git.bundle ../CampusDocumentHub-review
```

The source ZIP intentionally excludes installed dependencies, build outputs, private data, logs, cookies and the `.git` internal directory. The Git bundle preserves the meaningful commit independently of the ZIP source files. No GitHub upload or classroom submission has been made.

## Week 11 update

Follow [the Week 11 submission guide](docs/WEEK11-SUBMISSION.md) for the current dashboard, Git instructions, screenshots and peer review. The preceding Week 10 instructions describe the earlier upload milestone.

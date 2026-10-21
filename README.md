# Campus Document Hub — Week 10

A small React + ASP.NET Core upload feature for Integrative Programming and Technologies 1. Implements the Week 10 Lab Activity 1; no Week 11 dashboard is included.

## Start in VS Code (Windows)

1. Open `CampusDocumentHub.code-workspace` in VS Code, or choose **File → Open Folder** and select this folder.
2. Open **Terminal → New Terminal**. Prerequisites: .NET 10 SDK and Node.js 22.12+ (tested with Node 24). Both are installed on the development machine.
3. Run `powershell -ExecutionPolicy Bypass -File .\start.ps1`. The execution-policy option applies only to this process. The script installs locked frontend dependencies when needed, builds React, and starts the API on the loopback interface.
4. Open http://127.0.0.1:5080 in a browser. Keep the terminal running. Stop with Ctrl+C.
5. Sign in as **alice / AliceDemo!2026**, or **bob / BobDemo!2026**. These publicly documented classroom accounts are available only in the Development environment. They are not a production identity system.
6. Select `tests/fixtures/campus-notes.pdf` or `campus-photo.png`. The picker shows the original filename and size. Click **Upload document**, then **Download**.
7. Select `tests/fixtures/disguised.png` to demonstrate a rejected upload. It contains plain text rather than PNG bytes. The API returns 400, the interface explains why, and no file record is created.

If PowerShell cannot find .NET or Node after installing them, restart VS Code. If port 5080 is busy, stop the other application or change the URL in start.ps1. For the optional Vite development server, keep the API on 5080 and run `npm run dev` from Client in a second terminal; its API proxy uses that port.

## Project map

- `Client/src/main.jsx`: React sign-in, file picker, filename/size, upload feedback, private library, download.
- `Client/src/style.css`: responsive layout with keyboard focus and accessible status messages.
- `Api/Program.cs`: IFormFile API, cookie authentication, CSRF validation, file validation, storage and owner checks.
- `Api/Api.csproj`: pinned backend package versions.
- `tests/integration.py`: real HTTP tests and synthetic fixtures.
- `Client/tests/browser.mjs`: browser flow, screenshot capture, and responsive checks.
- `docs/TEST-RESULTS.md`: actual recorded HTTP test results.
- `docs/BROWSER-RESULTS.md`: actual browser test results.
- `docs/screenshots/`: evidence from the running application.
- `docs/DESIGN.md`: storage trade-off, security decisions, limits and rubric mapping.
- `test.ps1`: repeatable isolated test run; does not use the normal app's storage.

## API contract

| Route | Behavior |
|---|---|
| GET /api/csrf | Obtain antiforgery cookie and request token |
| GET /api/session | Current username or null |
| POST /api/login | Development demo sign-in; JSON username/password; token required |
| POST /api/logout | End authenticated session; token required |
| GET /api/files | Only authenticated owner's metadata |
| POST /api/files | Exactly one multipart field named `file`; token and authentication required |
| GET /api/files/{id} | Owner-authorized attachment download; 404 for absent or another owner's ID |

Upload returns 201 plus metadata. Validation returns 400, missing login 401, oversized request 413, rate limit 429, and storage failure 503. PDF/PNG/JPEG only; maximum **5,000,000 bytes** (decimal 5 MB). Request cap: 5,200,000 bytes including multipart overhead. Images: maximum 8,000 pixels on either side and 20 megapixels. PDFs: 1–500 parsed pages. The declared MIME type must agree with extension and actual format. SVG, GIF, office documents, executables and multiple-file uploads are outside scope.

## Private data and tests

Normal app data is in `%LOCALAPPDATA%/CampusDocumentHub/private`, outside the code and web root. It persists across restarts and is never bundled in the submission. Windows permissions are restricted to the current Windows identity and SYSTEM; local administrators can still take ownership. Metadata is in SQLite and bytes have generated UUID `.blob` names. Never run two app processes against the same storage folder: startup recovery assumes a single process.

Run `powershell -ExecutionPolicy Bypass -File .\test.ps1` to build, start an isolated test instance, execute the HTTP suite and browser suite, and stop that instance. Python 3 and Microsoft Edge are needed for this test script. Tests use a fresh temporary storage directory for each run and report its location for inspection. The fixtures are synthetic and safe to use in a classroom demonstration. Tests regenerate evidence in docs; commit new evidence after rerunning if you want it in Git.

## What to submit

Use the accompanying `CampusDocumentHub-Week10-Submission.zip`. It contains source, lockfiles, run/test scripts, fixtures, README, design notes, recorded tests, screenshots and a portable Git bundle. Installed packages, build outputs, session cookies and uploaded private documents are excluded. Do not upload your private storage folder. See `SUBMISSION.md` for the demonstration sequence and Git evidence.

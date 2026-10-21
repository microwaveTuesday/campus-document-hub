# Week 10 test record

Executed: 2026-10-21T15:03:20.263454+08:00

Real HTTP integration tests against a dedicated local ASP.NET Core instance. Test fixtures are synthetic; no personal documents are used.

| Case | Expected | Actual | Result | Defect |
|---|---|---|---|---|
| Anonymous upload denied | 401  | 401 | PASS | — |
| Anonymous library denied | 401  | 401 | PASS | — |
| Wrong password rejected | 401  | 401 {"error": "Incorrect username or password."} | PASS | — |
| Alice signs in | 200  | 200 {"username": "alice"} | PASS | — |
| Bob signs in | 200  | 200 {"username": "bob"} | PASS | — |
| Valid PNG accepted | 201  | 201 {"id": "198f2992-c68f-43a9-84ef-8732dca9e667", "owner": "alice", "originalName": "campus-photo.png", "sizeBytes": 73, "contentType": "image/png", "status": "Available", "createdAtUtc": "2026-10-21T07:03:19.2722557+00:00", "sha256": "F6CC9DCA62AF499AEB6210D4D7A3881F3B103FA27CF089D621632791D3ED73CE"} | PASS | — |
| Owner download returns original bytes | 200 identical bytes and attachment | 200 | PASS | — |
| Other owner cannot retrieve known ID | 404  | 404 | PASS | — |
| Anonymous cannot retrieve known ID | 401  | 401 | PASS | — |
| Library contains only owner metadata | 200 empty list | 200 | PASS | — |
| Valid PDF accepted | 201  | 201 {"id": "eaee65f6-5528-4315-9f56-9955b3ddc827", "owner": "alice", "originalName": "campus-notes.pdf", "sizeBytes": 431, "contentType": "application/pdf", "status": "Available", "createdAtUtc": "2026-10-21T07:03:19.6047885+00:00", "sha256": "DE9E3B3ECEA164C90BA5E1F5FE74AF451ABAB19ADDEE9B8540996CC6DCCF9478"} | PASS | — |
| Zero byte PDF rejected | 400  | 400 {"error": "Choose a non-empty file."} | PASS | — |
| Oversized file rejected | 400  | 400 {"error": "File exceeds the 5 MB (5,000,000 byte) limit."} | PASS | — |
| Request body ceiling enforced before reading body | 413  | 413 {"error": "Request exceeds the 5 MB file limit plus form overhead."} | PASS | — |
| Unsupported extension rejected | 400  | 400 {"error": "Unsupported file type. Choose a PDF, PNG, or JPEG."} | PASS | — |
| Double extension rejected | 400  | 400 {"error": "Unsupported file type. Choose a PDF, PNG, or JPEG."} | PASS | — |
| Text disguised as PNG rejected | 400  | 400 {"error": "Image content is invalid or corrupt."} | PASS | — |
| PNG signature with corrupt payload rejected | 400  | 400 {"error": "Image content is invalid or corrupt."} | PASS | — |
| Invalid PDF rejected | 400  | 400 {"error": "File content is invalid, corrupt, encrypted, or does not match the chosen type."} | PASS | — |
| Declared MIME mismatch rejected | 400  | 400 {"error": "The file's declared type does not match its extension."} | PASS | — |
| Extension/content mismatch rejected | 400  | 400 {"error": "Image content does not match its extension."} | PASS | — |
| Extreme image dimensions rejected | 400  | 400 {"error": "Image exceeds the 8,000 pixel / 20 megapixel limit."} | PASS | — |
| Wrong multipart field rejected | 400  | 400 {"error": "Choose a non-empty file."} | PASS | — |
| Duplicate display name uses new ID | 201 new generated ID | 201 {"id": "e608f191-8630-4789-b69f-c7d52e61024e", "owner": "alice", "originalName": "campus-photo.png", "sizeBytes": 73, "contentType": "image/png", "status": "Available", "createdAtUtc": "2026-10-21T07:03:19.8054871+00:00", "sha256": "F6CC9DCA62AF499AEB6210D4D7A3881F3B103FA27CF089D621632791D3ED73CE"} | PASS | — |
| Path in supplied name reduced to basename | 201 display name outside.png | 201 {"id": "8f2947aa-52b2-40b3-bd8f-11d2fb875a32", "owner": "alice", "originalName": "outside.png", "sizeBytes": 73, "contentType": "image/png", "status": "Available", "createdAtUtc": "2026-10-21T07:03:19.8220854+00:00", "sha256": "F6CC9DCA62AF499AEB6210D4D7A3881F3B103FA27CF089D621632791D3ED73CE"} | PASS | — |
| Long filename rejected | 400  | 400 {"error": "Use a filename of 1\u2013180 characters without control characters."} | PASS | — |
| Nonexistent file returns 404 | 404  | 404 | PASS | — |
| Missing CSRF upload token rejected | 400  | 400 {"error": "Session security token expired. Refresh and try again."} | PASS | — |
| Rejected upload leaves metadata unchanged | 200  | 200 | PASS | — |
| Valid PDF exactly at 5 MB accepted | 201  | 201 {"id": "bd1d94ee-6d3c-467b-9450-a6ee7beb7360", "owner": "alice", "originalName": "at-limit.pdf", "sizeBytes": 5000000, "contentType": "application/pdf", "status": "Available", "createdAtUtc": "2026-10-21T07:03:19.9888300+00:00", "sha256": "BD3FDA7F413145C3EE21176790B84BF02C5573F3DDC931C89F1CA4212BAAF912"} | PASS | — |
| Metadata failure returns 503 and cleans bytes | 503 no orphan blob | 503 {"error": "Storage is temporarily unavailable. Please try again."} | PASS | — |
| Anonymous reporting denied | 401  | 401 | PASS | — |
| Other owner report is empty | 200  | 200 {"from": "2026-09-22", "to": "2026-10-21", "timeZone": "UTC", "generatedAtUtc": "2026-10-21T07:03:20.0779908+00:00", "totalDocuments": 0, "pdfDocuments": 0, "imageDocuments": 0, "storedBytes": 0, "uploadsByDay": [{"date": "2026-09-22", "count": 0}, {"date": "2026-09-23", "count": 0}, {"date": "2026-09-24", "count": 0}, {"date": "2026-09-25", "count": 0}, {"date": "2026-09-26", "count": 0}, {"date": "2026-09-27", "count": 0}, {"date": "2026-09-28", "count": 0}, {"date": "2026-09-29", "count": 0}, {"date": "2026-09-30", "count": 0}, {"date": "2026-10-01", "count": 0}, {"date": "2026-10-02", "count": 0}, {"date": "2026-10-03", "count": 0}, {"date": "2026-10-04", "count": 0}, {"date": "2026-10-05", "count": 0}, {"date": "2026-10-06", "count": 0}, {"date": "2026-10-07", "count": 0}, {"date": "2026-10-08", "count": 0}, {"date": "2026-10-09", "count": 0}, {"date": "2026-10-10", "count": 0}, {"date": "2026-10-11", "count": 0}, {"date": "2026-10-12", "count": 0}, {"date": "2026-10-13", "count": 0}, {"date": "2026-10-14", "count": 0}, {"date": "2026-10-15", "count": 0}, {"date": "2026-10-16", "count": 0}, {"date": "2026-10-17", "count": 0}, {"date": "2026-10-18", "count": 0}, {"date": "2026-10-19", "count": 0}, {"date": "2026-10-20", "count": 0}, {"date": "2026-10-21", "count": 0}]} | PASS | — |
| Report aggregates reconcile to owner records | 200  | 200 {"from": "2026-09-22", "to": "2026-10-21", "timeZone": "UTC", "generatedAtUtc": "2026-10-21T07:03:20.0954688+00:00", "totalDocuments": 5, "pdfDocuments": 2, "imageDocuments": 3, "storedBytes": 5000650, "uploadsByDay": [{"date": "2026-09-22", "count": 0}, {"date": "2026-09-23", "count": 0}, {"date": "2026-09-24", "count": 0}, {"date": "2026-09-25", "count": 0}, {"date": "2026-09-26", "count": 0}, {"date": "2026-09-27", "count": 0}, {"date": "2026-09-28", "count": 0}, {"date": "2026-09-29", "count": 0}, {"date": "2026-09-30", "count": 0}, {"date": "2026-10-01", "count": 0}, {"date": "2026-10-02", "count": 0}, {"date": "2026-10-03", "count": 0}, {"date": "2026-10-04", "count": 0}, {"date": "2026-10-05", "count": 0}, {"date": "2026-10-06", "count": 0}, {"date": "2026-10-07", "count": 0}, {"date": "2026-10-08", "count": 0}, {"date": "2026-10-09", "count": 0}, {"date": "2026-10-10", "count": 0}, {"date": "2026-10-11", "count": 0}, {"date": "2026-10-12", "count": 0}, {"date": "2026-10-13", "count": 0}, {"date": "2026-10-14", "count": 0}, {"date": "2026-10-15", "count": 0}, {"date": "2026-10-16", "count": 0}, {"date": "2026-10-17", "count": 0}, {"date": "2026-10-18", "count": 0}, {"date": "2026-10-19", "count": 0}, {"date": "2026-10-20", "count": 0}, {"date": "2026-10-21", "count": 5}]} | PASS | — |
| Inclusive final day includes uploads | 200  | 200 {"from": "2026-10-21", "to": "2026-10-21", "timeZone": "UTC", "generatedAtUtc": "2026-10-21T07:03:20.1261156+00:00", "totalDocuments": 5, "pdfDocuments": 2, "imageDocuments": 3, "storedBytes": 5000650, "uploadsByDay": [{"date": "2026-10-21", "count": 5}]} | PASS | — |
| Empty range returns zero and zero-filled days | 200  | 200 {"from": "2000-01-01", "to": "2000-01-03", "timeZone": "UTC", "generatedAtUtc": "2026-10-21T07:03:20.1410350+00:00", "totalDocuments": 0, "pdfDocuments": 0, "imageDocuments": 0, "storedBytes": 0, "uploadsByDay": [{"date": "2000-01-01", "count": 0}, {"date": "2000-01-02", "count": 0}, {"date": "2000-01-03", "count": 0}]} | PASS | — |
| Invalid reporting range from=oops | 400  | 400 {"error": "Use valid YYYY-MM-DD dates, ordered from oldest to newest, covering at most 366 days."} | PASS | — |
| Invalid reporting range from=2026-02-30 | 400  | 400 {"error": "Use valid YYYY-MM-DD dates, ordered from oldest to newest, covering at most 366 days."} | PASS | — |
| Invalid reporting range from=2026-10-02&to=2026-10-01 | 400  | 400 {"error": "Use valid YYYY-MM-DD dates, ordered from oldest to newest, covering at most 366 days."} | PASS | — |
| Invalid reporting range from=2000-01-01&to=2026-10-01 | 400  | 400 {"error": "Use valid YYYY-MM-DD dates, ordered from oldest to newest, covering at most 366 days."} | PASS | — |
| Invalid reporting range to=9999-12-31 | 400  | 400 {"error": "Use valid YYYY-MM-DD dates, ordered from oldest to newest, covering at most 366 days."} | PASS | — |
| Logout succeeds | 204  | 204 | PASS | — |
| Signed-out retrieval denied | 401  | 401 | PASS | — |
| Private storage has no static route | 404  | 404 | PASS | — |

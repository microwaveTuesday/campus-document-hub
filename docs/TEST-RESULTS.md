# Week 10 test record

Executed: 2026-10-21T12:29:10.952791+08:00

Real HTTP integration tests against a dedicated local ASP.NET Core instance. Test fixtures are synthetic; no personal documents are used.

| Case | Expected | Actual | Result | Defect |
|---|---|---|---|---|
| Anonymous upload denied | 401  | 401 | PASS | — |
| Anonymous library denied | 401  | 401 | PASS | — |
| Wrong password rejected | 401  | 401 {"error": "Incorrect username or password."} | PASS | — |
| Alice signs in | 200  | 200 {"username": "alice"} | PASS | — |
| Bob signs in | 200  | 200 {"username": "bob"} | PASS | — |
| Valid PNG accepted | 201  | 201 {"id": "aa3f368f-e327-413c-8ce2-b9c9c5ece4aa", "owner": "alice", "originalName": "campus-photo.png", "sizeBytes": 73, "contentType": "image/png", "status": "Available", "createdAtUtc": "2026-10-21T04:29:08.0972126+00:00", "sha256": "F6CC9DCA62AF499AEB6210D4D7A3881F3B103FA27CF089D621632791D3ED73CE"} | PASS | — |
| Owner download returns original bytes | 200 identical bytes and attachment | 200 | PASS | — |
| Other owner cannot retrieve known ID | 404  | 404 | PASS | — |
| Anonymous cannot retrieve known ID | 401  | 401 | PASS | — |
| Library contains only owner metadata | 200 empty list | 200 | PASS | — |
| Valid PDF accepted | 201  | 201 {"id": "021aa64d-98b7-40a0-9132-fb2967575e32", "owner": "alice", "originalName": "campus-notes.pdf", "sizeBytes": 431, "contentType": "application/pdf", "status": "Available", "createdAtUtc": "2026-10-21T04:29:09.5761722+00:00", "sha256": "DE9E3B3ECEA164C90BA5E1F5FE74AF451ABAB19ADDEE9B8540996CC6DCCF9478"} | PASS | — |
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
| Duplicate display name uses new ID | 201 new generated ID | 201 {"id": "c2283104-28ba-425e-8500-ad371944131f", "owner": "alice", "originalName": "campus-photo.png", "sizeBytes": 73, "contentType": "image/png", "status": "Available", "createdAtUtc": "2026-10-21T04:29:10.1895414+00:00", "sha256": "F6CC9DCA62AF499AEB6210D4D7A3881F3B103FA27CF089D621632791D3ED73CE"} | PASS | — |
| Path in supplied name reduced to basename | 201 display name outside.png | 201 {"id": "a6a64a42-403d-4593-91a2-bf30bd5297a3", "owner": "alice", "originalName": "outside.png", "sizeBytes": 73, "contentType": "image/png", "status": "Available", "createdAtUtc": "2026-10-21T04:29:10.2332916+00:00", "sha256": "F6CC9DCA62AF499AEB6210D4D7A3881F3B103FA27CF089D621632791D3ED73CE"} | PASS | — |
| Long filename rejected | 400  | 400 {"error": "Use a filename of 1\u2013180 characters without control characters."} | PASS | — |
| Nonexistent file returns 404 | 404  | 404 | PASS | — |
| Missing CSRF upload token rejected | 400  | 400 {"error": "Session security token expired. Refresh and try again."} | PASS | — |
| Rejected upload leaves metadata unchanged | 200  | 200 | PASS | — |
| Valid PDF exactly at 5 MB accepted | 201  | 201 {"id": "3da758a9-23b6-4377-87a5-5beeb54bf971", "owner": "alice", "originalName": "at-limit.pdf", "sizeBytes": 5000000, "contentType": "application/pdf", "status": "Available", "createdAtUtc": "2026-10-21T04:29:10.7555493+00:00", "sha256": "BD3FDA7F413145C3EE21176790B84BF02C5573F3DDC931C89F1CA4212BAAF912"} | PASS | — |
| Metadata failure returns 503 and cleans bytes | 503 no orphan blob | 503 {"error": "Storage is temporarily unavailable. Please try again."} | PASS | — |
| Logout succeeds | 204  | 204 | PASS | — |
| Signed-out retrieval denied | 401  | 401 | PASS | — |
| Private storage has no static route | 404  | 404 | PASS | — |

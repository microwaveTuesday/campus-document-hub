# Week 11 document reporting

## Audience and decision

Students use this report to inspect their own submission volume and file mix. Daily upload counts help identify busy submission periods and plan time to organize documents. The chart measures recorded uploads, not assignment completion or academic performance.

Campus Document Hub has no registrations, check-ins, payments or revenue records. This implementation adapts the lecture's examples to actual document data. No event records or KPI constants were added. Confirm with your instructor if they require the event-specific examples literally.

## Source, scope and formulas

`GET /api/reports/documents?from=YYYY-MM-DD&to=YYYY-MM-DD` requires the existing authenticated cookie. The server takes the owner from the authenticated identity, never from a filter. SQLite groups the owner's Files records by UTC upload date before returning aggregates. The response excludes filenames, owners, document IDs and content.

| Metric | Definition | Unit |
|---|---|---|
| Documents | COUNT of saved Files rows within the selected upload window | documents |
| PDF documents | Count where ContentType is application/pdf | documents |
| Images | Count where ContentType is image/png or image/jpeg | documents |
| Stored bytes | SUM(SizeBytes) of matching uploads | bytes |
| Uploads by day | COUNT grouped by UTC date, with missing days filled with zero | documents/day |

Each upload has a unique ID. Re-uploading identical content counts as another upload. Rejected uploads never create a row and do not count. Stored bytes describe the selected uploads, not all account storage or a disk quota. Records represent accepted uploads; the report does not check blob health on each request. No percentage metric is used, so no denominator is implied.

The default window is the latest 30 UTC calendar days including today. Explicit dates are inclusive in the UI and implemented as `[from 00:00 UTC, day after to 00:00 UTC)` in SQL. Maximum range is 366 days. Invalid dates, reversed ranges and excessive windows return 400. No matches return zero totals and zero-filled days. Requests without a session return 401; storage errors use the existing 503 response.

`generatedAtUtc` is the server's report-generation time, not the last upload time. Reports refresh on sign-in, successful upload, date-filter submission and retry. There is no background polling. Responses use the existing no-store policy.

## Visualization and accessibility

Four cards share one API response with a chronological bar chart. Bars start at zero. The chart includes document units and UTC date labels, plus an expandable table containing every exact daily count. Color is supplementary. Date inputs have labels, controls support keyboard use, and focus is visible. Cards adapt from four columns to two and then one. The chart scrolls inside its own region on narrow screens.

Loading replaces stale data with a status message. Errors expose a retry control. Empty results explain the active range. Ready results show the metrics, chart, date range and generation timestamp. Expired sessions return the user to sign-in.

## Evidence

Run `powershell -ExecutionPolicy Bypass -File .\test.ps1` from the repository root. The suite starts isolated temporary storage and preserves normal app documents. HTTP tests reconcile report totals with owner metadata, test date boundaries, empty results, validation and owner isolation. Browser checks exercise real uploads/downloads, report rendering, empty filters, mobile overflow, and loading/error/retry using a controlled intercepted response. Interception only exists in the browser test, not the application or API.

See TEST-RESULTS.md, BROWSER-RESULTS.md and screenshots/11-dashboard-ready.png through 15-dashboard-mobile.png. Screenshots use synthetic upload fixtures. They do not represent real student activity.

# Week 10 design and storage explanation

## Assignment coverage

| Requirement | Implementation / evidence |
|---|---|
| React picks one PDF/image and shows filename/size | Single file input; selected-file status with human-readable size and byte count |
| ASP.NET Core IFormFile, nonempty and max-size validation | POST /api/files; 5,000,000-byte application limit plus 5,200,000-byte request ceiling |
| Generated filename in restricted private storage | UUID .blob filename; LocalApplicationData folder outside app tree; restricted Windows ACL |
| Owner, original display name, size, status | SQLite Files table; owner from signed authentication claim; Available only after successful validation/storage |
| Authorize retrieval | Cookie authentication plus SQL WHERE Id=$id AND Owner=$owner; unknown/non-owner gets 404 |
| Meaningful Git commit | Local repository commit and submission Git bundle; see SUBMISSION.md |
| Five or more tests | Executed HTTP and browser records in docs |
| Storage trade-off | Explanation below |
| Demonstrated rejection | Plain text disguised.png rejected by server content validation; actual screenshot and HTTP test |

## Why local private storage + SQLite?

I chose local disk for file bytes and SQLite for metadata because the lab runs on one computer, needs no cloud account, and keeps the upload flow easy to inspect. A generated filename prevents collisions and prevents the client from selecting a storage path. SQLite supports parameterized queries and durable metadata without a separate database server.

The trade-off is operational: local disk does not automatically replicate, scale across servers, or survive disk loss. Backups must include both the metadata database and its corresponding blobs. A private object store would improve durability and support multiple app instances, but would require credentials, access policies and extra setup. Keeping large files inside a relational database could simplify transactions but enlarges database backups. Local disk is appropriate for this single-process classroom prototype.

## Validation and access decisions

- Server uses the authenticated NameIdentifier as owner. It never trusts an owner field sent by a client.
- Multipart IFormFile binding; exactly one file; non-empty; strict extension and MIME allowlists; size limit independently enforced on the server.
- PNG/JPEG are identified and decoded with SkiaSharp, with pixel limits checked before allocating the decoded bitmap. Incomplete decodes are rejected. Original bytes remain unchanged.
- PDF header is checked and PdfPig parses the document/page tree. This rejects malformed or encrypted/unsupported documents. PDF parsing does not certify that a document is harmless.
- Client selection restrictions only improve usability. Crafted requests still pass through all server checks. The UI permits an invalid file to be submitted for the required rejected-upload demonstration.
- Incoming paths are reduced to a basename for display; name length/control characters checked; client name is never a disk path. React escapes displayed text.
- Bytes are saved using FileMode.CreateNew under a generated UUID. Metadata is inserted after a successful file write. If insertion fails, bytes are removed. Startup removes orphaned blobs after an interrupted write. Startup recovery is for one app process per storage root.
- HTTP-only, SameSite=Strict signed session cookie; 30-minute non-sliding lifetime. Real ASP.NET Core antiforgery tokens protect all POST operations, including login and logout. Upload binding's implicit antiforgery is disabled because the explicit shared middleware validates requests first.
- Login rate limit: 10 attempts/minute/IP. At most two active uploads per process. No CORS allowance is configured.
- Downloads require owner authorization every time, are attachments, send nosniff, and are not publicly served. Metadata and API responses use no-store caching. SHA-256 recorded for integrity evidence.
- Storage exceptions return a generic 503 rather than exposing paths or file contents to the client. Logs record generated ID/owner for accepted uploads and generic format rejection events.

## Classroom scope and limitations

The public demo credentials exist only in Development and the start script binds to 127.0.0.1. This is a local lab, not a deployable campus identity service. Before deployment, replace the two demo accounts with institutional authentication, run behind HTTPS, enforce per-user quota and retention, add malware scanning/quarantine and operational audit/backup policies, and verify library security updates. Production cookie settings require HTTPS; production demo login is disabled.

Available means the supported format was validated and saved, not malware-scanned. PDFs can contain active content and images can retain EXIF/location metadata; these originals are downloaded as attachments and are never executed by this app. No preview, OCR, image resizing, antivirus claim or automated retention is included in the Week 10 slice. Windows ACLs isolate other ordinary OS accounts; another process running as the same Windows user can access the data. There is no encryption-at-rest layer in this prototype.

## Reference alignment

The supplied lecture's slides 7, 11, 13–18 guide the validation, storage, retrieval and test design. Slide 18 matches the provided assignment screenshot. The broader lecture discusses thumbnails, cloud storage and malware scanning as options; they are not required by the selected minimal activity.

Implementation references:
- Microsoft file-upload guidance: https://learn.microsoft.com/aspnet/core/mvc/models/file-uploads
- Microsoft antiforgery guidance: https://learn.microsoft.com/aspnet/core/security/anti-request-forgery
- SkiaSharp API: https://learn.microsoft.com/dotnet/api/skiasharp.skcodec
- PdfPig project: https://github.com/UglyToad/PdfPig

Third-party dependencies retain their own licenses. SkiaSharp is MIT; PdfPig is Apache-2.0; Microsoft.Data.Sqlite is MIT; React and Vite are MIT. Dependency package license files accompany restored packages, which are not redistributed in the source submission.

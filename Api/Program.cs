using System.Security.Claims;
using System.Security.Cryptography;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.Sqlite;
using SkiaSharp;
using UglyToad.PdfPig;

const long MaxBytes = 5_000_000;
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 5_200_000);
builder.Services.Configure<FormOptions>(o => { o.MultipartBodyLengthLimit = 5_200_000; o.MemoryBufferThreshold = 64 * 1024; });
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "CampusHub.Session"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
    o.ExpireTimeSpan = TimeSpan.FromMinutes(30); o.SlidingExpiration = false;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
});
builder.Services.AddAuthorization();
builder.Services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.SameSite = SameSiteMode.Strict; });
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("login", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "local",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    o.AddConcurrencyLimiter("upload", o => { o.PermitLimit = 2; o.QueueLimit = 0; });
});
var storage = Path.GetFullPath(builder.Configuration["StorageRoot"] ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CampusDocumentHub", "private"));
var relative = Path.GetRelativePath(builder.Environment.ContentRootPath, storage);
if (!relative.StartsWith(".." + Path.DirectorySeparatorChar) && relative != ".." && !Path.IsPathRooted(relative))
    throw new InvalidOperationException("StorageRoot must be outside the application folder.");
Directory.CreateDirectory(storage);
if (OperatingSystem.IsWindows())
{
    var acl = new DirectorySecurity(); acl.SetAccessRuleProtection(true, false);
    var current = WindowsIdentity.GetCurrent().User!;
    var inheritance = InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit;
    acl.AddAccessRule(new FileSystemAccessRule(current, FileSystemRights.FullControl, inheritance, PropagationFlags.None, AccessControlType.Allow));
    acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), FileSystemRights.FullControl, inheritance, PropagationFlags.None, AccessControlType.Allow));
    new DirectoryInfo(storage).SetAccessControl(acl);
}
else { File.SetUnixFileMode(storage, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute); }
var store = new DocumentStore(storage); store.Initialize();
var app = builder.Build();
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
    if (ctx.Request.Path.StartsWithSegments("/api")) ctx.Response.Headers.CacheControl = "no-store";
    if (ctx.Request.ContentLength > 5_200_000) { ctx.Response.StatusCode = 413; await ctx.Response.WriteAsJsonAsync(new { error = "Request exceeds the 5 MB file limit plus form overhead." }); return; }
    try { await next(); }
    catch (BadHttpRequestException e) { ctx.Response.StatusCode = e.StatusCode; await ctx.Response.WriteAsJsonAsync(new { error = "Request rejected. Use one file no larger than 5 MB." }); }
    catch (Exception e) when (e is IOException or SqliteException or UnauthorizedAccessException)
    {
        app.Logger.LogError(e, "Storage operation failed"); ctx.Response.StatusCode = 503;
        await ctx.Response.WriteAsJsonAsync(new { error = "Storage is temporarily unavailable. Please try again." });
    }
});
app.UseDefaultFiles(); app.UseStaticFiles();
app.UseAuthentication(); app.UseAuthorization(); app.UseRateLimiter();
// Validate ALL state-changing requests, including login. Form binding is never a CSRF substitute.
app.Use(async (ctx, next) =>
{
    if (HttpMethods.IsPost(ctx.Request.Method) && ctx.Request.Path.StartsWithSegments("/api"))
    {
        // Preserve 401 for unauthenticated file uploads, without reading their body.
        if (ctx.Request.Path.StartsWithSegments("/api/files") && ctx.User.Identity?.IsAuthenticated != true) { ctx.Response.StatusCode = 401; return; }
        try { await ctx.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(ctx); }
        catch (AntiforgeryValidationException) { ctx.Response.StatusCode = 400; await ctx.Response.WriteAsJsonAsync(new { error = "Session security token expired. Refresh and try again." }); return; }
    }
    await next();
});
app.MapGet("/api/csrf", (HttpContext c, IAntiforgery csrf) => Results.Ok(new { token = csrf.GetAndStoreTokens(c).RequestToken }));
app.MapGet("/api/session", (HttpContext c) => Results.Ok(new { username = c.User.Identity?.IsAuthenticated == true ? c.User.Identity.Name : null }));
app.MapPost("/api/login", async (Login input, HttpContext c) =>
{
    // Classroom accounts are enabled only in Development. Never accept a user ID from an upload request.
    if (!app.Environment.IsDevelopment()) return Results.NotFound();
    var expected = input.Username == "alice" ? "AliceDemo!2026" : input.Username == "bob" ? "BobDemo!2026" : null;
    if (expected == null || input.Password == null || !CryptographicOperations.FixedTimeEquals(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input.Password)), SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(expected))))
        return Results.Json(new { error = "Incorrect username or password." }, statusCode: 401);
    var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, input.Username!), new Claim(ClaimTypes.Name, input.Username!) }, CookieAuthenticationDefaults.AuthenticationScheme);
    await c.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    return Results.Ok(new { username = input.Username });
}).RequireRateLimiting("login");
app.MapPost("/api/logout", async (HttpContext c) => { await c.SignOutAsync(); return Results.NoContent(); }).RequireAuthorization();
app.MapGet("/api/files", (HttpContext c) => Results.Ok(store.List(c.User.FindFirstValue(ClaimTypes.NameIdentifier)!))).RequireAuthorization();
app.MapPost("/api/files", async (IFormFile? file, HttpContext c) =>
{
    if (file == null || file.Length == 0) return Error("Choose a non-empty file.");
    if (file.Length > MaxBytes) return Error("File exceeds the 5 MB (5,000,000 byte) limit.");
    if (c.Request.Form.Files.Count != 1) return Error("Choose exactly one file.");
    var name = Path.GetFileName(file.FileName.Replace('\\', '/'));
    if (string.IsNullOrWhiteSpace(name) || name.Length > 180 || name.Any(char.IsControl)) return Error("Use a filename of 1–180 characters without control characters.");
    var extension = Path.GetExtension(name).ToLowerInvariant();
    var mime = extension switch { ".pdf" => "application/pdf", ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg", _ => "" };
    if (mime == "") return Error("Unsupported file type. Choose a PDF, PNG, or JPEG.");
    if (!string.Equals(file.ContentType, mime, StringComparison.OrdinalIgnoreCase)) return Error("The file's declared type does not match its extension.");
    using var buffer = new MemoryStream(); await file.CopyToAsync(buffer, c.RequestAborted); var bytes = buffer.ToArray();
    try
    {
        if (extension == ".pdf")
        {
            if (!bytes.AsSpan().StartsWith("%PDF-"u8)) return Error("Content does not match a PDF file.");
            using var pdf = PdfDocument.Open(bytes);
            if (pdf.NumberOfPages < 1 || pdf.NumberOfPages > 500) return Error("PDF must contain 1–500 pages.");
            foreach (var page in pdf.GetPages()) { _ = page.Width; } // Parse page tree as well as header.
        }
        else
        {
            using var data = SKData.CreateCopy(bytes);
            using var codec = SKCodec.Create(data);
            if (codec == null) return Error("Image content is invalid or corrupt.");
            if ((extension == ".png" && codec.EncodedFormat != SKEncodedImageFormat.Png) || (extension != ".png" && codec.EncodedFormat != SKEncodedImageFormat.Jpeg)) return Error("Image content does not match its extension.");
            var info = codec.Info;
            if (info.Width > 8000 || info.Height > 8000 || (long)info.Width * info.Height > 20_000_000) return Error("Image exceeds the 8,000 pixel / 20 megapixel limit.");
            using var decoded = new SKBitmap(info.Width, info.Height, SKColorType.Rgba8888, SKAlphaType.Premul);
            if (codec.GetPixels(decoded.Info, decoded.GetPixels()) != SKCodecResult.Success) return Error("Image content is incomplete or corrupt.");
        }
    }
    catch (Exception e) when (e is not OperationCanceledException and not OutOfMemoryException)
    {
        app.Logger.LogInformation("Rejected invalid {Extension} upload", extension);
        return Error("File content is invalid, corrupt, encrypted, or does not match the chosen type.");
    }
    var record = await store.Save(c.User.FindFirstValue(ClaimTypes.NameIdentifier)!, name, mime, bytes, c.RequestAborted);
    app.Logger.LogInformation("Stored file {Id} for owner {Owner}", record.Id, record.Owner);
    return Results.Created($"/api/files/{record.Id}", record);
}).RequireAuthorization().RequireRateLimiting("upload").DisableAntiforgery(); // Explicit middleware above validates the token, including login/logout.
app.MapGet("/api/files/{id:guid}", (Guid id, HttpContext c) =>
{
    var record = store.Find(id.ToString(), c.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    if (record == null) return Results.NotFound(); // Do not reveal another student's metadata.
    var path = store.ContentPath(record.Id);
    if (!File.Exists(path)) return Results.Json(new { error = "The stored file is unavailable." }, statusCode: 503);
    return Results.File(path, record.ContentType, record.OriginalName, enableRangeProcessing: false);
}).RequireAuthorization();
app.Run();
static IResult Error(string message) => Results.BadRequest(new { error = message });
record Login(string? Username, string? Password);
record FileRecord(string Id, string Owner, string OriginalName, long SizeBytes, string ContentType, string Status, string CreatedAtUtc, string Sha256);

sealed class DocumentStore(string root)
{
    SqliteConnection Open() { var c = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(root, "metadata.db"), ForeignKeys = true }.ToString()); c.Open(); return c; }
    public string ContentPath(string id) => Path.Combine(root, id + ".blob");
    public void Initialize()
    {
        using var c = Open(); using var cmd = c.CreateCommand();
        cmd.CommandText = "CREATE TABLE IF NOT EXISTS Files (Id TEXT PRIMARY KEY, Owner TEXT NOT NULL, OriginalName TEXT NOT NULL, SizeBytes INTEGER NOT NULL, ContentType TEXT NOT NULL, Status TEXT NOT NULL, CreatedAtUtc TEXT NOT NULL, Sha256 TEXT NOT NULL); CREATE INDEX IF NOT EXISTS IX_Files_Owner ON Files(Owner);"; cmd.ExecuteNonQuery();
        // Single-process app: recover orphaned bytes left by an interrupted write before accepting requests.
        foreach (var path in Directory.EnumerateFiles(root, "*.blob"))
        {
            using var q = c.CreateCommand(); q.CommandText = "SELECT count(*) FROM Files WHERE Id=$id"; q.Parameters.AddWithValue("$id", Path.GetFileNameWithoutExtension(path));
            if ((long)q.ExecuteScalar()! == 0) File.Delete(path);
        }
    }
    public async Task<FileRecord> Save(string owner, string name, string mime, byte[] bytes, CancellationToken ct)
    {
        var r = new FileRecord(Guid.NewGuid().ToString(), owner, name, bytes.LongLength, mime, "Available", DateTimeOffset.UtcNow.ToString("O"), Convert.ToHexString(SHA256.HashData(bytes)));
        var path = ContentPath(r.Id);
        try
        {
            await using (var f = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { await f.WriteAsync(bytes, ct); await f.FlushAsync(ct); }
            using var c = Open(); using var cmd = c.CreateCommand();
            cmd.CommandText = "INSERT INTO Files VALUES ($id,$owner,$name,$size,$mime,$status,$date,$sha)";
            cmd.Parameters.AddWithValue("$id", r.Id); cmd.Parameters.AddWithValue("$owner", owner); cmd.Parameters.AddWithValue("$name", name);
            cmd.Parameters.AddWithValue("$size", r.SizeBytes); cmd.Parameters.AddWithValue("$mime", mime); cmd.Parameters.AddWithValue("$status", r.Status);
            cmd.Parameters.AddWithValue("$date", r.CreatedAtUtc); cmd.Parameters.AddWithValue("$sha", r.Sha256); await cmd.ExecuteNonQueryAsync(ct);
            return r;
        }
        catch { if (File.Exists(path)) File.Delete(path); throw; }
    }
    public List<FileRecord> List(string owner) => Query(owner, null);
    public FileRecord? Find(string id, string owner) => Query(owner, id).SingleOrDefault();
    List<FileRecord> Query(string owner, string? id)
    {
        using var c = Open(); using var cmd = c.CreateCommand(); cmd.CommandText = "SELECT * FROM Files WHERE Owner=$owner" + (id == null ? " ORDER BY CreatedAtUtc DESC" : " AND Id=$id");
        cmd.Parameters.AddWithValue("$owner", owner); if (id != null) cmd.Parameters.AddWithValue("$id", id);
        using var reader = cmd.ExecuteReader(); var records = new List<FileRecord>();
        while (reader.Read()) records.Add(new(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetInt64(3), reader.GetString(4), reader.GetString(5), reader.GetString(6), reader.GetString(7)));
        return records;
    }
}

import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const base = process.argv[2] || "http://127.0.0.1:5081";
const shots = path.join(root, "docs/screenshots");
await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
});
const page = await context.newPage();
const errors = [];
const results = [];
page.on("pageerror", (e) => errors.push(e.message));
async function run(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log("PASS " + name);
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
    console.error("FAIL " + name + " " + e.message);
    throw e;
  }
}
try {
  await run("Sign-in screen renders", async () => {
    await page.goto(base);
    await expect(
      page.getByRole("heading", { name: "Sign in to your hub" }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(shots, "01-sign-in.png"),
      fullPage: true,
    });
  });
  await run("Authenticated sign-in and private library", async () => {
    await page.getByLabel("Username", { exact: true }).fill("bob");
    await page.getByLabel("Password", { exact: true }).fill("BobDemo!2026");
    await page.getByRole("button", { name: "Sign in →", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your documents", exact: true }),
    ).toBeVisible();
  });
  await run("Picker displays selected PDF name and byte size", async () => {
    await page
      .locator("#file")
      .setInputFiles(path.join(root, "tests/fixtures/campus-notes.pdf"));
    await expect(page.locator(".selected")).toContainText("campus-notes.pdf");
    await expect(page.locator(".selected")).toContainText("bytes");
    await page.screenshot({
      path: path.join(shots, "02-file-selected.png"),
      fullPage: true,
    });
  });
  let fileId;
  await run("Browser upload produces Available metadata", async () => {
    const response = page.waitForResponse(
      (r) => r.url().endsWith("/api/files") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Upload document ↑" }).click();
    const r = await response;
    expect(r.status()).toBe(201);
    fileId = (await r.json()).id;
    await expect(page.locator(".notice.success")).toContainText("Upload complete");
    await expect(page.locator(".file-list")).toContainText("Available");
    await page.screenshot({
      path: path.join(shots, "03-upload-success.png"),
      fullPage: true,
    });
  });
  await run("Authenticated download matches fixture", async () => {
    const promise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download campus-notes.pdf", exact: true })
      .first()
      .click();
    const d = await promise;
    expect(d.suggestedFilename()).toBe("campus-notes.pdf");
    expect(await readFile(await d.path())).toEqual(
      await readFile(path.join(root, "tests/fixtures/campus-notes.pdf")),
    );
  });
  await run(
    "Disguised PNG rejected by real API and explained in UI",
    async () => {
      await page
        .locator("#file")
        .setInputFiles(path.join(root, "tests/fixtures/disguised.png"));
      const promise = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/files") && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Upload document ↑" }).click();
      expect((await promise).status()).toBe(400);
      await expect(page.getByRole("alert")).toContainText("invalid");
      await page.screenshot({
        path: path.join(shots, "04-rejected-upload.png"),
        fullPage: true,
      });
    },
  );
  await run("Reload retains persisted owner document list", async () => {
    await page.reload();
    await expect(page.locator(".file-list")).toContainText("campus-notes.pdf");
  });
  await run(
    "Valid JPEG content accepted for jpg and jpeg extensions",
    async () => {
      const encoded = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 2;
        c.height = 2;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#537747";
        ctx.fillRect(0, 0, 2, 2);
        return c.toDataURL("image/jpeg").split(",")[1];
      });
      const bytes = Buffer.from(encoded, "base64");
      await writeFile(
        path.join(root, "tests/fixtures/campus-photo.jpg"),
        bytes,
      );
      const token = (
        await (await context.request.get(base + "/api/csrf")).json()
      ).token;
      for (const ext of ["jpg", "jpeg"]) {
        const r = await context.request.post(base + "/api/files", {
          headers: { "X-CSRF-TOKEN": token },
          multipart: {
            file: {
              name: "campus-photo." + ext,
              mimeType: "image/jpeg",
              buffer: bytes,
            },
          },
        });
        expect(r.status()).toBe(201);
      }
      await page.reload();
      await expect(page.locator(".file-list")).toContainText(
        "campus-photo.jpeg",
      );
    },
  );
  await run("390px mobile layout has no horizontal overflow", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#file")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: path.join(shots, "05-mobile.png"),
      fullPage: true,
    });
  });
  await run(
    "Different signed-in browser account denied known Bob ID",
    async () => {
      const other = await browser.newContext();
      const r = await other.request.get(base + "/api/csrf");
      const token = (await r.json()).token;
      expect(
        (
          await other.request.post(base + "/api/login", {
            headers: { "X-CSRF-TOKEN": token },
            data: { username: "alice", password: "AliceDemo!2026" },
          })
        ).status(),
      ).toBe(200);
      expect(
        (await other.request.get(base + "/api/files/" + fileId)).status(),
      ).toBe(404);
      await other.close();
    },
  );
  await run("Report ready totals match real API and daily table", async () => {
    await page.setViewportSize({ width: 1440, height: 1080 });
    await expect(page.locator('.kpi')).toHaveCount(4);
    const report = await (await context.request.get(base + '/api/reports/documents')).json();
    await expect(page.locator('.kpi').first()).toContainText(report.totalDocuments.toLocaleString());
    await page.getByText('View exact daily counts').click();
    await expect(page.locator('.daily-table tbody tr')).toHaveCount(report.uploadsByDay.length);
    await page.screenshot({ path: path.join(shots, '11-dashboard-ready.png'), fullPage: true });
  });
  await run("Report empty state from real date filter", async () => {
    await page.getByLabel('From (UTC)').fill('2000-01-01');
    await page.getByLabel('To (UTC)').fill('2000-01-03');
    await page.getByRole('button', { name: 'Update report' }).click();
    await expect(page.getByRole('heading', { name: 'No documents in this date range' })).toBeVisible();
    await page.screenshot({ path: path.join(shots, '12-dashboard-empty.png'), fullPage: true });
  });
  await run("Report loading, error and retry states", async () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/api/reports/documents?*', async route => { await gate; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Report unavailable. Try again.' }) }); });
    await page.getByRole('button', { name: 'Update report' }).click();
    await expect(page.getByText('Loading document report…')).toBeVisible();
    await page.screenshot({ path: path.join(shots, '13-dashboard-loading.png'), fullPage: true });
    release();
    await expect(page.getByRole('alert')).toContainText('Report unavailable');
    await page.screenshot({ path: path.join(shots, '14-dashboard-error.png'), fullPage: true });
    await page.unroute('**/api/reports/documents?*');
    await page.getByRole('button', { name: 'Retry report' }).click();
    await expect(page.getByRole('heading', { name: 'No documents in this date range' })).toBeVisible();
    const today = new Date().toISOString().slice(0,10);
    await page.getByLabel('From (UTC)').fill(today);
    await page.getByLabel('To (UTC)').fill(today);
    await page.getByRole('button', { name: 'Update report' }).click();
    await expect(page.locator('.kpi')).toHaveCount(4);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(shots, '15-dashboard-mobile.png'), fullPage: true });
  });
  await run("Sign out returns to login and prevents retrieval", async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(
      page.getByRole("heading", { name: "Sign in to your hub" }),
    ).toBeVisible();
    expect(
      (await context.request.get(base + "/api/files/" + fileId)).status(),
    ).toBe(401);
  });
  await run("No uncaught browser JavaScript errors", async () => {
    expect(errors).toEqual([]);
  });
} finally {
  await browser.close();
  const text =
    "# Browser verification\n\nExecuted: " +
    new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }) +
    " (Asia/Manila)\n\nReal Microsoft Edge browser, automated using Playwright. Desktop: 1440 × 1080; mobile viewport: 390 × 844.\n\n| Case | Result |\n|---|---|\n" +
    results
      .map(
        (r) =>
          `| ${r.name} | ${r.passed ? "PASS" : "FAIL: " + r.error.replaceAll("|", "/")} |`,
      )
      .join("\n") +
    "\n\nScreenshots are unmodified captures of the running application.\n";
  await writeFile(path.join(root, "docs/BROWSER-RESULTS.md"), text);
}

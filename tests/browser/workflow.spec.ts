import { test, expect } from "@playwright/test";
import { sampleEnquiry } from "../../shared/domain";
import AxeBuilder from "@axe-core/playwright";

test("saving preserves new typing and a later deliberate approval creates a new task", async ({
  page,
}) => {
  await page.goto("/#/owner");
  await page.getByRole("link").filter({ hasText: "Jamie Taylor" }).click();
  const editor = page.getByRole("textbox", { name: "Reply draft" });
  await editor.fill("First version of the owner reply.");
  await page.route("**/draft", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await editor.fill("Newer typing while the save is in progress.");
  await expect(page.getByRole("status")).toHaveText("Draft saved.");
  await expect(editor).toHaveValue(
    "Newer typing while the save is in progress.",
  );
  await page.unroute("**/draft");
  await page.getByRole("button", { name: /Approve to demo outbox/ }).click();
  await expect(page.getByRole("status")).toContainText(
    "Approved to demo outbox",
  );
  await page.getByRole("button", { name: /Complete follow-up/ }).click();
  await expect(page.getByText("Last follow-up: completed.")).toBeVisible();
  await page.getByRole("button", { name: /Approve to demo outbox/ }).click();
  await expect(
    page.getByRole("button", { name: /Complete follow-up/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/View 2 immutable simulated outbox records/),
  ).toBeVisible();
});

test("main screens pass automated accessibility checks", async ({ page }) => {
  for (const route of ["/", "/#/enquire", "/#/owner"]) {
    await page.goto(route);
    if (route.includes("owner"))
      await expect(
        page.getByRole("heading", { name: "A little less admin." }),
      ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("sample enquiry completes the customer-to-owner follow-up journey", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Small drips/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/public-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: /Request a quote/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Fill with sample enquiry/ }).click();
  await page.getByRole("button", { name: /Send enquiry/ }).click();
  await expect(
    page.getByText("Your request is ready to review in the owner demo."),
  ).toBeVisible();
  await page.getByRole("link", { name: /Inspect this enquiry/ }).click();
  await expect(
    page.getByRole("heading", { name: "Alex Morgan" }),
  ).toBeVisible();
  await expect(
    page.getByText("Template mode — live AI not connected"),
  ).toBeVisible();
  const detailUrl = page.url();
  const edited =
    "Hi Alex, thanks for your request. Please confirm access to the kitchen tap. Your requested Friday after 2 is not a booking. Please text first is noted.";
  await page.getByRole("textbox", { name: "Reply draft" }).fill(edited);
  await page.getByRole("button", { name: /Retry analysis/ }).click();
  await expect(
    page.getByText(
      "A new suggestion is ready. Your edited draft has been preserved.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Reply draft" })).toHaveValue(
    edited,
  );
  await page.getByRole("button", { name: /Approve to demo outbox/ }).click();
  await expect(page.getByRole("status")).toContainText(
    "Approved to demo outbox",
  );
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Reply draft" })).toHaveValue(
    edited,
  );
  await page.screenshot({
    path: "docs/screenshots/detail-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Return to dashboard/ }).click();
  await page.getByRole("button", { name: /Advance 48 hours/ }).click();
  await expect(page.getByText("Simulated time +48h")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: /Demo outbox/ }).click();
  await expect(page.getByText(edited, { exact: true })).toBeVisible();
  await page.goto(detailUrl);
  await expect(page.getByText("Due now", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Complete follow-up/ }).click();
  await expect(page.getByRole("status")).toHaveText("Follow-up completed.");
  await expect(page.getByText("Last follow-up: completed.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("independent browser workspaces cannot read, edit or reset each other", async ({
  browser,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  try {
    const a = first.request;
    const b = second.request;
    const beforeA = await (
      await a.get("http://127.0.0.1:5173/api/dashboard")
    ).json();
    const beforeB = await (
      await b.get("http://127.0.0.1:5173/api/dashboard")
    ).json();
    expect(beforeA.enquiries).toHaveLength(6);
    expect(beforeB.enquiries).toHaveLength(6);
    const foreign = beforeA.enquiries[0].id;
    expect(
      (await b.get(`http://127.0.0.1:5173/api/enquiries/${foreign}`)).status(),
    ).toBe(404);
    for (const action of [
      "draft",
      "approval",
      "status",
      "analysis",
      "complete",
    ])
      expect(
        (
          await b.post(
            `http://127.0.0.1:5173/api/enquiries/${foreign}/${action}`,
            { data: {} },
          )
        ).status(),
      ).toBe(404);
    await b.post("http://127.0.0.1:5173/api/reset", {
      data: { confirm: true },
    });
    const afterA = await (
      await a.get("http://127.0.0.1:5173/api/dashboard")
    ).json();
    expect(afterA.enquiries.map((e: { id: string }) => e.id)).toEqual(
      beforeA.enquiries.map((e: { id: string }) => e.id),
    );
    const cookies = await first.cookies();
    expect(cookies[0].httpOnly).toBe(true);
    expect(cookies[0].sameSite).toBe("Lax");
  } finally {
    await first.close();
    await second.close();
  }
});

test("concurrent approval retries are idempotent and terminal statuses cancel tasks", async ({
  request,
}) => {
  await request.get("/api/dashboard");
  const { id } = await (
    await request.post("/api/enquiries", {
      data: { input: sampleEnquiry, key: crypto.randomUUID() },
    })
  ).json();
  const approval = {
    draft: "  This exact edited reply retains spaces.\n",
    key: crypto.randomUUID(),
  };
  const approvals = await Promise.all([
    request.post(`/api/enquiries/${id}/approval`, { data: approval }),
    request.post(`/api/enquiries/${id}/approval`, { data: approval }),
  ]);
  expect(approvals.map((a) => a.status())).toEqual([200, 200]);
  let detail = await (await request.get(`/api/enquiries/${id}`)).json();
  expect(detail.outbox).toHaveLength(1);
  expect(detail.outbox[0].body).toBe(approval.draft);
  expect(detail.tasks).toHaveLength(1);
  expect(
    Date.parse(detail.tasks[0].due_at) -
      Date.parse(detail.outbox[0].created_at),
  ).toBe(172800000);
  await request.post(`/api/enquiries/${id}/status`, {
    data: { status: "Won" },
  });
  detail = await (await request.get(`/api/enquiries/${id}`)).json();
  expect(detail.tasks[0].state).toBe("cancelled");
  expect(
    (
      await request.post(`/api/enquiries/${id}/approval`, {
        data: { ...approval, key: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
  await request.post(`/api/enquiries/${id}/status`, {
    data: { status: "New" },
  });
  await request.post(`/api/enquiries/${id}/approval`, {
    data: { ...approval, key: crypto.randomUUID() },
  });
  await request.post(`/api/enquiries/${id}/status`, {
    data: { status: "Closed" },
  });
  detail = await (await request.get(`/api/enquiries/${id}`)).json();
  expect(detail.tasks.every((t: { state: string }) => t.state !== "open")).toBe(
    true,
  );
  expect(detail.outbox).toHaveLength(2);
});

test("mobile layouts, validation, empty states and persistence failure recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/screenshots/public-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: /Request a quote/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Send enquiry/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toBeFocused();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await page.getByRole("button", { name: /Fill with sample/ }).click();
  await page.route("**/api/enquiries", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Temporary save failure. Please retry." }),
    }),
  );
  await page.getByRole("button", { name: /Send enquiry/ }).click();
  await expect(page.getByRole("alert")).toContainText("Temporary save failure");
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Alex Morgan");
  await expect(
    page.getByRole("heading", { name: "A good first step." }),
  ).toHaveCount(0);
  await page.unroute("**/api/enquiries");
  await page.getByRole("button", { name: /Retry saving enquiry/ }).click();
  await page.getByRole("link", { name: /Inspect this enquiry/ }).click();
  await expect(
    page.getByRole("heading", { name: "Alex Morgan" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/detail-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: /Return to dashboard/ }).click();
  await expect(
    page.getByRole("heading", { name: "A little less admin." }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("searchbox", { name: "Search enquiries" })
    .fill("no matching fictional person");
  await expect(page.getByText("No enquiries match.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("No enquiries match.")).toHaveCount(0);
});

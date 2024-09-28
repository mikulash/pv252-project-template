import { expect } from "@playwright/test";
import { test } from "./coverage_wrapper";

test("find-watman", async ({ page }) => {  
  await page.goto("/");
  await expect(page.getByAltText("This is watman")).toBeInViewport();
});


// custom tests for the Sam Altman's blog site https://blog.samaltman.com/
test.describe('Sam Altman Blog Tests', () => {

  test('homepage has correct title', async ({ page }) => {
    await page.goto('https://blog.samaltman.com/');
    await expect(page).toHaveTitle(/Sam Altman/);
  });

  test('all post links lead to valid pages', async ({ page }) => {
    await page.goto('https://blog.samaltman.com/archive');
    const postLinks = page.locator('.post-title a');
    const postCount = await postLinks.count();
    for (let i = 0; i < postCount; i++) {
      const link = postLinks.nth(i);
      const href = await link.getAttribute('href');
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        link.click(),
      ]);
      await newPage.waitForLoadState();
      await expect(newPage).toHaveURL(`https://blog.samaltman.com${href}`);
      await newPage.close();
    }
  });

  test('#main contains article elements', async ({ page }) => {
    await page.goto('https://blog.samaltman.com/');
    const articleCount = await page.locator('#main article').count();
    expect(articleCount).toBeGreaterThan(0);
  });

  test('click on subscribe by email shows prompt text', async ({ page }) => {
    await page.goto('https://blog.samaltman.com/gpt-4o');

    const subscribeLink = page.locator('#post_responses a.posthaven-anon.posthaven-subscribe-prompt');
    await subscribeLink.click();

    const promptText = page.locator('#post_responses div.posthaven-anon.posthaven-subscribe-anon');
    await expect(promptText).toBeVisible();
  });
});
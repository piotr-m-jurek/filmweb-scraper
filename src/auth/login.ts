import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";
import { env } from "../env.js";

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.filmweb.pl/login");
  await page.getByRole("button", { name: "Zaakceptuj i zamknij: Wyraź" }).click();
  await page.getByRole("button", { name: "Kontynuuj z Filmweb" }).click();
  await page.locator('input[name="login"]').click();
  await page.locator('input[name="login"]').fill(env.FILMWEB_EMAIL);
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(env.FILMWEB_PASSWORD);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await page.waitForURL("https://www.filmweb.pl/");

  mkdirSync(dirname(env.STORAGE_STATE_PATH), { recursive: true });
  await context.storageState({ path: env.STORAGE_STATE_PATH });
  console.log(`session saved to ${env.STORAGE_STATE_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

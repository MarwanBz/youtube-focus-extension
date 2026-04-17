import { test, expect } from "@playwright/test";

/**
 * A representative subset of Tailwind Preflight that resets h1 styles.
 * Full Preflight does the same thing across all heading, body, and element selectors.
 */
const PREFLIGHT_SNIPPET = `
  h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; margin: 0; }
  body { margin: 0; }
`;

/**
 * A minimal host page simulating a real site the extension would run on.
 * Browser defaults: h1 has margin (~10.7px top) and font-size (32px = 2em).
 */
const HOST_PAGE = `
  <!DOCTYPE html>
  <html>
    <body>
      <nav><a href="#">Nav link</a></nav>
      <h1>Host page heading</h1>
    </body>
  </html>
`;

test.describe("Tailwind Preflight isolation", () => {
  test("reproduces issue: global CSS injection leaks Preflight into host page", async ({
    page,
  }) => {
    await page.setContent(HOST_PAGE);

    const before = await page.evaluate(() => ({
      h1MarginTop: getComputedStyle(document.querySelector("h1")!).marginTop,
      h1FontSize: getComputedStyle(document.querySelector("h1")!).fontSize,
    }));

    expect(before.h1MarginTop).not.toBe("0px");
    expect(before.h1FontSize).not.toBe("16px");

    await page.evaluate((css) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
    }, PREFLIGHT_SNIPPET);

    const after = await page.evaluate(() => ({
      h1MarginTop: getComputedStyle(document.querySelector("h1")!).marginTop,
      h1FontSize: getComputedStyle(document.querySelector("h1")!).fontSize,
    }));

    expect(after.h1MarginTop).toBe("0px");
    expect(after.h1FontSize).toBe("16px");
  });

  test("fix: Shadow DOM scopes Preflight away from host page", async ({
    page,
  }) => {
    await page.setContent(HOST_PAGE);

    const before = await page.evaluate(() => ({
      h1MarginTop: getComputedStyle(document.querySelector("h1")!).marginTop,
      h1FontSize: getComputedStyle(document.querySelector("h1")!).fontSize,
    }));

    expect(before.h1MarginTop).not.toBe("0px");
    expect(before.h1FontSize).not.toBe("16px");

    await page.evaluate((css) => {
      const host = document.createElement("div");
      host.id = "extension-root";
      document.body.appendChild(host);
      const shadowRoot = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = css;
      shadowRoot.appendChild(style);
    }, PREFLIGHT_SNIPPET);

    const after = await page.evaluate(() => ({
      h1MarginTop: getComputedStyle(document.querySelector("h1")!).marginTop,
      h1FontSize: getComputedStyle(document.querySelector("h1")!).fontSize,
    }));

    expect(after.h1MarginTop).not.toBe("0px");
    expect(after.h1FontSize).not.toBe("16px");
  });
});

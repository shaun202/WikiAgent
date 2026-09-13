import { test } from "node:test";
import assert from "node:assert/strict";
import { pageify } from "./html";

const SAMPLE = `
<!doctype html>
<html>
  <head><title>Example Article</title></head>
  <body>
    <nav>Home About Contact</nav>
    <main>
      <h1>Example Article</h1>
      <p>The first paragraph explains the topic.</p>
      <script>window.tracking = true;</script>
      <ul><li>Point one</li><li>Point two</li></ul>
      <p>Concluding paragraph with <strong>important</strong> detail.</p>
    </main>
    <footer>Copyright</footer>
  </body>
</html>
`;

test("pageify: strips chrome and keeps article text", () => {
  const { title, text } = pageify(SAMPLE);
  assert.equal(title, "Example Article");
  assert.match(text, /first paragraph explains the topic/);
  assert.match(text, /Point one/);
  assert.match(text, /important/);
  assert.doesNotMatch(text, /Home About Contact/);
  assert.doesNotMatch(text, /window\.tracking/);
  assert.doesNotMatch(text, /Copyright/);
});

test("pageify: paragraph structure is preserved with blank lines", () => {
  const { text } = pageify(SAMPLE);
  const paragraphs = text.split(/\n\n/).filter(Boolean);
  assert.ok(paragraphs.length >= 3, "first p, list, concluding p");
});

test("pageify: falls back to the body and a default title", () => {
  const { title, text } = pageify("<body><p>Only content on the page.</p></body>");
  assert.equal(title, "Untitled page");
  assert.match(text, /Only content on the page\./);
});
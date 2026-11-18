import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("[Source] Table QR visit identity UX", () => {
  it("restores Ordering as for same visit and supports Change Details", () => {
    const source = readFileSync(join(__dirname, "PublicMenu.jsx"), "utf8");
    assert.match(source, /\/customer\/session/);
    assert.match(source, /\/customer\/identity/);
    assert.match(source, /formatOrderingAsLabel/);
    assert.match(source, /Change Details/);
    assert.match(source, /identityFromSessionPayload/);
    assert.match(source, /identityKnown/);
    assert.doesNotMatch(source, /localStorage\.setItem\([^)]*customerName/);
    assert.doesNotMatch(source, /sessionStorage/);
    const ux = readFileSync(join(__dirname, "publicMenuUx.js"), "utf8");
    assert.match(ux, /Ordering as/);
  });
});

describe("[Source] Room QR visit identity UX", () => {
  it("restores Ordering as for same booking and supports Change Details", () => {
    const source = readFileSync(join(__dirname, "RoomMenu.jsx"), "utf8");
    assert.match(source, /customer\/room-session/);
    assert.match(source, /\/customer\/identity/);
    assert.match(source, /formatOrderingAsLabel/);
    assert.match(source, /Change Details/);
    assert.match(source, /identityFromSessionPayload/);
    assert.match(source, /identityKnown/);
    assert.doesNotMatch(source, /localStorage/);
    assert.doesNotMatch(source, /sessionStorage/);
    const ux = readFileSync(join(__dirname, "roomMenuUx.js"), "utf8");
    assert.match(ux, /Ordering as/);
  });
});

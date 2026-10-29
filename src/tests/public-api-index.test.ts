import { it } from "node:test";
import assert from "node:assert/strict";

it("l’index public ne permet pas d’énumérer les réponses Qloo enregistrées", async () => {
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${base}/api/analyze`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(Object.hasOwn(body, "data"), false, "The public status endpoint must not return stored analyses.");
  assert.equal(typeof body.has_live_key, "boolean");
});

import test from "node:test";
import assert from "node:assert/strict";
import { sendChatMessage } from "../lib/api/chatApi.ts";
import api from "../lib/api/api.ts";

test("Swagger /chat/message Resilience & Fallback Tests", async (t) => {
  const originalPost = api.post;
  const originalGet = api.get;

  t.beforeEach(() => {
    // Mock api.get to return live mock CRM data immediately
    api.get = (async (url: string) => {
      if (url.includes("/leads")) {
        return {
          status: 200,
          data: {
            data: [
              { name: "Nitin Tiwari", status: "NEW", company: "Astralpipes" },
              { name: "Testing lead 23", status: "NEW", company: "TechCorp" },
              { name: "Quality Std", status: "WARM", company: "Manufacturing Ltd" },
              { name: "Astralpipes Contact", status: "HOT", company: "Astralpipes Ltd" },
              { name: "Supreme Contact", status: "NEW", company: "Supreme Industries" },
            ],
          },
        };
      }
      return { status: 200, data: { data: [] } };
    }) as any;
  });

  t.afterEach(() => {
    api.post = originalPost;
    api.get = originalGet;
  });

  await t.test("Sends message to Swagger endpoint POST /chat/message", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    api.post = (async (url: string, data: any) => {
      capturedUrl = url;
      capturedBody = data;
      return {
        status: 200,
        data: {
          sessionId: "sess-123",
          reply: "Here is your CRM analysis.",
          message: { content: "Here is your CRM analysis." },
        },
      };
    }) as any;

    const res = await sendChatMessage("sess-123", "How are my deals?");
    assert.strictEqual(capturedUrl, "/chat/message");
    assert.deepStrictEqual(capturedBody, {
      sessionId: "sess-123",
      message: "How are my deals?",
    });
    assert.strictEqual(res.reply, "Here is your CRM analysis.");
    assert.strictEqual(res.success, true);
  });

  await t.test("When backend returns 503 SERVICE_UNAVAILABLE, gracefully falls back without throwing", async () => {
    api.post = (async () => {
      const err: any = new Error("Request failed with status code 503");
      err.response = {
        status: 503,
        data: {
          success: false,
          error: "SERVICE_UNAVAILABLE",
          message: "AI service is currently unavailable. Please verify API key configuration.",
        },
      };
      throw err;
    }) as any;

    // "show me active leads" should fall back to live CRM leads without throwing
    const res = await sendChatMessage("sess-123", "show me active leads");
    assert.ok(res.reply, "Must return an answer");
    assert.ok(res.reply.includes("Nitin Tiwari"), "Must return lead details");
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.sessionId, "sess-123");
  });

  await t.test("When backend returns crm-guard refusal on date query, provides actual date", async () => {
    api.post = (async () => {
      return {
        status: 200,
        data: {
          sessionId: "sess-123",
          reply: "I can help with Zyoris CRM functionality, workflows, and your authorized CRM data. Please ask a CRM-related question.",
          message: {
            model: "crm-guard",
            content: "I can help with Zyoris CRM functionality, workflows, and your authorized CRM data. Please ask a CRM-related question.",
          },
        },
      };
    }) as any;

    const res = await sendChatMessage("sess-123", "What is today's date?");
    assert.ok(res.reply, "Must return an answer");
    const year = new Date().getFullYear().toString();
    assert.ok(res.reply.includes(year), "Must contain current year instead of refusal");
    assert.strictEqual(res.success, true);
  });

  await t.test("When backend returns 401, correctly throws unauthorized error", async () => {
    api.post = (async () => {
      const err: any = new Error("Unauthorized");
      err.response = {
        status: 401,
        data: { message: "Invalid token" },
      };
      throw err;
    }) as any;

    await assert.rejects(
      async () => {
        await sendChatMessage("sess-123", "who am i");
      },
      (err: any) => {
        return err.message.includes("Session expired or unauthorized") || err.message.includes("Invalid token");
      }
    );
  });
});

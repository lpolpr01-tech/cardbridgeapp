import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const SYSTEM_PROMPT = `You are CardFlow AI, an expert financial assistant embedded in the CardFlow app. You specialize in: credit cards, rewards optimization, cash back strategies, budgeting, debt payoff strategies, APR calculations, credit score improvement, financial planning, investment basics, and all areas of personal finance. You have access to the user's card data context provided in each message. Always be concise, friendly, and actionable. When doing math, show your work clearly. Never give specific investment advice or tax advice — always recommend consulting a licensed professional for those matters. Keep responses under 300 words unless a detailed breakdown is specifically requested.`;

router.post("/api/ai-agent", async (req, res) => {
  try {
    const { messages, userContext } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      userContext?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const systemWithContext = userContext
      ? `${SYSTEM_PROMPT}\n\n${userContext}`
      : SYSTEM_PROMPT;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemWithContext,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    return res.json({ reply: text });
  } catch (err: any) {
    console.error("AI agent error:", err);
    return res.status(500).json({ error: "AI agent request failed", detail: err?.message });
  }
});

export default router;

const express = require("express");
const { searchNearbyLots } = require("./lots");

const router = express.Router();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

const SEARCH_TOOL = {
  type: "function",
  function: {
    name: "search_lots",
    description:
      "Search for real parking lots near the user's current location, with live availability. " +
      "Always call this when the person is asking to find, look for, or book parking -- never guess or make up parking spots.",
    parameters: {
      type: "object",
      properties: {
        radius_km: {
          type: "number",
          description: "How far to search in kilometers. Default to 5 if not specified.",
        },
        shade_only: {
          type: "boolean",
          description: "True only if the person specifically asks for a shaded/covered spot.",
        },
        max_price_per_hour: {
          type: "number",
          description: "Only include lots at or under this hourly price (in rupees), if the person mentioned a budget.",
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are the ParkSpot assistant, built into a real-time parking booking app.
Your only job is to help people find a real parking spot using the search_lots tool -- you have no
knowledge of any parking lots yourself, so always call the tool rather than guessing or inventing one.

Keep replies short (1-3 sentences) and conversational. After the tool returns results, briefly
summarize what you found (how many spots, cheapest/closest option) -- the app will show the actual
lot cards separately, so don't list every lot's full details yourself. If the tool returns zero
results, say so plainly and suggest widening the search radius. If the person asks about anything
other than finding/comparing parking (e.g. general chit-chat, unrelated questions), politely steer
them back to parking search.`;

async function callGroq(messages) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 500,
      messages,
      tools: [SEARCH_TOOL],
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq API error (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

// POST /api/assistant/chat
// body: { message, lat, lng, history? }
router.post("/chat", async (req, res, next) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        error: "The AI assistant isn't set up yet -- add GROQ_API_KEY to the backend's .env.",
      });
    }

    const { message, lat, lng, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "lat and lng are required so the assistant can search near you" });
    }

    const priorMessages = Array.isArray(history) ? history : [{ role: "system", content: SYSTEM_PROMPT }];
    const messages = [...priorMessages, { role: "user", content: message }];

    let data = await callGroq(messages);
    let choiceMessage = data.choices[0].message;
    let lots = null;

    if (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
      const toolCall = choiceMessage.tool_calls.find((tc) => tc.function.name === "search_lots");

      if (toolCall) {
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          args = {};
        }

        lots = await searchNearbyLots({
          lat,
          lng,
          radiusKm: args.radius_km || 5,
          shadeOnly: !!args.shade_only,
          maxPricePerHour: args.max_price_per_hour || null,
        });

        const toolResultSummary = lots.slice(0, 8).map((l) => ({
          name: l.name,
          address: l.address,
          distance_km: l.distance_km,
          price_per_hour: l.price_per_hour,
          has_shade: l.has_shade,
          available_slots: l.available_slots,
          total_slots: l.total_slots,
        }));

        messages.push(choiceMessage);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: "search_lots",
          content: JSON.stringify({ count: lots.length, lots: toolResultSummary }),
        });

        data = await callGroq(messages);
        choiceMessage = data.choices[0].message;
      }
    }

    const replyText = (choiceMessage.content || "").trim();

    res.json({
      reply: replyText || "Here's what I found.",
      lots: lots ? lots.slice(0, 8) : null,
      // Send back the full running transcript so the frontend can pass it as
      // `history` on the next message for multi-turn context.
      history: [...messages, choiceMessage],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

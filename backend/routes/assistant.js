const express = require("express");
const { searchNearbyLots } = require("./lots");
const ParkingLot = require("../models/ParkingLot");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const Subscription = require("../models/Subscription");
const { requireAuth } = require("../middleware/auth");
const { distanceKm } = require("../utils/geo");
const { isSlotFree } = require("./lots");

const router = express.Router();

const MODEL = "mixtral-8x7b-32768";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// --- TOOL DEFINITIONS ---

const SEARCH_LOTS_TOOL = {
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
          type: ["number", "null"],
          description: "How far to search in kilometers. Default to 5 if not specified.",
        },
        shade_only: {
          type: ["boolean", "null"],
          description: "True only if the person specifically asks for a shaded/covered spot.",
        },
        max_price_per_hour: {
          type: ["number", "null"],
          description: "Only include lots at or under this hourly price (in rupees), if the person mentioned a budget.",
        },
      },
    },
  },
};

const GET_LOT_DETAILS_TOOL = {
  type: "function",
  function: {
    name: "get_lot_details",
    description:
      "Get full details for a specific parking lot including the complete slot grid with live availability, " +
      "pricing, shade info, and monthly subscription options. Call this when the user asks about a specific lot by name or ID.",
    parameters: {
      type: "object",
      properties: {
        lot_id: {
          type: "string",
          description: "The MongoDB ID of the parking lot (e.g., '64a1b2c3d4e5f6789012345')",
        },
        at: {
          type: ["string", "null"],
          description: "ISO timestamp to check availability for (defaults to now)",
        },
        until: {
          type: ["string", "null"],
          description: "ISO timestamp for end of availability window (defaults to 1 hour from now)",
        },
      },
      required: ["lot_id"],
    },
  },
};

const GET_USER_BOOKINGS_TOOL = {
  type: "function",
  function: {
    name: "get_user_bookings",
    description:
      "Get the authenticated user's booking history (upcoming and past). Requires the user to be logged in. " +
      "Call this when the user asks 'what are my bookings', 'my upcoming bookings', 'show my bookings', etc.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

const CREATE_BOOKING_TOOL = {
  type: "function",
  function: {
    name: "create_booking",
    description:
      "Create a new hourly booking for the authenticated user. Requires the user to be logged in. " +
      "Call this when the user explicitly wants to book a specific slot (e.g., 'book spot A1 for 2 hours'). " +
      "You MUST have the lot_id, slot_id, start_time, and end_time. Ask for missing info if needed.",
    parameters: {
      type: "object",
      properties: {
        lot_id: {
          type: "string",
          description: "The parking lot ID",
        },
        slot_id: {
          type: "string",
          description: "The specific slot ID to book (e.g., 'A1', 'B3')",
        },
        start_time: {
          type: "string",
          description: "ISO timestamp for booking start (e.g., '2026-08-16T14:00:00.000Z')",
        },
        end_time: {
          type: "string",
          description: "ISO timestamp for booking end (e.g., '2026-08-16T16:00:00.000Z')",
        },
        license_plate: {
          type: ["string", "null"],
          description: "Optional license plate",
        },
      },
      required: ["lot_id", "slot_id", "start_time", "end_time"],
    },
  },
};

const CANCEL_BOOKING_TOOL = {
  type: "function",
  function: {
    name: "cancel_booking",
    description:
      "Cancel an active booking for the authenticated user. Requires the user to be logged in. " +
      "Call this when the user wants to cancel a booking (e.g., 'cancel my booking for tomorrow').",
    parameters: {
      type: "object",
      properties: {
        booking_id: {
          type: "string",
          description: "The booking ID to cancel",
        },
      },
      required: ["booking_id"],
    },
  },
};

const GET_USER_SUBSCRIPTIONS_TOOL = {
  type: "function",
  function: {
    name: "get_user_subscriptions",
    description:
      "Get the authenticated user's monthly subscriptions. Requires the user to be logged in. " +
      "Call this when the user asks about their subscriptions or monthly spots.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

const CREATE_SUBSCRIPTION_TOOL = {
  type: "function",
  function: {
    name: "create_subscription",
    description:
      "Create a new monthly subscription for the authenticated user. Requires the user to be logged in. " +
      "Call this when the user wants a monthly spot (e.g., 'I want a monthly subscription for spot B2 for 3 months'). " +
      "You MUST have the lot_id, slot_id, start_date, and months (1-12). Ask for missing info if needed.",
    parameters: {
      type: "object",
      properties: {
        lot_id: {
          type: "string",
          description: "The parking lot ID",
        },
        slot_id: {
          type: "string",
          description: "The specific slot ID (e.g., 'A1', 'B3')",
        },
        start_date: {
          type: "string",
          description: "ISO date for subscription start (e.g., '2026-08-16')",
        },
        months: {
          type: "integer",
          description: "Number of months (1-12)",
        },
      },
      required: ["lot_id", "slot_id", "start_date", "months"],
    },
  },
};

const ALL_TOOLS = [
  SEARCH_LOTS_TOOL,
  GET_LOT_DETAILS_TOOL,
  GET_USER_BOOKINGS_TOOL,
  CREATE_BOOKING_TOOL,
  CANCEL_BOOKING_TOOL,
  GET_USER_SUBSCRIPTIONS_TOOL,
  CREATE_SUBSCRIPTION_TOOL,
];

// --- SYSTEM PROMPT WITH FEW-SHOT EXAMPLES ---

const SYSTEM_PROMPT = `You are the ParkSpot assistant, built into a real-time parking booking app.
Your ONLY job is to help people find, book, and manage parking spots using the available tools.

## CORE RULES
1. **ALWAYS use tools** — you have ZERO knowledge of parking lots yourself. Never guess, invent, or make up spots.
2. **Search first** — when someone wants to find parking, call \`search_lots\` immediately with their lat/lng.
3. **Be concise** — 1-3 sentences max. The app shows lot cards separately; don't list every detail.
4. **Ask for missing info** — if a tool needs parameters you don't have, ask the user.
5. **Stay on topic** — if asked about weather, news, general chat, etc., give a ONE-LINE polite redirect.

## OFF-TOPIC HANDLING (CRITICAL)
If the user asks about ANYTHING other than parking (weather, news, sports, cooking, coding, jokes, philosophy, etc.):
- Reply with EXACTLY ONE sentence acknowledging them + redirecting to parking
- NEVER answer the off-topic question
- NEVER use tools for off-topic queries

Examples:
- "How's the weather?" → "I'm not a weather bot, but I can help you find covered parking if you're worried about rain!"
- "What's the score?" → "I don't track sports, but I can find you a parking spot near the stadium."
- "Tell me a joke" → "I'm terrible at jokes, but I'm great at finding parking — want me to search near you?"
- "How do I cook pasta?" → "I only know parking, but I can find you a spot near a great Italian restaurant!"

## TOOL USAGE GUIDE
- \`search_lots\` — user wants to FIND parking near them (always needs lat/lng from app)
- \`get_lot_details\` — user asks about a SPECIFIC lot by name/ID ("tell me more about lot X")
- \`get_user_bookings\` — "what are my bookings", "show my upcoming bookings"
- \`create_booking\` — "book spot A1 for 2 hours", "I want to reserve this spot"
- \`cancel_booking\` — "cancel my booking", "cancel the one for tomorrow"
- \`get_user_subscriptions\` — "my subscriptions", "monthly spots"
- \`create_subscription\` — "monthly subscription for spot B2 for 3 months"

## FEW-SHOT EXAMPLES

### Example 1: Find parking
User: "Find me parking near me"
Assistant: [calls search_lots with user's lat/lng]
Tool returns: 3 lots found
Assistant: "Found 3 lots within 5km. The closest is 'Downtown Garage' at 0.3km (₹20/hr, 12 spots free). Want details on any?"

### Example 2: Specific lot details
User: "Tell me more about Downtown Garage"
Assistant: [calls get_lot_details with lot_id]
Tool returns: full lot with slot grid
Assistant: "Downtown Garage has 50 spots (12 free), ₹20/hr, ₹5000/mo. Shade available on rows A-C. Spot A1 is free now — want to book it?"

### Example 3: Book a spot
User: "Book spot A1 for 2 hours"
Assistant: "Sure! What date/time should it start? (e.g., 'tomorrow 2pm' or '2026-08-16T14:00:00')"
User: "Now for 2 hours"
Assistant: [calls create_booking with lot_id, slot_id='A1', start=now, end=+2hrs]
Tool returns: booking created
Assistant: "Booked! Spot A1 at Downtown Garage from now until 2 hours from now. ₹40 total. Check 'My Bookings' for the QR code."

### Example 4: Off-topic (weather)
User: "How's the weather today?"
Assistant: "I don't do weather, but I can find you shaded parking if you're avoiding sun or rain!"

### Example 5: Off-topic (general)
User: "What's the meaning of life?"
Assistant: "No clue on philosophy, but I know exactly where to park — want me to search near you?"

### Example 6: User bookings
User: "What are my upcoming bookings?"
Assistant: [calls get_user_bookings]
Tool returns: 2 bookings
Assistant: "You have 2 upcoming bookings: 1) Spot B2 at Riverside Lot tomorrow 10am-12pm, 2) Spot A1 at Downtown Garage Friday 6pm-8pm."

### Example 7: Cancel booking
User: "Cancel my booking for tomorrow"
Assistant: [calls get_user_bookings to find it, then cancel_booking]
Assistant: "Cancelled your booking for Spot B2 at Riverside Lot tomorrow 10am-12pm."

---

Now help the user with parking!`;

async function callGroq(messages) {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 800,
      messages,
      tools: ALL_TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq API error (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

// --- TOOL HANDLERS ---

async function handleSearchLots(args, lat, lng) {
  return searchNearbyLots({
    lat,
    lng,
    radiusKm: args.radius_km || 5,
    shadeOnly: !!args.shade_only,
    maxPricePerHour: args.max_price_per_hour || null,
  });
}

async function handleGetLotDetails(args) {
  const lot = await ParkingLot.findById(args.lot_id);
  if (!lot) return { error: "Parking lot not found" };

  const now = new Date();
  const at = args.at || now.toISOString();
  const until = args.until || new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  // Reuse the lotWithAvailability logic from lots.js
  const slots = await Slot.find({ lot_id: lot._id, is_active: true });
  const slotsWithStatus = await Promise.all(
    slots.map(async (s) => {
      const available = await isSlotFree(s._id, at, until);
      return { ...s.toJSON(), available };
    })
  );
  const availableCount = slotsWithStatus.filter((s) => s.available).length;

  return {
    ...lot.toJSON(),
    slots: slotsWithStatus,
    total_slots: slots.length,
    available_slots: availableCount,
  };
}

async function handleGetUserBookings(req) {
  const bookings = await Booking.find({ user_id: req.user.id }).sort({ start_time: -1 });

  return Promise.all(
    bookings.map(async (b) => {
      const lot = await ParkingLot.findById(b.lot_id);
      const slot = await Slot.findById(b.slot_id);
      return {
        ...b.toJSON(),
        lot_name: lot ? lot.name : "Unknown",
        lot_address: lot ? lot.address : "",
        slot_label: slot ? slot.label : "",
      };
    })
  );
}

async function handleCreateBooking(args, req) {
  const { lot_id, slot_id, start_time, end_time, license_plate } = args;

  const start = new Date(start_time);
  const end = new Date(end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { error: "end_time must be after start_time" };
  }
  const minutes = (end - start) / (1000 * 60);
  if (minutes < 15) {
    return { error: "Minimum booking length is 15 minutes" };
  }
  if (start < new Date(Date.now() - 5 * 60 * 1000)) {
    return { error: "start_time cannot be in the past" };
  }

  const slot = await Slot.findOne({ _id: slot_id, lot_id });
  if (!slot || !slot.is_active) {
    return { error: "Slot not found" };
  }
  const lot = await ParkingLot.findById(lot_id);
  if (!lot) return { error: "Parking lot not found" };

  if (!(await isSlotFree(slot_id, start.toISOString(), end.toISOString()))) {
    return { error: "This slot is already booked for part of that time window" };
  }

  const hours = (end - start) / (1000 * 60 * 60);
  const price = Math.round(hours * lot.price_per_hour * 100) / 100;

  const booking = await Booking.create({
    user_id: req.user.id,
    lot_id,
    slot_id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    price,
    license_plate: license_plate || null,
  });

  // Emit socket update
  const io = req.app.get("io");
  if (io) {
    io.to(`lot:${lot_id}`).emit("slot-status-changed", {
      lot_id,
      slot_id,
      available: await isSlotFree(slot_id, new Date().toISOString(), new Date().toISOString()),
    });
  }

  return { booking };
}

async function handleCancelBooking(args, req) {
  const booking = await Booking.findById(args.booking_id);
  if (!booking || booking.user_id !== req.user.id) {
    return { error: "Booking not found" };
  }
  if (booking.status !== "active") {
    return { error: "Only active bookings can be cancelled" };
  }

  booking.status = "cancelled";
  await booking.save();

  // Emit socket update
  const io = req.app.get("io");
  if (io) {
    io.to(`lot:${booking.lot_id}`).emit("slot-status-changed", {
      lot_id: booking.lot_id,
      slot_id: booking.slot_id,
      available: await isSlotFree(booking.slot_id, new Date().toISOString(), new Date().toISOString()),
    });
  }

  return { ok: true };
}

async function handleGetUserSubscriptions(req) {
  const subs = await Subscription.find({ user_id: req.user.id }).sort({ start_date: -1 });

  return Promise.all(
    subs.map(async (s) => {
      const lot = await ParkingLot.findById(s.lot_id);
      const slot = await Slot.findById(s.slot_id);
      return {
        ...s.toJSON(),
        lot_name: lot ? lot.name : "Unknown",
        lot_address: lot ? lot.address : "",
        slot_label: slot ? slot.label : "",
      };
    })
  );
}

async function handleCreateSubscription(args, req) {
  const { lot_id, slot_id, start_date, months } = args;

  const lot = await ParkingLot.findById(lot_id);
  if (!lot) return { error: "Parking lot not found" };
  if (!lot.monthly_price) {
    return { error: "This parking lot does not offer monthly subscriptions" };
  }
  const slot = await Slot.findOne({ _id: slot_id, lot_id });
  if (!slot) return { error: "Slot not found" };

  const start = new Date(start_date);
  if (Number.isNaN(start.getTime())) {
    return { error: "Invalid start_date" };
  }
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  if (!(await isSlotFree(slot_id, start.toISOString(), end.toISOString()))) {
    return { error: "This slot is not free for the entire requested period" };
  }

  const totalPrice = Math.round(lot.monthly_price * months * 100) / 100;
  const subscription = await Subscription.create({
    user_id: req.user.id,
    lot_id,
    slot_id,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    monthly_price: totalPrice,
  });

  // Emit socket update
  const io = req.app.get("io");
  if (io) {
    io.to(`lot:${lot_id}`).emit("slot-status-changed", {
      lot_id,
      slot_id,
      available: await isSlotFree(slot_id, new Date().toISOString(), new Date().toISOString()),
    });
  }

  return { subscription };
}

// --- ROUTE ---

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

    // Handle tool calls (can be multiple in a chain)
    while (choiceMessage.tool_calls && choiceMessage.tool_calls.length > 0) {
      for (const toolCall of choiceMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          args = {};
        }

        let toolResult = null;

        switch (toolName) {
          case "search_lots":
            toolResult = await handleSearchLots(args, lat, lng);
            lots = toolResult; // Keep for response
            break;
          case "get_lot_details":
            toolResult = await handleGetLotDetails(args);
            break;
          case "get_user_bookings":
            toolResult = await handleGetUserBookings(req);
            break;
          case "create_booking":
            toolResult = await handleCreateBooking(args, req);
            break;
          case "cancel_booking":
            toolResult = await handleCancelBooking(args, req);
            break;
          case "get_user_subscriptions":
            toolResult = await handleGetUserSubscriptions(req);
            break;
          case "create_subscription":
            toolResult = await handleCreateSubscription(args, req);
            break;
          default:
            toolResult = { error: `Unknown tool: ${toolName}` };
        }

        // Summarize search_lots results for the model
        if (toolName === "search_lots" && toolResult && Array.isArray(toolResult)) {
          const summary = toolResult.slice(0, 8).map((l) => ({
            name: l.name,
            address: l.address,
            distance_km: l.distance_km,
            price_per_hour: l.price_per_hour,
            has_shade: l.has_shade,
            available_slots: l.available_slots,
            total_slots: l.total_slots,
          }));
          toolResult = { count: toolResult.length, lots: summary };
        }

        messages.push(choiceMessage);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(toolResult),
        });
      }

      // Get next response from model
      data = await callGroq(messages);
      choiceMessage = data.choices[0].message;
    }

    const replyText = (choiceMessage.content || "").trim();

    res.json({
      reply: replyText || "Here's what I found.",
      lots: lots ? lots.slice(0, 8) : null,
      history: [...messages, choiceMessage],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
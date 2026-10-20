import { test, expect, type APIRequestContext } from "@playwright/test";

const apiBase = (process.env.E2E_API_BASE_URL ?? "https://kuraliupdates-bazaar.onrender.com/api/v1").replace(/\/$/, "");
const enabled = process.env.E2E_ENVIRONMENT === "staging"
  && process.env.E2E_TRANSACTIONAL_FLOWS_ENABLED === "true"
  && apiBase === "https://kuraliupdates-bazaar.onrender.com/api/v1";

function required(name: string): string {
  const value = (process.env[name] ?? "").trim();
  if (!value) throw new Error("Missing required transactional E2E fixture: " + name);
  return value;
}
function syntheticId(name: string): string {
  const value = required(name);
  if (!/^E2E-[A-Za-z0-9_-]{3,80}$/.test(value)) {
    throw new Error(name + " must be a run-scoped synthetic ID beginning E2E-; refusing to mutate non-test data.");
  }
  return value;
}
function auth(token: string) {
  return { Authorization: "Bearer " + token, "Content-Type": "application/json", "Cache-Control": "no-store" };
}
async function flowToken(request: APIRequestContext, role: string, identityVariable: string): Promise<string> {
  const sharedSecret = required("E2E_FLOW_AUTH_TOKEN");
  const identifier = required(identityVariable);
  const response = await request.post(apiBase + "/e2e/auth/token", {
    headers: { "X-E2E-Flow-Token": sharedSecret, "Content-Type": "application/json", "Cache-Control": "no-store" },
    data: { role, identifier },
    timeout: 15_000,
  });
  expect(response.status(), "staging E2E token exchange for role " + role + " should succeed").toBe(200);
  const body = await response.json() as { token?: string; authenticated?: boolean; role?: string };
  expect(body.authenticated).toBe(true);
  expect(body.role).toBe(role === "PROVIDER" ? "PROFESSIONAL" : role);
  expect(typeof body.token).toBe("string");
  expect(body.token!.length).toBeGreaterThan(20);
  return body.token!;
}
async function getJson(request: APIRequestContext, path: string, token: string) {
  const response = await request.get(apiBase + path, { headers: auth(token), timeout: 20_000 });
  expect(response.status(), path + " should be readable").toBe(200);
  return response.json();
}

test.describe("Guarded transactional order and Daily Help lifecycle E2E", () => {
  test.skip(!enabled, "Mutating lifecycle tests require explicit staging-only opt-in and run-scoped synthetic fixtures.");

  test("order: buyer checkout → seller fulfilment → delivery claim and OTP → cross-role reconciliation", async ({ request }) => {
    test.setTimeout(120_000);
    const buyerToken = await flowToken(request, "BUYER", "E2E_BUYER_IDENTITY");
    const sellerToken = await flowToken(request, "SELLER", "E2E_SELLER_IDENTITY");
    const deliveryToken = await flowToken(request, "DELIVERY", "E2E_DELIVERY_IDENTITY");
    const productId = syntheticId("E2E_FLOW_PRODUCT_ID");
    const sellerId = syntheticId("E2E_FLOW_SELLER_ID");
    const agentId = syntheticId("E2E_FLOW_DELIVERY_AGENT_ID");
    const quantity = Number(required("E2E_FLOW_ORDER_QUANTITY"));
    expect(Number.isInteger(quantity) && quantity > 0 && quantity <= 2,
      "Keep E2E order quantities small and deterministic").toBeTruthy();

    const beforeProducts = await getJson(request, "/buyers/products/search?query=" + encodeURIComponent(productId), buyerToken);
    const product = beforeProducts.find((p: any) => p.productId === productId);
    expect(product, "the allowlisted synthetic product must be visible").toBeTruthy();
    expect(product.sellerId ?? product.seller?.sellerId).toBe(sellerId);
    expect(Number(product.stock)).toBeGreaterThanOrEqual(quantity);

    // Exercise the real buyer → seller negotiation path before checkout. The
    // accepted offer ID, not a client-supplied price alone, authorizes the cart price.
    const catalogPrice = Number(product.effectivePrice ?? product.price ?? product.sellerPrice);
    expect(Number.isFinite(catalogPrice) && catalogPrice > 0, "synthetic product must have a valid catalogue price").toBeTruthy();
    const buyerOfferPrice = Math.round(catalogPrice * 0.90 * 100) / 100;
    const counterPrice = Math.round(catalogPrice * 0.95 * 100) / 100;
    expect(counterPrice).toBeGreaterThan(buyerOfferPrice);
    expect(counterPrice).toBeLessThan(catalogPrice);

    const openChatResponse = await request.post(apiBase + "/negotiations", {
      headers: auth(buyerToken),
      data: { productId, startingOfferPrice: buyerOfferPrice, openingMessage: "E2E synthetic bargaining conversation" },
      timeout: 20_000,
    });
    expect(openChatResponse.status(), "buyer opens a conversation for the synthetic product").toBe(200);
    const openedChat = await openChatResponse.json();
    const chatId = String(openedChat.id ?? "");
    expect(chatId).toMatch(/^chat-/);
    expect(openedChat.sellerId).toBe(sellerId);
    const openingOffer = (openedChat.messages ?? []).find((message: any) =>
      message.senderRole === "buyer" && message.offer?.status === "pending"
    );
    expect(openingOffer, "opening buyer offer should be persisted").toBeTruthy();

    const sellerInbox = await getJson(request, "/negotiations?role=SELLER", sellerToken);
    expect(sellerInbox.filter((chat: any) => chat.id === chatId), "the correct seller receives the conversation exactly once").toHaveLength(1);

    const counterResponse = await request.post(
      apiBase + "/negotiations/" + encodeURIComponent(chatId) + "/offers/" + encodeURIComponent(openingOffer.offer.id) + "/respond",
      { headers: { ...auth(sellerToken), "X-Active-Role": "SELLER" }, data: { action: "COUNTER", counterPrice }, timeout: 20_000 },
    );
    expect(counterResponse.status(), "seller can counter the buyer's offer").toBe(200);
    const counteredChat = await counterResponse.json();
    const sellerCounter = (counteredChat.messages ?? []).find((message: any) =>
      message.senderRole === "seller" && message.offer?.status === "pending" && Number(message.offer.offeredPrice) === counterPrice
    );
    expect(sellerCounter, "seller counter-offer should reach the buyer").toBeTruthy();

    const acceptResponse = await request.post(
      apiBase + "/negotiations/" + encodeURIComponent(chatId) + "/offers/" + encodeURIComponent(sellerCounter.offer.id) + "/respond",
      { headers: { ...auth(buyerToken), "X-Active-Role": "BUYER" }, data: { action: "ACCEPT" }, timeout: 20_000 },
    );
    expect(acceptResponse.status(), "buyer can accept the seller counter-offer").toBe(200);
    const agreedChat = await acceptResponse.json();
    expect(Number(agreedChat.currentAgreedPrice)).toBe(counterPrice);
    expect(String(agreedChat.currentAgreedOfferId)).toBe(String(sellerCounter.offer.id));

    // A later rejected offer must not replace the accepted price.
    const lowerOfferPrice = buyerOfferPrice;
    const lowerOfferResponse = await request.post(apiBase + "/negotiations/" + encodeURIComponent(chatId) + "/messages", {
      headers: { ...auth(buyerToken), "X-Active-Role": "BUYER" },
      data: { text: "Can you do a lower price?", offerPrice: lowerOfferPrice },
      timeout: 20_000,
    });
    expect(lowerOfferResponse.status()).toBe(200);
    const lowerOfferChat = await lowerOfferResponse.json();
    const lowerOffer = (lowerOfferChat.messages ?? []).find((message: any) =>
      message.senderRole === "buyer" && message.offer?.status === "pending" && Number(message.offer.offeredPrice) === lowerOfferPrice
    );
    expect(lowerOffer).toBeTruthy();
    const rejectResponse = await request.post(
      apiBase + "/negotiations/" + encodeURIComponent(chatId) + "/offers/" + encodeURIComponent(lowerOffer.offer.id) + "/respond",
      { headers: { ...auth(sellerToken), "X-Active-Role": "SELLER" }, data: { action: "REJECT" }, timeout: 20_000 },
    );
    expect(rejectResponse.status(), "seller can reject a subsequent offer").toBe(200);
    const rejectedChat = await rejectResponse.json();
    expect(Number(rejectedChat.currentAgreedPrice)).toBe(counterPrice);
    expect(String(rejectedChat.currentAgreedOfferId)).toBe(String(sellerCounter.offer.id));

    const catalogBeforeCheckout = await getJson(request, "/buyers/products/search?query=" + encodeURIComponent(productId), buyerToken);
    const productBeforeCheckout = catalogBeforeCheckout.find((p: any) => p.productId === productId);
    expect(Number(productBeforeCheckout?.effectivePrice ?? productBeforeCheckout?.price ?? productBeforeCheckout?.sellerPrice)).toBe(catalogPrice);

    const placedResponse = await request.post(apiBase + "/buyers/orders", {
      headers: auth(buyerToken),
      data: {
        buyerName: "E2E Synthetic Buyer", buyerPhone: required("E2E_FLOW_BUYER_PHONE"),
        buyerEmail: required("E2E_FLOW_BUYER_EMAIL"), deliveryAddress: "E2E Test Address - do not deliver",
        deliveryLocality: "Kurali", sellerId, subtotal: 0, discountAmount: 0, deliveryFee: 0,
        finalPayable: 0, paymentMethod: "COD", distanceKm: 1,
        items: [{ productId, quantity, negotiatedPrice: counterPrice, acceptedOfferId: sellerCounter.offer.id }]
      },
      timeout: 20_000,
    });
    expect(placedResponse.status(), "synthetic COD checkout should succeed").toBe(200);
    const placement = await placedResponse.json();
    const order = placement.order ?? placement;
    const orderId = String(order.orderId ?? "");
    expect(orderId).toMatch(/^ORD-KUR-[A-F0-9-]+$/i);
    expect(order.status).toBe("PLACED");
    expect(order.items, "checkout response should contain the authoritative negotiated line item").toHaveLength(1);
    expect(Number(order.items[0].unitPrice)).toBe(counterPrice);
    expect(Number(order.items[0].negotiatedPrice)).toBe(counterPrice);
    expect(Number(order.items[0].totalPrice)).toBe(counterPrice * quantity);

    const catalogAfterCheckout = await getJson(request, "/buyers/products/search?query=" + encodeURIComponent(productId), buyerToken);
    const productAfterCheckout = catalogAfterCheckout.find((p: any) => p.productId === productId);
    expect(Number(productAfterCheckout?.effectivePrice ?? productAfterCheckout?.price ?? productAfterCheckout?.sellerPrice),
      "accepted bargaining price must affect this order only, never catalogue price").toBe(catalogPrice);
    expect(Number(productAfterCheckout?.stock ?? productAfterCheckout?.stockQty)).toBe(Number(product.stock ?? product.stockQty) - quantity);
    expect(order.paymentStatus).toBe("PENDING_COD");
    expect(String(placement.deliveryOtp ?? "")).toMatch(/^\d{4}$/);

    const history = await getJson(request, "/buyers/me/orders", buyerToken);
    expect(history.filter((x: any) => x.orderId === orderId)).toHaveLength(1);

    for (const status of ["ACCEPTED_BY_SELLER", "READY_FOR_PICKUP"]) {
      const update = await request.post(apiBase + "/sellers/me/orders/" + encodeURIComponent(orderId) + "/status?status=" + status, {
        headers: auth(sellerToken), timeout: 20_000,
      });
      expect(update.status(), "seller transition " + status).toBe(200);
      expect((await update.json()).status).toBe(status);
    }
    const sellerOrders = await getJson(request, "/sellers/me/orders", sellerToken);
    expect(sellerOrders.filter((x: any) => x.orderId === orderId)).toHaveLength(1);

    const claim = await request.post(apiBase + "/delivery/jobs/" + encodeURIComponent(orderId) + "/claim?agentId=" + encodeURIComponent(agentId), {
      headers: auth(deliveryToken), timeout: 20_000,
    });
    expect(claim.status(), "active synthetic agent claims the ready order").toBe(200);
    expect((await claim.json()).status).not.toBe("DELIVERED");

    const invalidOtp = await request.post(apiBase + "/delivery/jobs/" + encodeURIComponent(orderId) + "/verify-otp", {
      headers: auth(deliveryToken), data: { otp: "0000" === placement.deliveryOtp ? "9999" : "0000" }, timeout: 20_000,
    });
    expect([400, 409].includes(invalidOtp.status()), "invalid OTP must not complete delivery").toBeTruthy();
    const tracked = await getJson(request, "/buyers/orders/" + encodeURIComponent(orderId) + "/track", buyerToken);
    expect(tracked.status).not.toBe("DELIVERED");

    const validOtp = await request.post(apiBase + "/delivery/jobs/" + encodeURIComponent(orderId) + "/verify-otp", {
      headers: auth(deliveryToken), data: { otp: placement.deliveryOtp }, timeout: 20_000,
    });
    expect(validOtp.status(), "valid OTP completes the synthetic delivery").toBe(200);
    const finalTrack = await getJson(request, "/buyers/orders/" + encodeURIComponent(orderId) + "/track", buyerToken);
    expect(finalTrack.status).toBe("DELIVERED");
    expect((await getJson(request, "/buyers/me/orders", buyerToken)).filter((x: any) => x.orderId === orderId)).toHaveLength(1);
    expect((await getJson(request, "/sellers/me/orders", sellerToken)).filter((x: any) => x.orderId === orderId)).toHaveLength(1);
  });

  test("Daily Help: buyer books synthetic slot → professional starts with OTP → completes → history reconciles", async ({ request }) => {
    test.setTimeout(120_000);
    const buyerToken = await flowToken(request, "BUYER", "E2E_BUYER_IDENTITY");
    const professionalToken = await flowToken(request, "PROVIDER", "E2E_PROVIDER_IDENTITY");
    const serviceId = syntheticId("E2E_FLOW_DAILY_HELP_SERVICE_ID");
    const slotId = syntheticId("E2E_FLOW_DAILY_HELP_SLOT_ID");
    const professionalId = syntheticId("E2E_FLOW_PROFESSIONAL_ID");
    const buyerPhone = required("E2E_FLOW_BUYER_PHONE");
    const buyerName = "E2E Synthetic Buyer";
    const address = "E2E Test Address - do not visit";
    const scheduledStart = required("E2E_FLOW_DAILY_HELP_START");
    const requestedHours = Number(required("E2E_FLOW_DAILY_HELP_HOURS"));
    expect(Number.isFinite(Date.parse(scheduledStart))).toBeTruthy();
    expect(requestedHours >= 1 && requestedHours <= 2).toBeTruthy();

    const bookingResponse = await request.post(apiBase + "/daily-help/bookings", {
      headers: auth(buyerToken),
      data: { serviceId, buyerName, buyerPhone, address, locality: "Kurali", scheduledStart, requestedHours, slotId },
      timeout: 20_000,
    });
    expect(bookingResponse.status(), "booking an allowlisted synthetic slot").toBe(200);
    const booking = await bookingResponse.json();
    const bookingId = String(booking.id ?? "");
    expect(bookingId).toMatch(/^DH-KUR-[A-F0-9-]+$/i);
    expect(booking.status).toBe("PROFESSIONAL_ASSIGNED");
    expect(booking.professionalId).toBe(professionalId);
    expect(Number(booking.estimatedTotal)).toBeGreaterThan(0);

    for (const status of ["ARRIVING", "READY_TO_START"]) {
      const statusResponse = await request.post(apiBase + "/daily-help/bookings/" + encodeURIComponent(bookingId) + "/status", {
        headers: auth(professionalToken), data: { professionalId, status }, timeout: 20_000,
      });
      expect(statusResponse.status(), "professional status transition " + status).toBe(200);
    }
    const readyResponse = await request.get(apiBase + "/daily-help/bookings/" + encodeURIComponent(bookingId), {
      headers: auth(buyerToken), timeout: 20_000,
    });
    expect(readyResponse.status()).toBe(200);
    const readyBooking = await readyResponse.json();
    const startOtp = String(readyBooking.startOtp ?? "");
    expect(startOtp).toMatch(/^\d{4}$/);

    const invalidStart = await request.post(apiBase + "/daily-help/bookings/" + encodeURIComponent(bookingId) + "/start", {
      headers: auth(professionalToken), data: { professionalId, otp: startOtp === "0000" ? "9999" : "0000" }, timeout: 20_000,
    });
    expect([400, 409].includes(invalidStart.status()), "invalid start OTP must not start service").toBeTruthy();

    const startResponse = await request.post(apiBase + "/daily-help/bookings/" + encodeURIComponent(bookingId) + "/start", {
      headers: auth(professionalToken), data: { professionalId, otp: startOtp }, timeout: 20_000,
    });
    expect(startResponse.status(), "valid OTP starts the service timer").toBe(200);
    const started = await startResponse.json();
    expect(started.serviceStartedAt).toBeTruthy();

    const completeResponse = await request.post(apiBase + "/daily-help/bookings/" + encodeURIComponent(bookingId) + "/complete?professionalId=" + encodeURIComponent(professionalId), {
      headers: auth(professionalToken), timeout: 20_000,
    });
    expect(completeResponse.status()).toBe(200);
    const completed = await completeResponse.json();
    expect(completed.status).toBe("COMPLETED");
    expect(completed.serviceCompletedAt).toBeTruthy();

    const buyerReadBack = await request.get(apiBase + "/daily-help/bookings/" + encodeURIComponent(bookingId), {
      headers: auth(buyerToken), timeout: 20_000,
    });
    expect(buyerReadBack.status()).toBe(200);
    expect((await buyerReadBack.json()).status).toBe("COMPLETED");
  });
});

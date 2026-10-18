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
async function getJson(request: APIRequestContext, path: string, token: string) {
  const response = await request.get(apiBase + path, { headers: auth(token), timeout: 20_000 });
  expect(response.status(), path + " should be readable").toBe(200);
  return response.json();
}

test.describe("Guarded transactional order and Daily Help lifecycle E2E", () => {
  test.skip(!enabled, "Mutating lifecycle tests require explicit staging-only opt-in and run-scoped synthetic fixtures.");

  test("order: buyer checkout → seller fulfilment → delivery claim and OTP → cross-role reconciliation", async ({ request }) => {
    test.setTimeout(120_000);
    const buyerToken = required("E2E_FLOW_BUYER_TOKEN");
    const sellerToken = required("E2E_FLOW_SELLER_TOKEN");
    const deliveryToken = required("E2E_FLOW_DELIVERY_TOKEN");
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

    const placedResponse = await request.post(apiBase + "/buyers/orders", {
      headers: auth(buyerToken),
      data: {
        buyerName: "E2E Synthetic Buyer", buyerPhone: required("E2E_FLOW_BUYER_PHONE"),
        buyerEmail: required("E2E_FLOW_BUYER_EMAIL"), deliveryAddress: "E2E Test Address - do not deliver",
        deliveryLocality: "Kurali", sellerId, subtotal: 0, discountAmount: 0, deliveryFee: 0,
        finalPayable: 0, paymentMethod: "COD", distanceKm: 1,
        items: [{ productId, quantity }]
      },
      timeout: 20_000,
    });
    expect(placedResponse.status(), "synthetic COD checkout should succeed").toBe(200);
    const placement = await placedResponse.json();
    const order = placement.order ?? placement;
    const orderId = String(order.orderId ?? "");
    expect(orderId).toMatch(/^ORD-KUR-[A-F0-9-]+$/i);
    expect(order.status).toBe("PLACED");
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
    const buyerToken = required("E2E_FLOW_BUYER_TOKEN");
    const professionalToken = required("E2E_FLOW_PROVIDER_TOKEN");
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

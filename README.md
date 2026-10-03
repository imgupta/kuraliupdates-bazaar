# KuraliUpdates Bazaar (`kuraliupdates.com` / `kuraliupdate.com`)

Hyperlocal eCommerce, merchant empowerment, and fast 25-minute delivery ecosystem for **Kurali City (Punjab)**.

## 🚀 Key Platform Features

- **Merchant Registration & Admin Approval**:
  - Local Kurali shopkeepers submit shop information, category, locality, and license.
  - New stores enter a pending state until approved by the City Admin Desk.
  - Gmail authentication for shopkeepers to manage their storefront.

- **Inventory, Pricing & Discounts Architecture**:
  - Upload products with printed **MRP**, base **Seller Price**, and **Additional Discount (%)**.
  - Automatic calculation of effective buyer prices and rupee savings.
  - **Bill-level Discounts**: Milestones for orders (e.g., 5% off over ₹500, flat ₹100 off over ₹1,200).
  - **Custom Store Coupons**: Promo codes (e.g. `KURALI50`, `WELCOME10`) with minimum order value rules.

- **Buyer Experience, Price Match & Live Bargaining**:
  - **Compare Sellers for Lowest Price & Distance**: Side-by-side comparison matrix of Kurali merchants carrying the item.
  - **Real-Time Price Bargaining Chat**: Direct negotiation between buyer and seller with preset percentage offers and instant *"Add to Cart at Negotiated Price"*.
  - **Free Express Delivery Progress**: Dynamic cart threshold bar unlocking free delivery when minimum basket value is reached.
  - **Secure Payments**: UPI (GPay/PhonePe/Paytm QR), Cards, and Cash on Delivery.
  - **Live Order & Rider Tracking**: Visual map tracking with ETA, rider phone contact, and a 4-digit security OTP.

- **Delivery Fleet (Kurali Express)**:
  - Driver onboarding (Vehicle type, license plate, Kurali sector).
  - Price-based Delivery Jobs Board with payout offers (₹45 – ₹95+).
  - Step-by-step pickup & delivery completion via OTP verification.
  - Daily & all-time earnings dashboard with instant withdrawal simulation.

- **Admin Operations & Visual Analytics**:
  - Review & 1-click Approve/Reject pending seller applications.
  - Visual charts showing trending search queries in Kurali with volume, growth, and locality hotspots.
  - Market share segmented bars & revenue metrics across categories.
  - 24-hour city shopping activity curve.

---

## 🛠️ Local Development & Build

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

---

## 🌐 Custom Domain Setup (`kuraliupdates.com` / `kuraliupdate.com`)

### Option A: Vercel (Recommended - Zero Configuration)
1. Push your repository to GitHub (see steps below).
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"** -> Import this Git repository.
3. Keep Framework Preset as **Vite** and click **Deploy**.
4. In your Vercel Project Settings &rarr; **Domains**:
   - Add `kuraliupdates.com` and `www.kuraliupdates.com` (or `kuraliupdate.com`).
5. Add these DNS records at your domain registrar (GoDaddy, Namecheap, Hostinger, etc.):
   - **Type A**: `@` &rarr; `76.76.21.21`
   - **Type CNAME**: `www` &rarr; `cname.vercel-dns.com`
   - SSL certificates are issued automatically within minutes.

### Option B: Cloudflare Pages
1. In Cloudflare Dashboard, go to **Workers & Pages** &rarr; **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
2. Build Settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
3. In **Custom Domains**, add `kuraliupdates.com`. Cloudflare automatically handles DNS routing and SSL.

### Option C: Google Cloud Run (Hosting on GCP)
If using the AI Studio Cloud Run service:
1. Open Google Cloud Console &rarr; **Cloud Run** &rarr; select service.
2. Click **Manage Custom Domains** &rarr; **Add Mapping**.
3. Select domain `kuraliupdates.com` and add the provided DNS records at your domain registrar.

---

## 📦 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Animation & Effects**: Canvas Confetti, CSS keyframes
- **State & Storage**: React Context + Reactive LocalStorage sync

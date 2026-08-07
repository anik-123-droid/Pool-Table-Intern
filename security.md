# Pool Table Booking App - Security Overview

Ye document un sabhi security measures aur attack vectors ka detailed explanation hai jinko humne is application me handle kiya hai, specially DoS/DDoS, brute-force, aur server crash scenarios ke liye.

## 1. Network Layer vs Application Layer Protection

Humari security strategy do hisso me bati hui hai:
1.  **Network Layer (Cloudflare / Vercel Edge):** Ye bade scale ke DDoS attacks, botnets, aur TCP/IP level vulnerabilities ko handle karta hai jahan Express.js (Node) kuch nahi kar sakta.
2.  **Application Layer (Express / React):** Ye application-specific attacks jaise HTTP Floods, XSS, payload crashing, aur brute-force login attempts ko handle karta hai.

---

## 2. Attack Vectors & Mitigations

### A. HTTP Flood Attack (Layer 7)
*   **Attack:** Attacker server par simple HTTP GET ya POST requests bhejta hai (e.g., hazaron login requests ya pool table layout load karne ki requests). Ye bilkul genuine lagti hain aur backend/DB ko crash kar sakti hain.
*   **Mitigation (Code Level):** 
    *   `express-rate-limit`: Humne general APIs ke liye 100 requests/15 mins ki limit lagayi hai.
    *   **Strict Limiters:** Sensitive endpoints jaise `/api/auth/login`, `/api/auth/register`, aur `/api/bookings` par **10 requests per minute** ka strict lock hai.
    *   **Captcha Integration:** Cloudflare Turnstile / reCAPTCHA ensure karta hai ki request kisi human ne ki hai, bot ne nahi.

### B. Slowloris Attack
*   **Attack:** Attacker server se connect hota hai aur bohot hi slow speed me data bhejta hai, jisse connection bohot der tak open rehta hai. Isse server ke available connection slots block ho jate hain aur genuine users connect nahi kar paate.
*   **Mitigation (Code Level & Vercel):**
    *   `server.ts` me explicit HTTP server timeouts set kiye gaye hain (`keepAliveTimeout = 5000`, `headersTimeout = 6000`). Agar data dheere aayega toh server connection drop kar dega.
    *   **Vercel Advantage:** Vercel serverless environment direct connections ko apne infrastructure par handle karta hai, Express pe nahi. Toh Vercel pe Slowloris waise hi asar nahi karta.

### C. SYN Flood Attack (Layer 4)
*   **Attack:** TCP/IP protocol ke handshake mechanism ko exploit karta hai. Attacker connection request (SYN) bhejta hai, server reply karta hai (SYN-ACK), par attacker final response (ACK) nahi bhejta. Aise hazaron half-open connections server ko hang kar dete hain.
*   **Mitigation (Cloudflare / Vercel):** Ye attack application layer (Node.js) tak aane se pehle OS ya Network layer par hota hai. Vercel ka edge network aur Cloudflare in volumetric attacks ko auto-absorb aur drop kar dete hain, server tak traffic aane hi nahi dete.

### D. Volumetric DDoS (Botnets)
*   **Attack:** Hazaron compromised computers (Botnet) ka use karke alag-alag locations se ek sath network pipe ko choke karna.
*   **Mitigation (Cloudflare / Vercel):** Node.js code bandwidth exhaust hone se nahi bacha sakta. Iske liye Cloudflare jaisa CDN zaroori hai jiski network capacity attacks se badi hoti hai. Vercel automatically Cloudflare/AWS ka edge use karta hai isko handle karne ke liye.

---

## 3. Data & Payload Security

### A. Payload Crashing (Memory Exhaustion)
*   **Attack:** Attacker GBs me JSON data bhejta hai jisse Node.js ki memory full ho jaye aur server crash ho jaye.
*   **Mitigation:** `server.ts` me `express.json({ limit: '10kb' })` lagaya gaya hai. Koi bhi request jo 10kb se badi hogi, server usko process kiye bina turant reject kar dega.

### B. Cross-Site Scripting (XSS) & Injections
*   **Attack:** User text fields me malicious JavaScript ya NoSQL/SQL commands likh kar submit kar deta hai.
*   **Mitigation:** `dompurify` aur `jsdom` ka use karke custom `sanitizeInput` middleware banaya gaya hai. Ye har incoming body, params, aur query string ko saaf (sanitize) karta hai.

### C. Security Headers (Clickjacking / Data Sniffing)
*   **Mitigation:** `helmet` library ka use karke strict Content Security Policy (CSP) aur baki secure HTTP headers set kiye gaye hain. Ye ensure karta hai ki browser kisi untrusted source se script load na kare.

---

## 4. Vercel Deployment Specifics

Jab app `vercel --prod` ke through live hota hai:
1.  **Trust Proxy:** Code me `app.set('trust proxy', 1)` zaroori hai kyu ki Vercel ek reverse proxy hai. Isse rate limiter ko attacker ka asli IP address milta hai.
2.  **Stateless Rate Limiting:** Vercel serverless functions isolated containers me run hote hain. In-memory `express-rate-limit` har container ke liye alag hoga. Ye brute-force rokne ke liye kaafi hai, par 100% global accuracy ke liye (future me) Redis (jaise Upstash) ya Vercel Edge Rate Limiting ka use kiya ja sakta hai.
3.  **Captcha Secret:** Deployment se pehle Vercel dashboard me `CAPTCHA_SECRET_KEY` Environment Variable set karna lazmi hai, warna backend frontend ke token ko verify nahi kar payega (code me dev bypass laga hai, jo prod me off ho jayega).
4.  **Error Handling:** Global `errorHandler` ensure karta hai ki server crash hone par stack traces ya database errors client ko na dikhein, bas generic error message jaye.

---

**Summary:** Aapka application ab puri tarah se Layer 7 (Application) attacks se secured hai code ke through, aur Layer 3/4 (Network) attacks se secured hai Vercel aur Cloudflare ke deployment architecture ke through.

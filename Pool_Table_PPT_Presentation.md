# 🎱 Pool Table Booking & Management System
## Presentation Deck (Slide-by-Slide Detailed Guide)

---

## 📊 Slide Overview Map

| Slide # | Slide Title | Key Focus Area |
| :--- | :--- | :--- |
| **Slide 1** | Title Slide | Project Name, Subtitle, Tech Highlights & Presenter Info |
| **Slide 2** | Problem Statement & Solution | Challenges in Traditional Lounges vs. Our Digital Ecosystem |
| **Slide 3** | Core Features - Player Experience | Interactive Booking, 2D Floor Plan, Snack Bar & Loyalty |
| **Slide 4** | Core Features - Admin Dashboard | Virtual 2D Room Designer, Table & Tournament Management |
| **Slide 5** | System Architecture & Tech Stack | React, Node.js/Express, TypeScript, PostgreSQL & Prisma |
| **Slide 6** | Enterprise Security Architecture | DDoS Protection, Rate Limiting, XSS Sanitization & MFA |
| **Slide 7** | Database Schema & Data Models | Prisma Relational Architecture & Key Entities |
| **Slide 8** | Live User & Admin Workflow | End-to-End Walkthrough of Booking & Admin Control |
| **Slide 9** | Future Scope & Roadmap | WebSockets, Payment Gateway, AI Dynamic Pricing & Mobile App |
| **Slide 10** | Conclusion & Q&A | Project Summary, Value Delivered & Thank You |

---

## 🖼️ Slide-by-Slide Content & Design Guide

### Slide 1: Title Slide
* **Slide Title**: 8-Ball Haven — Smart Pool Table Booking & Lounge Management System
* **Subtitle**: Full-Stack Web Application with Interactive 2D Room Designer, Integrated Snack Bar & Multi-Layered Security
* **Key Content**:
  * **Project Type**: Full-Stack Web Platform (React + Express + PostgreSQL)
  * **Domain**: Hospitality & Sports/Billiards Club Management
  * **Presented By**: [Your Name / Team Name]
* **🎨 PPT Layout & Visual Tips**:
  * Dark theme background (Deep Slate/Navy `#0f172a` with Emerald `#10b880` or Electric Cyan highlights).
  * Add a 3D Pool Table render or high-res cue/ball graphic on the right side.
* **🗣️ Speaker Notes (Kya Bolna Hai)**:
  > *"Good morning/afternoon everyone. Today I'm excited to present our project — the Pool Table Booking & Management System. It's an end-to-end full-stack solution built to digitize and automate billiards lounge operations, offering seamless real-time table reservations, an interactive 2D room designer for club managers, an integrated snack bar, and enterprise-grade security."*

---

### Slide 2: Problem Statement & Solution
* **Slide Title**: Problem Statement & Project Vision
* **Header**: Why Traditional Lounge Operations Fail & How We Fix It
* **Key Content**:
  * 🔴 **The Challenges (Traditional System)**:
    * Manual paper/call reservations causing **double-bookings** & scheduling conflicts.
    * No visual layout for players to choose specific preferred tables.
    * Disconnected snack bar ordering leading to lost revenues.
    * Manual tournament registration & waitlist tracking chaos.
  * 🟢 **Our Solution (Digital Ecosystem)**:
    * **Automated Slot Engine**: Zero double bookings with instant conflict checks.
    * **Interactive 2D Visual Map**: Real-time table status and placement.
    * **Unified Food & Equipment Ordering**: Order cues & snacks in a single checkout.
    * **Automated Waitlists & Tournaments**: Instant notifications when tables free up.
* **🎨 PPT Layout & Visual Tips**:
  * Use a **Split Screen Layout**: Left side in subtle red/grey (Problems), Right side in glowing green/blue (Solutions).
* **🗣️ Speaker Notes**:
  > *"Traditional pool halls and snooker clubs rely on phone calls, WhatsApp messages, or physical registers. This creates slot overlaps, customer frustration, and revenue leaks. Our platform replaces manual effort with an automated digital ecosystem that unifies table bookings, food ordering, and room management in one screen."*

---

### Slide 3: Core Features — Player / Customer Experience
* **Slide Title**: User Portal — Seamless Booking & Experience
* **Header**: Empowering Players with Control & Convenience
* **Key Content**:
  * 🎱 **Interactive 2D Floor Plan Viewer**: Visual representation of the lounge floor with active table availability.
  * 📅 **Smart Slot Booking**: Custom duration selection, start/end time verification, and cue/equipment add-ons.
  * 🍿 **Snack Bar Integration**: Order food and beverages directly linked to active booking sessions.
  * ⏳ **Automated Waitlist**: Queue system that notifies users automatically via email/SMS when tables free up.
  * 👤 **Player Profile & Stats**: Track wins/losses, rating, hours played, and loyalty tier status.
* **🎨 PPT Layout & Visual Tips**:
  * 3 to 4 feature cards with modern icons (Table, Calendar, Pizza, Trophy).
  * Include a mockup screenshot of the User Home Page / Booking Modal.
* **🗣️ Speaker Notes**:
  > *"From the player’s perspective, booking a table is as simple as ordering a cab. They can view the lounge layout in 2D, pick their exact table, reserve time slots, add premium cues or snacks, and track their gaming stats and loyalty points over time."*

---

### Slide 4: Core Features — Admin Dashboard & 2D Room Designer
* **Slide Title**: Admin Portal — Total Lounge Command Center
* **Header**: Real-Time Analytics & Drag-and-Drop Floor Layout Customization
* **Key Content**:
  * 🎨 **Interactive 2D Virtual Room Designer**:
    * Drag-and-drop table positioning (X, Y coordinates).
    * Table rotation, custom dimensions, and felt color styling.
  * 📊 **Lounge Analytics**: Real-time revenue reports, today's total bookings, active tables count, and occupancy rate metrics.
  * 🏆 **Tournament Manager**: Create & manage tournaments, entry fees, prize pools, and player rosters.
  * 📦 **Snack Bar & Inventory Control**: Track snack menu availability and get low-stock alerts.
* **🎨 PPT Layout & Visual Tips**:
  * Embed a screenshot of the Admin Table Management Canvas and Revenue Stats widgets.
  * Highlight the drag-and-drop capability using visual arrow annotations.
* **🗣️ Speaker Notes**:
  > *"For club admins, the highlight is our 2D Virtual Room Designer built on HTML5 Canvas. Admins can drag, rotate, and reposition tables to match their physical lounge floor plan in real-time. Additionally, admins get full revenue analytics, inventory tracking, and tournament management."*

---

### Slide 5: System Architecture & Tech Stack
* **Slide Title**: System Architecture & Technology Stack
* **Header**: Modern, Scalable & Type-Safe Full-Stack Stack
* **Key Content**:
  * **Frontend Layer**:
    * **React.js + Vite**: Fast UI rendering, stateful components, and quick HMR.
    * **Tailwind CSS + Framer Motion**: Modern sleek dark-mode UI with smooth micro-interactions.
    * **HTML5 Canvas API**: Custom rendering engine for interactive 2D table floor plans.
  * **Backend Layer**:
    * **Node.js + Express (TypeScript)**: Strictly typed RESTful APIs and middleware pipeline.
  * **Database & Data Layer**:
    * **PostgreSQL**: Robust relational database.
    * **Prisma ORM**: Type-safe database queries, schema migrations, and relational modeling.
  * **Deployment**: Vercel Serverless Platform + Cloudflare Edge CDN.
* **🎨 PPT Layout & Visual Tips**:
  * Diagram showing Client (React) ➔ REST API (Express TS) ➔ Prisma ORM ➔ PostgreSQL Database.
  * Use brand logos (React, TypeScript, Prisma, Tailwind, PostgreSQL).
* **🗣️ Speaker Notes**:
  > *"Our architecture uses a modern decoupled React frontend paired with a TypeScript Express backend. For data management, we chose PostgreSQL with Prisma ORM for complete type safety across the database layer. HTML5 Canvas powers our custom 2D rendering engine."*

---

### Slide 6: Enterprise-Grade Security Architecture
* **Slide Title**: Advanced Security & Cyber Defense Strategy
* **Header**: Protecting Against Layer 3/4 & Layer 7 Attacks
* **Key Content**:
  * 🛡️ **Application Layer Security (Express/Node.js)**:
    * **Rate Limiting (`express-rate-limit`)**: Strict 10 req/min limit on sensitive endpoints (`/login`, `/bookings`), 100 req/15min on general APIs.
    * **XSS & Injection Protection**: Custom middleware using `DOMPurify` & `JSDOM` to sanitize all incoming payloads.
    * **Payload Size Shield**: Strict `10KB` JSON limit to prevent memory crash / buffer overflow attacks.
    * **MFA & Account Lockout**: 2-Factor Auth (TOTP) and automatic lock after failed login attempts.
  * 🌐 **Network Layer Security (Cloudflare / Vercel Edge)**:
    * **Slowloris Defense**: Explicit HTTP Server timeouts (`keepAliveTimeout = 5s`).
    * **DDoS & SYN Flood Absorption**: Edge network filtering before traffic touches Node.js.
* **🎨 PPT Layout & Visual Tips**:
  * Visual shield or security architecture diagram dividing network-level vs application-level defense.
  * Use checkmark bullet points with bold highlight keywords.
* **🗣️ Speaker Notes**:
  > *"Security was a primary focus. We implemented a 2-tier security defense. Layer 7 application attacks like brute force and XSS are blocked in Node.js using strict rate limiting, DOMPurify sanitization, and payload caps. Layer 3 and Layer 4 DDoS floods are absorbed upstream by Cloudflare and Vercel Edge proxies."*

---

### Slide 7: Database Schema & Entity Relationships
* **Slide Title**: Database Architecture & Relational Design
* **Header**: Optimized Data Modeling with Prisma & PostgreSQL
* **Key Content**:
  * 👤 `User`: Stores auth details, MFA secrets, player rating, win/loss record, and loyalty tiers.
  * 🎱 `PoolTable`: Stores table number, size, base hourly price, status, and 2D canvas coordinates (`positionX`, `positionY`, `rotation`, `color`).
  * 📅 `Booking` & `BookingEquipment`: Manages reservation slots, duration, total pricing, and extra cues/equipment.
  * 🍕 `Order`, `OrderItem`, `MenuItem`: Relational mapping for snack bar orders linked to active table sessions.
  * 🏆 `Tournament`, `WaitlistEntry`, `Subscription`: Handles competitive events, queue backups, and membership hours.
* **🎨 PPT Layout & Visual Tips**:
  * ER Diagram or clean box layout showing relations between `User`, `Booking`, `PoolTable`, and `Order`.
* **🗣️ Speaker Notes**:
  > *"Our database model is structured around core entities: User, PoolTable, Booking, and Order. Notice how the PoolTable model stores X, Y coordinates and rotation directly, enabling persistent layout synchronization between the backend database and the frontend 2D Canvas."*

---

### Slide 8: Live System Walkthrough / User Flow
* **Slide Title**: End-to-End Workflow & User Journey
* **Header**: Seamless Interaction from Player Booking to Admin Fulfilment
* **Key Content**:
  * 1️⃣ **Authentication & Dashboard**: Player logs in with MFA -> Land on 2D lounge view.
  * 2️⃣ **Selection & Add-ons**: Click table on canvas -> Pick duration -> Add beverages & cues.
  * 3️⃣ **Instant Reservation & Invoice**: System checks slot collisions -> Confirms booking -> Generates digital invoice.
  * 4️⃣ **Live Admin Synchronization**: Admin dashboard reflects occupied table status & revenue metrics instantly.
* **🎨 PPT Layout & Visual Tips**:
  * Horizontal 4-step flowchart with icons and arrows (`Step 1 ➔ Step 2 ➔ Step 3 ➔ Step 4`).
* **🗣️ Speaker Notes**:
  > *"Here is the complete user flow. A player logs in, selects their table visually from the 2D layout, adds food and equipment, and checks out. The backend verifies slot availability, locks the table, generates an invoice, and updates the admin revenue dashboard immediately."*

---

### Slide 9: Future Scope & Technical Roadmap
* **Slide Title**: Future Enhancements & Scalability Plan
* **Header**: Taking 8-Ball Haven to the Next Level
* **Key Content**:
  * ⚡ **WebSocket Live Sync (Socket.io)**: Real-time table state updates across all connected clients without manual refreshing.
  * 💳 **Payment Gateway Integration**: Direct online payments via Razorpay / Stripe / UPI with auto-refunds on cancellation.
  * 🤖 **AI Dynamic Pricing Engine**: Automatically adjust hourly rates based on peak weekend hours and demand spikes.
  * 📱 **Mobile Application**: Native Android & iOS app using React Native for push notifications and instant bookings.
* **🎨 PPT Layout & Visual Tips**:
  * Timeline layout or 4 quadrant grid showcasing key upcoming milestones.
* **🗣️ Speaker Notes**:
  > *"Looking ahead, our roadmap includes WebSockets for instant live table sync across screens, payment gateway integration for Razorpay/Stripe, AI-based dynamic pricing for weekend peak hours, and a mobile app built in React Native."*

---

### Slide 10: Conclusion & Q&A
* **Slide Title**: Conclusion & Open Floor for Questions
* **Header**: Transforming Billiards Lounge Operations
* **Key Content**:
  * ✅ **100% Elimination of Booking Overlaps**
  * ✅ **Interactive 2D Room Layout Customization**
  * ✅ **Unified Revenue from Tables & Snack Bar**
  * ✅ **Enterprise-Grade Multi-Layer Security**
  * 💬 **Thank You! Questions & Discussion**
* **🎨 PPT Layout & Visual Tips**:
  * Clean, minimal closing slide with contact info, GitHub repo link, and "Thank You / Q&A" text.
* **🗣️ Speaker Notes**:
  > *"In summary, 8-Ball Haven transforms how pool halls operate by blending interactive visuals, automated scheduling, and tight security. Thank you for your time, and I am now happy to take any questions!"*

# WB Message - Project Specification

## Project Overview
- **Project Name:** WB Message
- **Project Type:** Production-oriented modern messaging application.

## Technology Stack
- **Database:** Neon PostgreSQL
- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Real-time:** WebSocket/Socket.IO

## Authentication
- **Mechanism:** Mobile-number-based authentication with OTP.
- **Development OTP:** Secure, development-only mechanism (no fake SMS). Production architecture must allow replacement with a real SMS provider.

## Product Vision
Build a professional messaging application with a unique, modern identity. It will prioritize usability, speed, reliability, and polish.

### Key Features
- Fast messaging & reliable delivery
- Unread indicators, online status, typing indicators
- Message reactions, replies, forwarding
- Media sharing & voice messages
- Notifications & search
- Group conversations
- Voice and video calls
- Profile management, privacy controls, settings
- PWA/mobile-app experience

*Note: Do not mimic WhatsApp's branding or proprietary UI. Use modern messaging platforms as usability references only.*

## UI/UX Requirements
Create an original design system. The application must be premium, modern, trustworthy, fast, polished, and mobile-first.

**Every screen must have:**
- Consistent spacing, typography, buttons, cards, icons
- Loading, error, and empty states
- Success feedback
- Responsive behavior
- Accessible controls

*Avoid: Generic templates, unfinished demo sections, dead buttons, fake counters/conversations, and placeholder text in production UI.*

## User System
Users will have:
- Unique user ID
- Mobile number
- Display name & profile photo
- About/status
- Online/offline state & last seen
- Privacy and notification preferences

## Messaging System
Architecture for:
- One-to-one messaging
- Persistence, sent/delivered/read states
- Timestamps & unread counts
- Reply, forward, reaction, delete, edit
- Media attachments & voice messages
- Message search

## Real-time Architecture
Support for:
- Real-time messages
- Typing indicators
- Online presence
- Read receipts
- Call signaling

## Feature Roadmap
1. Authentication foundation
2. User profile and account
3. Contacts/user discovery
4. One-to-one messaging
5. Real-time messaging
6. Message states and read receipts
7. Reply, reaction, edit, delete, forward
8. Media/file sharing
9. Voice messages
10. Notifications
11. Groups
12. Voice calling
13. Video calling
14. Search, archive, mute, pin
15. Privacy/security settings
16. PWA/mobile app polish

## Development Rules
- **One Phase = One Complete Function.**
- Each phase must include Frontend, Backend, Database, API, Validation, Error Handling, and Testing.
- No phase marked COMPLETE until all components are fully functional and tested.
- Fix root causes for failures before continuing.
- Do not rebuild, change phases without reason, replace Neon PostgreSQL, create static demo data, leave unfinished UI, skip backend/database, or expose secrets.

## DEVELOPMENT PRINCIPLE
Build slowly, one complete function at a time.
Every visible feature must have real functionality behind it.
Every completed function must be tested before the next function begins.

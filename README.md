# ABA Portal

**PHASE 2 - UNICORN ROADMAP v1.2**

The master vessel to get Brandon off Claude.ai. Direct connection to REACH.

## Features

- ✅ Full chat interface with REACH router
- ✅ Command Center WebSocket integration  
- ✅ Voice input (browser speech recognition)
- ✅ Agent trace visualization
- ✅ Quick actions bar
- ✅ T10 trust level access
- ✅ Real-time system status

## Deployment

### Vercel (Recommended)

```bash
npm install
npm run build
vercel deploy
```

### Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Architecture

```
User → ABA Portal → REACH Router → AIR → 79 Agents → Brain
                  ↓
              WebSocket → Command Center (real-time events)
```

## Endpoints

- **Chat**: `POST https://aba-reach.onrender.com/api/router`
- **WebSocket**: `wss://aba-reach.onrender.com/command-center`
- **Status**: `GET https://aba-reach.onrender.com/api/pulse/status`

## Trust Levels

- T10: Brandon Pierce Sr. (full access)
- T9: BJ Pierce
- T8: Raquel, Eric

## ACL

⬡B:VESSEL:ABA.PORTAL:v1.0.0:T10:20260224⬡

---

WE ARE ALL ABA.

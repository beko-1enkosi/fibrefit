# FibreFit

**Find better fibre. Know when to switch.**

FibreFit is a consumer-first connectivity decision platform that helps people understand the fibre options available in their area, compare packages based on their household needs, view community-reported connectivity issues, and decide whether their current fibre package is still a good fit.

FibreFit does **not** attempt to repair fibre infrastructure.

It solves the **information gap around fibre connectivity**.

> **Hackathon demo notice:** package prices, network availability, reliability scores and coverage information in this project are curated demo data. They must not be presented as live provider data.

---

## Problem

Choosing fibre can be confusing.

Consumers may need to visit several provider websites to understand:

- what fibre is available in their area;
- which fibre network operates there;
- which ISP packages are available;
- what speed suits their household;
- whether they are paying too much;
- whether other people nearby are experiencing connectivity problems;
- and whether switching providers would actually improve their situation.

FibreFit brings this information together into one consumer-focused experience.

---

## Solution

FibreFit combines:

- Location
- Fibre Network Operator information
- ISP package information
- Monthly budget
- Household size
- Internet usage
- Current fibre package
- Community connectivity reports

to help users make more informed fibre decisions.

The core experience is:

**Find → Report → Compare → Switch smarter**

---

## Core Features

### Find Fibre

Users choose their area and can view:

- Fibre packages represented in the area
- Fibre Network Operators
- Internet Service Providers
- Community connectivity reports
- An interactive map

The current hackathon demo areas are:

- Tembisa
- Ivory Park
- Rabie Ridge

---

### Fibre Finder

Users provide:

- Monthly budget
- Household size
- Main internet usage

Usage options include:

- Streaming
- Remote work
- Gaming
- Studying
- General browsing

Users can also optionally enter their current:

- ISP
- Fibre network
- Speed
- Monthly price

---

### FibreFit Recommendations

FibreFit returns three focused recommendations:

#### Best Match

The strongest overall match for the user's needs.

#### Best Value

A more affordable option that still suits the household.

#### Fastest Option

The highest-performance option available in the demo dataset.

Each recommendation includes:

- ISP
- Fibre network
- Download speed
- Upload speed
- Monthly price
- Contract type
- Match percentage
- Recommendation reasons

---

### Switch Smarter

If the user enters their current fibre package, FibreFit compares it with the recommended alternative.

The comparison considers:

- Current speed
- Current monthly price
- Recommended speed
- Recommended monthly price
- Monthly savings
- Estimated annual savings

FibreFit does **not automatically tell every user to switch**.

The platform provides enough information for the consumer to decide whether changing providers actually makes sense.

---

### Community Connectivity Reports

Users can report connectivity problems such as:

- No internet
- Slow internet
- Unstable connection
- Outage
- Poor service

Reports appear in the community feed and on the map.

Community reports are treated as **signals**, not official outage declarations.

They help users answer:

> “Is this only happening to me, or are other people nearby experiencing something similar?”

---

### Report an Issue

Users can submit:

- Area
- Issue type
- Fibre network
- ISP
- Short description

The MVP stores community reports in JSON.

Exact household coordinates are not displayed.

---

### Get in Touch

FibreFit includes a contact page where users can send:

- Complaints
- General feedback
- Fibre information corrections
- Partnership enquiries
- Other messages

Users provide their email address, area and message.

For the hackathon MVP, contact messages are stored locally in JSON.

---

### Fit — FibreFit Assistant

**Fit** is the FibreFit assistant.

Fit can answer questions such as:

- “Why is this my best match?”
- “Can I get something cheaper?”
- “Is 50 Mbps enough for my family?”
- “Should I switch?”

The chat:

- keeps conversation history;
- is scrollable;
- stores chat history locally in the browser;
- supports follow-up questions;
- uses FibreFit recommendation and connectivity data as context.

---

## AI Architecture

AI does **not** decide which fibre package the user should choose.

FibreFit's recommendation engine performs the package scoring first.

The architecture is:

```text
User information
       ↓
FibreFit dataset
       ↓
Recommendation engine
       ↓
Best Match / Best Value / Fastest
       ↓
OpenRouter
       ↓
Simple personalised explanation
```

OpenRouter is therefore used primarily to **explain FibreFit's recommendation**, rather than replace the recommendation logic.

This keeps the recommendation process understandable and testable.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- React Leaflet

### Mapping

- Leaflet
- OpenStreetMap

### Backend

- FastAPI
- Python
- Pydantic

### AI

- OpenRouter

### Data

The hackathon MVP uses JSON files for:

- Fibre packages
- Community reports
- Contact messages

---

## Project Structure

```text
fibrefit/
│
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   └── recommender.py
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── models.py
│   │
│   ├── data/
│   │   ├── packages.json
│   │   ├── reports.json
│   │   └── contact_messages.json
│   │
│   ├── tests/
│   │   └── test_recommender.py
│   │
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   └── hero-background.png
│   │
│   ├── src/
│   │   ├── main.jsx
│   │   └── styles.css
│   │
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
├── LICENSE
└── README.md
```

---

# Running FibreFit Locally

FibreFit requires:

- Python 3
- Node.js
- npm

You will need **two terminals**:

1. One for FastAPI
2. One for React/Vite

---

## Backend — macOS / Linux

From the project root:

```bash
cd backend
```

Create a virtual environment:

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file:

```bash
cp .env.example .env
```

Run FastAPI:

```bash
uvicorn app.main:app --reload
```

The backend will run on:

```text
http://localhost:8000
```

FastAPI documentation is available at:

```text
http://localhost:8000/docs
```

---

## Backend — Windows PowerShell

Open PowerShell inside the project and run:

```powershell
cd backend
```

Create the virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install the dependencies:

```powershell
pip install -r requirements.txt
```

Create your `.env` file:

```powershell
Copy-Item .env.example .env
```

Run FastAPI:

```powershell
uvicorn app.main:app --reload
```

The backend will run on:

```text
http://localhost:8000
```

### If PowerShell blocks virtual-environment activation

Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate the environment again:

```powershell
.\.venv\Scripts\Activate.ps1
```

---

## Backend — Windows Command Prompt

If you are using Command Prompt instead of PowerShell:

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

---

# Frontend

Open a second terminal.

From the project root:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

The frontend will usually run on:

```text
http://localhost:5173
```

If that port is already being used, Vite may automatically use another local port such as:

```text
http://localhost:5174
```

or:

```text
http://localhost:5175
```

The FibreFit backend accepts the local Vite development ports.

---

## Frontend Environment Variable

The frontend can optionally use:

```env
VITE_API_URL=http://localhost:8000
```

If no value is supplied, FibreFit defaults to:

```text
http://localhost:8000
```

Never place the OpenRouter API key in the frontend environment file.

---

# OpenRouter Setup

Create:

```text
backend/.env
```

Add:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

The OpenRouter key must remain on the backend.

Do **not** expose it in:

```text
frontend/.env
```

or frontend JavaScript.

If no OpenRouter API key is configured, FibreFit's core functionality still works because the recommendation engine does not depend on the LLM.

---

# Running Tests

Activate the backend virtual environment first.

Then:

```bash
cd backend
pytest
```

Or:

```bash
pytest -q
```

The recommendation-engine tests are located in:

```text
backend/tests/
```

---

# Main API Endpoints

```text
GET  /
GET  /areas
GET  /packages
POST /recommend
GET  /reports
POST /reports
POST /contact
POST /assistant
```

---

# Recommendation Principle

FibreFit is designed around one important principle:

> **The recommendation should come from FibreFit data and scoring logic. AI explains the decision.**

This means the product can demonstrate real technical logic instead of sending all user information directly to an LLM and asking it to choose a package.

---

# Fibre Networks and ISPs

FibreFit distinguishes between a **Fibre Network Operator (FNO)** and an **Internet Service Provider (ISP)**.

Example:

```text
Network: Vuma
ISP: Afrihost
Package: 100 Mbps
Price: R749/month
```

Networks represented in the hackathon dataset may include:

- Vuma
- Openserve
- MetroFibre

ISPs represented in the demo dataset may include:

- Afrihost
- Webafrica
- Cool Ideas
- Axxess

These combinations are **curated demo information** and are not claims of current live coverage.

---

# User Journey

```text
HOME
  ↓
SELECT AREA
  ↓
FIND FIBRE
  ↓
VIEW MAP + AVAILABLE OPTIONS
  ↓
ENTER HOUSEHOLD NEEDS
  ↓
GET FIBREFIT RECOMMENDATIONS
  ↓
BEST MATCH / BEST VALUE / FASTEST
  ↓
COMPARE WITH CURRENT PLAN
  ↓
SWITCH SMARTER
```

Community journey:

```text
COMMUNITY
   ↓
VIEW CONNECTIVITY REPORTS
   ↓
REPORT AN ISSUE
   ↓
REPORT APPEARS IN COMMUNITY SIGNALS
```

Users can also access:

```text
GET IN TOUCH
   ↓
COMPLAINT / FEEDBACK / CORRECTION
   ↓
MESSAGE STORED BY FIBREFIT
```

---

# What FibreFit Is Not

The hackathon MVP does not attempt to provide:

- Fibre installation
- Payments
- Live nationwide coverage
- Official outage declarations
- Provider account management
- Real-time integration with every ISP
- Infrastructure repair
- Network operations monitoring

FibreFit remains focused on the consumer information problem.

---

# Future Improvements

Future versions could integrate:

- Live ISP package feeds
- Fibre Network Operator coverage APIs
- Verified outage information
- Speed-test integrations
- User accounts
- Report verification
- Persistent cloud databases
- Provider partnerships
- More South African communities
- Nationwide coverage
- Notification and outage alerts

---

# Product Positioning

## FibreFit

**Find better fibre. Know when to switch.**

FibreFit helps people understand their fibre options, see what their community is experiencing, compare their current connection with available alternatives, and make better connectivity decisions based on their location, budget and internet usage.

### Core principle

> **We are not solving fibre infrastructure. We are solving the information gap around it.**

---

## Hackathon Prototype

FibreFit was developed as a hackathon MVP.

All fibre package, reliability and coverage data used during the demo is curated prototype data intended to demonstrate the product experience and technical approach.
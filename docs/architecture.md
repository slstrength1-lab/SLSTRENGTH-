# SL Strength OS — Data Architecture (Phase 1)

This is the connection reference for the SL Strength OS Notion workspace. Future
automations, integrations, and AI agents should read data source IDs and property names
from here.

- **Workspace:** Shane Lanteigne's Space (`35ca58f7-1c0f-814d-8906-00031a20f920`)
- **Hub page:** [🏋️ SL Strength OS](https://app.notion.com/p/3a9a58f71c0f810599e7eb3abbc017fd)
  — page ID `3a9a58f7-1c0f-8105-99e7-eb3abbc017fd`

## Database IDs

| Database | Database ID | Data Source ID (for API) |
|---|---|---|
| Clients | `68c2070801e540348d2ee20b7f168852` | `002ab021-86fe-43ed-b0c5-6de2ae845d48` |
| Leads | `a7aaf2e014894a9eab5395dba9b25058` | `a7d125f8-b72a-4b17-8f54-5735e4fce805` |
| Sales | `b7d7bbd75f764b36a8993054f3639116` | `7f1cdeda-694e-4104-b4fe-8a49de234832` |
| Check-ins | `42343aaddf684527ba7770b7f59d3a77` | `54ba94b6-2204-48ef-824f-ad669a1f3660` |
| Programs | `ab9015ff03c94a7da9446ea45c6f6627` | `aac6fb13-f9a7-4e71-8ee3-d9c4c0bf8481` |
| Content | `43717dc5dade4a5d83dc81aa38cae014` | `7b9428d8-9f4f-48c8-95d6-9a95bef9fc1f` |
| Business Metrics | `4901d27d8ae54f84b5fee0a4ac4d0715` | `b456da35-4b5d-4870-a802-5c699d350855` |

## Relation map

**Clients is the hub.** Everything else connects to it.

```
                         ┌─────────────┐
        Original Lead    │             │    Sales (Lifetime Revenue rollup)
   Leads ───────────────▶│   CLIENTS   │◀─────────────── Sales
                         │   (hub)     │
   Programs ────────────▶│             │◀─────────────── Check-ins
        Programs         └─────────────┘   Check-ins (Total Check-ins rollup)
```

| From | Property | To | Reverse property on target |
|---|---|---|---|
| Leads | `Converted Client` | Clients | `Original Lead` |
| Sales | `Client` | Clients | `Sales` |
| Check-ins | `Client` | Clients | `Check-ins` |
| Programs | `Client` | Clients | `Programs` |

**Rollups on Clients**

| Property | Source relation | Target | Function |
|---|---|---|---|
| `Lifetime Revenue` | Sales | `Amount` | sum |
| `Total Check-ins` | Check-ins | `Check-in` | count |

Content and Business Metrics are standalone (no relations) by design in Phase 1.

## Schemas

### 👥 Clients
`Name` (title) · `Client ID` (auto-ID, prefix CL) · `Status` (Onboarding / Active /
Paused / Churned / Completed) · `Email` · `Phone` · `Coaching Focus` (multi: Body
Transformation, Strength, Nutrition, Hybrid) · `Start Date` · `Renewal Date` ·
`Monthly Rate` ($) · `Primary Goal` · `Source` (Instagram / Referral / Website / Word of
Mouth / Other) · relations: `Sales`, `Check-ins`, `Programs`, `Original Lead` · rollups:
`Lifetime Revenue`, `Total Check-ins`

### 🎯 Leads
`Name` (title) · `Lead ID` (auto-ID, prefix LD) · `Stage` (New / Contacted / Call Booked
/ Proposal Sent / Won / Lost) · `Email` · `Phone` · `Source` · `Interest` (multi) ·
`Est. Value` ($) · `Next Follow-up` · `Notes` · relation: `Converted Client`

### 💰 Sales
`Sale` (title) · `Sale ID` (auto-ID, prefix SL) · `Amount` ($) · `Date` · `Package`
(1:1 Coaching / Nutrition Only / Strength Program / Transformation Package /
Consultation) · `Payment Type` (Monthly / Paid in Full / One-time / Deposit) ·
`Payment Status` (Paid / Pending / Refunded / Failed) · relation: `Client`

### 📊 Check-ins
`Check-in` (title) · `Date` · `Bodyweight` · `Compliance %` · `Energy` (Low / Moderate /
High) · `Sleep` (Poor / Okay / Good) · `Stress` (Low / Moderate / High) · `Wins` ·
`Adjustments` · `Status` (Pending / Submitted / Reviewed) · relation: `Client`

### 🏋️ Programs
`Program` (title) · `Type` (Strength / Hypertrophy / Fat Loss / Peaking / General) ·
`Phase` (Foundation / Accumulation / Intensification / Deload / Peak) · `Start Date` ·
`End Date` · `Status` (Draft / Active / Completed) · `Program Link` (URL) · relation:
`Client`

### 🎬 Content
`Title` (title) · `Platform` (multi: Instagram, YouTube, TikTok, Email, X) · `Format`
(Reel / Carousel / Story / Post / Email / Long-form Video) · `Pillar` (Education /
Transformation / Behind the Scenes / Promotion / Authority) · `Status` (Idea / Scripting
/ Filming / Editing / Scheduled / Published) · `Publish Date` · `Hook / Notes`

### 📈 Business Metrics
`Period` (title) · `Week Of` · `Active Clients` · `New Leads` · `New Clients` ·
`Revenue` ($) · `MRR` ($) · `Churned` · `Content Published` · `Notes`

## Views

| Database | View | Type | Configuration |
|---|---|---|---|
| Leads | Pipeline | Board | Grouped by `Stage`, sorted by `Next Follow-up` |
| Clients | By Status | Board | Grouped by `Status` |
| Content | Content Calendar | Calendar | By `Publish Date` |
| Content | Production Board | Board | Grouped by `Status` |
| Check-ins | Needs Review | Table | `Status` ≠ Reviewed, newest first |

## Example data

The workspace is seeded with a small set of records prefixed `[Example]` that demonstrate
the relations end-to-end: a lead (**Jordan Miles**) converted to a client, with two
monthly sales, a reviewed check-in, an active strength program, plus sample content and a
baseline metrics snapshot. Delete these once real data starts flowing.

## Next phases (not built yet)

Phase 1 is architecture only. Natural next steps once real data is flowing:

- Automate lead intake (form / DM → Leads) and lead → client conversion
- Automate weekly check-in collection and reminders
- Auto-populate Business Metrics from Clients / Sales / Content rollups
- Payment sync from the processor into Sales
- AI-assisted client review and content ideation

# Trading Journal - Feature Implementation Plan

## Overview
Dokumen ini berisi rencana implementasi fitur-fitur baru untuk Trading Journal Application.

---

## Current Architecture

### Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Radix UI
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL (Neon)
- **Hosting**: Vercel (Frontend) + Koyeb (Backend)

### Current Features
- User Authentication (Register/Login)
- Trade Management (CRUD)
- Basic Analytics
- Trading Journal

### Database Schema (Current)
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  trades    Trade[]
  journals  Journal[]
}

model Trade {
  id          String   @id @default(cuid())
  userId      String
  symbol      String
  type        String   // BUY/SELL
  entryPrice  Float
  exitPrice   Float?
  quantity    Float
  entryDate   DateTime
  exitDate    DateTime?
  pnl         Float?
  pnlPercent  Float?
  notes       String?
  emotion     String?
  isOpen      Boolean  @default(true)
}

model Journal {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  mood      Int      // 1-10
  notes     String
  lessons   String?
}
```

---

## Feature Implementation Plan

### Phase 1: Portfolio & Risk Management (Priority: HIGH)

#### 1.1 Portfolio Overview Page
**File baru:**
- `frontend/src/pages/Portfolio.tsx`
- `backend/src/routes/portfolio.ts`

**Fitur:**
- Total portfolio value
- Asset allocation pie chart
- Open positions summary
- Unrealized P&L
- Daily/Weekly/Monthly performance

**Database changes:** None (gunakan data Trade yang ada)

**API Endpoints:**
```
GET /api/portfolio/summary
GET /api/portfolio/allocation
GET /api/portfolio/performance?period=daily|weekly|monthly
```

**UI Components:**
- PortfolioSummaryCard
- AllocationChart (Pie chart)
- PositionsTable
- PerformanceChart

---

#### 1.2 Risk Management Tools
**File baru:**
- `frontend/src/pages/RiskManagement.tsx`
- `frontend/src/components/PositionSizeCalculator.tsx`
- `frontend/src/components/StopLossCalculator.tsx`

**Fitur:**
- Position size calculator
- Stop loss calculator
- Risk/Reward ratio calculator
- Maximum position based on account risk %

**Formula:**
```javascript
// Position Size
positionSize = (accountBalance * riskPercent) / (entryPrice - stopLoss)

// Risk/Reward Ratio
riskRewardRatio = (targetPrice - entryPrice) / (entryPrice - stopLoss)
```

**Database changes:**
```prisma
// Tambah ke User model
model User {
  // ... existing fields
  accountBalance  Float?   @default(0)
  riskPerTrade    Float?   @default(2) // percentage
}
```

---

### Phase 2: Enhanced Analytics (Priority: MEDIUM)

#### 2.1 Win Rate by Asset
**File:** `backend/src/routes/analytics.ts` (extend)

**API:**
```
GET /api/analytics/win-rate-by-asset
```

**Response:**
```json
{
  "assets": [
    { "symbol": "BBCA", "winRate": 75, "totalTrades": 20, "wins": 15 },
    { "symbol": "TLKM", "winRate": 60, "totalTrades": 10, "wins": 6 }
  ]
}
```

---

#### 2.2 Best Trading Hours/Days
**File:** `backend/src/routes/analytics.ts` (extend)

**API:**
```
GET /api/analytics/best-trading-times
```

**Response:**
```json
{
  "bestHours": [
    { "hour": 9, "winRate": 80, "avgPnl": 500000 },
    { "hour": 14, "winRate": 70, "avgPnl": 300000 }
  ],
  "bestDays": [
    { "day": "Monday", "winRate": 75, "avgPnl": 400000 },
    { "day": "Tuesday", "winRate": 65, "avgPnl": 200000 }
  ]
}
```

---

#### 2.3 Emotion Correlation Analysis
**File:** `backend/src/routes/analytics.ts` (extend)

**API:**
```
GET /api/analytics/emotion-correlation
```

**Response:**
```json
{
  "correlations": [
    { "emotion": "confident", "winRate": 80, "avgPnl": 500000, "trades": 15 },
    { "emotion": "fearful", "winRate": 30, "avgPnl": -200000, "trades": 10 },
    { "emotion": "greedy", "winRate": 40, "avgPnl": -100000, "trades": 8 }
  ]
}
```

---

#### 2.4 Drawdown Analysis
**File:** `backend/src/routes/analytics.ts` (extend)

**API:**
```
GET /api/analytics/drawdown
```

**Response:**
```json
{
  "maxDrawdown": -15.5,
  "maxDrawdownPeriod": { "start": "2024-01-15", "end": "2024-02-01" },
  "currentDrawdown": -5.2,
  "recoveryTime": 14, // days
  "drawdownHistory": [
    { "date": "2024-01-15", "drawdown": -10.5 },
    { "date": "2024-01-20", "drawdown": -15.5 }
  ]
}
```

---

### Phase 3: AI-Powered Features (Priority: HIGH)

#### 3.1 AI Investment Suggestion
**File baru:**
- `backend/src/routes/ai.ts`
- `backend/src/services/aiService.ts`
- `frontend/src/pages/AISuggestion.tsx`
- `frontend/src/components/SuggestionCard.tsx`

**Approach Options:**

**Option A: Rule-Based (No external API - FREE)**
```javascript
// Analisis berdasarkan:
// 1. Historical performance per asset
// 2. Win rate patterns
// 3. Best entry times
// 4. Risk assessment

function generateSuggestion(userId, symbol) {
  const history = await getTradeHistory(userId, symbol);
  const winRate = calculateWinRate(history);
  const avgHoldTime = calculateAvgHoldTime(history);
  const bestEntryPrice = calculateBestEntryPrice(history);

  return {
    action: winRate > 60 ? 'BUY' : 'HOLD',
    confidence: winRate,
    reasoning: `Based on your ${history.length} trades...`,
    suggestedEntry: bestEntryPrice,
    suggestedStopLoss: bestEntryPrice * 0.95,
    suggestedTarget: bestEntryPrice * 1.1
  };
}
```

**Option B: OpenAI Integration (Requires API Key)**
```javascript
// Gunakan GPT untuk analisis lebih advanced
const prompt = `
Analyze this trading history and provide suggestion:
${JSON.stringify(tradeHistory)}

Consider:
- Win rate patterns
- Best entry/exit points
- Risk management
- Market conditions
`;

const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: prompt }]
});
```

**Database changes:**
```prisma
model AISuggestion {
  id          String   @id @default(cuid())
  userId      String
  symbol      String
  action      String   // BUY, SELL, HOLD
  confidence  Float
  reasoning   String
  entryPrice  Float?
  stopLoss    Float?
  targetPrice Float?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}
```

**API Endpoints:**
```
POST /api/ai/suggestion
  Body: { symbol: "BBCA" }

GET /api/ai/suggestions
  Response: List of past suggestions

GET /api/ai/suggestion/:id/result
  Response: How the suggestion performed
```

---

#### 3.2 Pattern Recognition
**File:** `backend/src/services/patternService.ts`

**Patterns to detect:**
```javascript
const patterns = {
  // Positive patterns
  'consistent_winner': 'Win rate > 70% on specific asset',
  'good_timing': 'Most wins at specific hours',
  'discipline': 'Always uses stop loss',

  // Negative patterns
  'revenge_trading': 'Multiple trades after a loss',
  'overtrading': 'Too many trades per day',
  'no_stop_loss': 'Trades without stop loss',
  'fomo': 'Buying at peak prices'
};

function detectPatterns(trades) {
  const detected = [];

  // Check for revenge trading
  const lossTrades = trades.filter(t => t.pnl < 0);
  for (const loss of lossTrades) {
    const tradesAfter = trades.filter(t =>
      t.entryDate > loss.exitDate &&
      t.entryDate < addHours(loss.exitDate, 2)
    );
    if (tradesAfter.length >= 2) {
      detected.push({ pattern: 'revenge_trading', severity: 'high' });
    }
  }

  return detected;
}
```

---

#### 3.3 Sentiment Analysis (Journal)
**File:** `backend/src/services/sentimentService.ts`

**Approach:**
```javascript
// Simple keyword-based sentiment
const positiveWords = ['profit', 'win', 'confident', 'good', 'great'];
const negativeWords = ['loss', 'fear', 'greedy', 'mistake', 'bad'];

function analyzeSentiment(journalText) {
  const words = journalText.toLowerCase().split(' ');
  let score = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) score++;
    if (negativeWords.includes(word)) score--;
  });

  return {
    score: score,
    sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
  };
}
```

---

### Phase 4: Import/Export (Priority: MEDIUM)

#### 4.1 Import Trades from CSV
**File baru:**
- `backend/src/routes/import.ts`
- `frontend/src/components/ImportModal.tsx`

**Supported formats:**
- Generic CSV
- Stockbit export
- IPOT export
- Custom mapping

**API:**
```
POST /api/import/csv
  Content-Type: multipart/form-data
  Body: file, mapping (optional)
```

**CSV Parser:**
```javascript
import Papa from 'papaparse';

async function importCSV(file, mapping) {
  const results = Papa.parse(file, { header: true });

  const trades = results.data.map(row => ({
    symbol: row[mapping.symbol || 'Symbol'],
    type: row[mapping.type || 'Type'],
    entryPrice: parseFloat(row[mapping.entryPrice || 'Entry Price']),
    quantity: parseFloat(row[mapping.quantity || 'Quantity']),
    entryDate: new Date(row[mapping.entryDate || 'Date'])
  }));

  return trades;
}
```

---

#### 4.2 Export to Excel/CSV
**File baru:**
- `backend/src/routes/export.ts`

**API:**
```
GET /api/export/trades?format=csv|xlsx&startDate=&endDate=
GET /api/export/report?period=monthly&format=pdf
```

**Libraries:**
```json
{
  "exceljs": "^4.3.0",
  "pdfkit": "^0.13.0"
}
```

---

### Phase 5: Monthly Report (Priority: LOW)

#### 5.1 Automated Monthly Report
**File baru:**
- `backend/src/services/reportService.ts`
- `frontend/src/pages/Reports.tsx`

**Report contents:**
- Monthly P&L summary
- Win rate
- Best/worst trades
- Asset performance
- Emotion analysis
- AI suggestions recap

**PDF Generation:**
```javascript
import PDFDocument from 'pdfkit';

async function generateMonthlyReport(userId, month, year) {
  const doc = new PDFDocument();

  // Header
  doc.fontSize(24).text('Monthly Trading Report');
  doc.fontSize(12).text(`${month}/${year}`);

  // Summary
  const summary = await getMonthlyStats(userId, month, year);
  doc.text(`Total P&L: Rp ${summary.totalPnl}`);
  doc.text(`Win Rate: ${summary.winRate}%`);

  // Charts (as images)
  // ...

  return doc;
}
```

---

## Implementation Priority Order

### Sprint 1 (Week 1-2)
1. ✅ Portfolio Overview Page
2. ✅ Risk Management Tools (Calculator)

### Sprint 2 (Week 3-4)
3. ✅ Enhanced Analytics (Win Rate by Asset, Best Times)
4. ✅ Emotion Correlation

### Sprint 3 (Week 5-6)
5. ✅ AI Investment Suggestion (Rule-based)
6. ✅ Pattern Recognition

### Sprint 4 (Week 7-8)
7. ✅ Import/Export CSV
8. ✅ Drawdown Analysis

### Sprint 5 (Week 9-10)
9. ✅ Monthly Report PDF
10. ✅ Sentiment Analysis
11. ✅ AI Enhancement (OpenAI integration - optional)

---

## Database Migration Plan

```prisma
// Add to schema.prisma

model User {
  // ... existing
  accountBalance  Float?   @default(0)
  riskPerTrade    Float?   @default(2)
  aiSuggestions   AISuggestion[]
}

model AISuggestion {
  id          String   @id @default(cuid())
  userId      String
  symbol      String
  action      String
  confidence  Float
  reasoning   String   @db.Text
  entryPrice  Float?
  stopLoss    Float?
  targetPrice Float?
  createdAt   DateTime @default(now())
  result      String?  // WIN, LOSS, PENDING
  actualPnl   Float?
  user        User     @relation(fields: [userId], references: [id])
}

model Pattern {
  id          String   @id @default(cuid())
  userId      String
  patternType String
  severity    String   // low, medium, high
  description String
  detectedAt  DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}
```

---

## New Dependencies

### Backend
```json
{
  "papaparse": "^5.4.1",
  "exceljs": "^4.3.0",
  "pdfkit": "^0.13.0",
  "openai": "^4.20.0"  // optional for AI
}
```

### Frontend
```json
{
  "react-dropzone": "^14.2.3",
  "file-saver": "^2.0.5"
}
```

---

## Environment Variables (New)

```env
# Optional - for AI features
OPENAI_API_KEY=sk-xxx

# For reports
REPORT_STORAGE_PATH=/tmp/reports
```

---

## Sidebar Menu Update

```tsx
// Update Sidebar.tsx
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Briefcase, label: 'Portfolio', path: '/portfolio' },      // NEW
  { icon: TrendingUp, label: 'Trades', path: '/trades' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Shield, label: 'Risk Tools', path: '/risk' },             // NEW
  { icon: Brain, label: 'AI Suggestion', path: '/ai' },             // NEW
  { icon: FileText, label: 'Journal', path: '/journal' },
  { icon: Download, label: 'Import/Export', path: '/data' },        // NEW
  { icon: FileBarChart, label: 'Reports', path: '/reports' },       // NEW
];
```

---

## Testing Checklist

- [ ] Portfolio page loads with correct data
- [ ] Risk calculator produces correct values
- [ ] Analytics shows win rate by asset
- [ ] AI suggestion generates reasonable recommendations
- [ ] CSV import works with sample file
- [ ] Export downloads correct file
- [ ] Monthly report generates PDF
- [ ] All new routes are protected by auth

---

## Notes

1. **AI Suggestion**: Start with rule-based, add OpenAI later for better results
2. **Performance**: Add caching for analytics queries (Redis optional)
3. **Mobile**: All new pages should be responsive
4. **Testing**: Add unit tests for calculation functions

---

*Plan created: January 2026*
*Estimated total effort: 8-10 weeks for full implementation*

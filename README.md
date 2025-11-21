# Aktivitus Faktureringsverktyg

En modern webbaserad adminapp för kundhantering och fakturering.

## 📋 Funktioner

- **Dashboard** - Översikt med KPI-widgets och statistik
- **Kundhantering** - Lägg till, redigera och ta bort kunder
- **Statistik** - Visuell representation av data med diagram
- **Sök & Filter** - Snabb åtkomst till kundinformation
- **Exportfunktion** - Exportera data till CSV

## 🚀 Kom igång

### Förutsättningar

- Node.js 18+ 
- npm eller yarn
- Firebase-projekt (för produktion)

### Installation

1. Klona projektet
```bash
git clone <repository-url>
cd fakturaloggen
```

2. Installera dependencies
```bash
npm install
```

3. Konfigurera miljövariabler
```bash
cp .env.local.example .env.local
```
Fyll i dina Firebase credentials i `.env.local`

4. Starta utvecklingsservern
```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Språk:** TypeScript
- **Styling:** Tailwind CSS
- **Databas:** Firebase Firestore
- **Diagram:** Recharts
- **Ikoner:** Lucide React
- **Datum:** date-fns

## 📁 Projektstruktur

```
fakturaloggen/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout med sidebar
│   ├── page.tsx           # Dashboard
│   ├── kunder/            # Kundlista
│   └── ny-kund/           # Lägg till kund
├── components/            # React komponenter
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── StatCard.tsx
│   └── ChartCard.tsx
├── lib/                   # Utility funktioner
│   ├── firebase.ts        # Firebase config
│   ├── firestore.ts       # Firestore utilities
│   ├── constants.ts       # Konstanter
│   └── mockData.ts        # Mock data
├── types/                 # TypeScript types
│   └── index.ts
└── public/               # Statiska filer
```

## 🔥 Firebase Setup

1. Skapa ett Firebase-projekt på [Firebase Console](https://console.firebase.google.com/)
2. Aktivera Firestore Database
3. Kopiera Firebase config till `.env.local`
4. Sätt upp säkerhetsregler i Firestore

### Exempel på Firestore-regler

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{customerId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📊 Datamodell

### Customer
```typescript
{
  id: string;
  name: string;
  email: string;
  date: Date;
  place: 'Stockholm' | 'Göteborg' | 'Malmö' | 'Uppsala' | 'Örebro';
  coach: string;
  service: MembershipType | TestType;
  status: 'Aktiv' | 'Inaktiv' | 'Pausad' | 'Genomförd';
  price: number;
  sport: string;
  history: HistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}
```

## 🚢 Deployment

### Vercel (Rekommenderat)

1. Pusha koden till GitHub
2. Importera projektet på [Vercel](https://vercel.com)
3. Lägg till miljövariabler
4. Deploy!

### Andra alternativ

Projektet kan också deployeras på:
- Netlify
- Firebase Hosting
- AWS Amplify

## 📝 Användning

### Lägg till ny kund

1. Klicka på "Lägg till kund" i sidomenyn
2. Fyll i formuläret med kundens uppgifter
3. Klicka "Spara kund"

### Redigera kund

1. Gå till "Kunder" i sidomenyn
2. Klicka på redigera-ikonen för kunden
3. Uppdatera uppgifterna
4. Spara ändringarna

### Exportera data

1. Gå till "Kunder"
2. Klicka på "Exportera"
3. Data exporteras som CSV

## 🎨 Design

Designen är inspirerad av moderna dashboard-interfaces med fokus på:
- Minimalism
- Hög läsbarhet
- Tydlig kontrast
- Responsiv design
- Snabb navigering

## 🔒 Säkerhet

- Firebase Authentication för användarhantering
- Säkra miljövariabler
- GDPR-kompatibel datahantering
- Validering av all input

## 🐛 Felsökning

### Firebase-fel
- Kontrollera att miljövariablerna är korrekt inställda
- Verifiera att Firestore är aktiverat
- Kolla säkerhetsreglerna

### Build-fel
- Kör `npm install` för att säkerställa alla dependencies
- Rensa `.next` mappen: `rm -rf .next`
- Kör `npm run build` för att testa produktionsbygget

## 📄 Licens

Proprietär - Aktivitus AB

## 👥 Support

För support, kontakta: admin@aktivitus.se

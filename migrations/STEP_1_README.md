# Schritt 1: Database Schema & TypeScript Types ✅

## Was wurde implementiert:

### 1. **Prisma Schema Updates** (`prisma/schema.prisma`)
- ✅ Neue Enums hinzugefügt:
  - `LegalDocumentType` (NDA, SERVICE_AGREEMENT, PARTNERSHIP, SUPPLIER_CONTRACT, EMPLOYMENT, CUSTOM)
  - `LegalDocumentStatus` (DRAFT, REVIEW, SENT, SIGNED, ARCHIVED, REJECTED)

- ✅ Neues Model `LegalDocument` mit:
  - Relations zu Venture, Squad, User
  - AI Generation Context (aiPrompt, generatedContent)
  - Partner Information (Company, Contact, Address)
  - Contract Terms (JSON for flexibility)
  - File Storage (documentUrl, signatureUrl)
  - Version Control & Timestamps
  - 6 Performance Indexes

- ✅ Relations aktualisiert in:
  - `User` → `legalDocuments LegalDocument[]`
  - `Squad` → `legalDocuments LegalDocument[]`
  - `Venture` → `legalDocuments LegalDocument[]`

### 2. **SQL Migration** (`migrations/005_add_legal_documents.sql`)
- ✅ CREATE TYPE für Enums
- ✅ CREATE TABLE mit allen Constraints
- ✅ CREATE INDEX für Performance
- ✅ CREATE TRIGGER für auto-update `updatedAt`
- ✅ Row-Level Security (RLS) Policies:
  - SELECT: Users sehen nur docs ihrer Ventures
  - INSERT: Users können docs für ihre Ventures erstellen
  - UPDATE: Creator oder Squad LEAD kann editieren
  - DELETE: Creator oder Squad LEAD kann löschen
  - ADMIN: Bypass all policies

### 3. **TypeScript Types** (`types/legal.ts`)
- ✅ Type-safe Interfaces:
  - `LegalDocumentWithRelations`
  - `ContractTerms`
  - `PartnerInfo`
  - `AIContractGenerationRequest`
  - `AIContractGenerationResponse`
  - `LegalDocumentStats`

- ✅ Zod Validation Schemas:
  - `ContractTermsSchema`
  - `PartnerInfoSchema`
  - `CreateLegalDocumentSchema`
  - `UpdateLegalDocumentSchema`
  - `AIGenerationRequestSchema`

- ✅ Type Guards:
  - `isValidDocumentType()`
  - `isValidDocumentStatus()`
  - `isDocumentEditable()`
  - `isDocumentFinalized()`

- ✅ Template System:
  - `LegalDocumentTemplate` interface
  - `LEGAL_DOCUMENT_TEMPLATES` array (5 vordefinierte Templates)
  - `getTemplateByType()` helper

- ✅ Utility Functions:
  - `formatDocumentStatus()`
  - `getStatusColor()`

---

## Wie ausführen:

### **Option 1: Prisma (Development)**
```bash
cd /Users/bucci369/the-forge-community

# 1. Generate Prisma Client (mit neuen Types)
npx prisma generate

# 2. Push Schema zu Database (nur Development!)
npx prisma db push

# 3. Verify
npx prisma studio
# → Check ob "LegalDocument" table existiert
```

### **Option 2: Raw SQL (Production)**
```bash
# 1. Connect zu Neon Console
# https://console.neon.tech/

# 2. Run Migration File
# Copy & Paste: migrations/005_add_legal_documents.sql

# 3. Verify
SELECT table_name FROM information_schema.tables WHERE table_name = 'LegalDocument';

# 4. Generate Prisma Client
npx prisma generate
```

---

## Testing Commands:

### **Test 1: Prisma Client Types**
```typescript
// Create test file: test-legal-types.ts
import { prisma } from './lib/prisma';

async function test() {
  // Should compile without errors
  const doc = await prisma.legalDocument.create({
    data: {
      ventureId: 'xxx',
      createdById: 'yyy',
      documentType: 'NDA',
      documentTitle: 'Test NDA',
      status: 'DRAFT'
    }
  });
  console.log(doc);
}
```

### **Test 2: TypeScript Types**
```typescript
// types/legal.ts should have no type errors
import { LegalDocument, ContractTerms } from '@/types/legal';

const terms: ContractTerms = {
  duration: '12 months',
  paymentTerms: 'Net 30'
}; // ✅ Should compile
```

### **Test 3: Zod Validation**
```typescript
import { CreateLegalDocumentSchema } from '@/types/legal';

const result = CreateLegalDocumentSchema.safeParse({
  ventureId: 'invalid',
  documentType: 'NDA',
  documentTitle: 'Test',
  partnerInfo: {
    companyName: 'Test Corp',
    contactName: 'John Doe',
    contactEmail: 'invalid-email'
  },
  contractTerms: {}
});

console.log(result.error); // Should show validation errors
```

---

## Verification Checklist:

- [ ] Prisma Client generiert ohne Errors
- [ ] TypeScript Compilation ohne Errors (`npm run build`)
- [ ] Database Table `LegalDocument` existiert
- [ ] Indexes sind erstellt (6 indexes)
- [ ] RLS Policies sind aktiv (`SELECT * FROM pg_policies WHERE tablename = 'LegalDocument'`)
- [ ] Trigger für `updatedAt` funktioniert
- [ ] Types in `types/legal.ts` sind importierbar
- [ ] Zod Schemas validieren korrekt

---

## Files Changed/Created:

```
MODIFIED:
├── prisma/schema.prisma (Enums + Model + Relations)

CREATED:
├── migrations/005_add_legal_documents.sql (SQL Migration)
├── types/legal.ts (TypeScript Types & Validation)
└── migrations/STEP_1_README.md (This file)
```

---

## Next Steps (Schritt 2):

- [ ] Shared Components erstellen (StudioShell, TemplateSelector, AIGenerator)
- [ ] Component Library aufbauen
- [ ] UI/UX Foundations legen

---

## Rollback (Falls nötig):

```sql
-- Run in Neon Console:
DROP TABLE IF EXISTS "LegalDocument" CASCADE;
DROP TYPE IF EXISTS "LegalDocumentType" CASCADE;
DROP TYPE IF EXISTS "LegalDocumentStatus" CASCADE;
DROP FUNCTION IF EXISTS update_legal_document_timestamp() CASCADE;
```

```bash
# Remove types file:
rm /Users/bucci369/the-forge-community/types/legal.ts
```

```prisma
// Remove from prisma/schema.prisma:
// 1. enum LegalDocumentType
// 2. enum LegalDocumentStatus
// 3. model LegalDocument
// 4. Relations: legalDocuments LegalDocument[] from User, Squad, Venture
```

---

**Status: READY FOR REVIEW** ✅

Bitte bestätigen für Schritt 2.

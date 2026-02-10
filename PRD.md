# Product Requirements Document (PRD) - Second Hand Inventory & MD-SOGAE v2.9

## 🛡️ Overview
This project is a high-end fashion archive inventory management system with an AI-powered analysis tool called **MD-SOGAE v2.9**. 
The goal is to provide objective value assessment of second-hand fashion items based on data (product codes, market prices) and optimize sales efficiency.

## 🛠 Project Structure
- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API Routes, Turso DB (SQLite/libSQL)
- **AI**: Google Gemini 2.0 Flash Exp (for analysis), Google Vision API (for OCR)

## 📋 Key Features

### 1. MD-SOGAE v2.9 Analysis (Modular Architecture)
The core feature is a 4-phase analysis pipeline implemented in `/api/md-sogae/analyze`.

- **Phase 1: Visual & OCR Priority**: Extract product codes (Art No, Style No), fabric composition (e.g., Nylon 100%), brand, sub-line, size, and grade from images.
- **Phase 2: Market Intelligence**: Analyze global market prices (eBay, Grailed) and domestic prices (KREAM, Musinsa USED, Bunjang, Fruits) to calculate a "Ready-to-Sell" price.
- **Phase 3: Professional Naming**: Generate SEO-optimized product names (max 45 chars) using specialized tags like `[Technical]`, `[Archive]`, `[Sartorial]`, or `[Original]`.
- **Phase 4: Editorial Content**: Generate professional product descriptions including Brand Heritage, Detail Guide, and Archive Value.

### 2. Inventory Management
- Product registration (Single/Bulk).
- Category management (NEW, CURATED, ARCHIVE, CLEARANCE).
- Status tracking (Selling, Sold, Under Review).

## 🚀 API Endpoints for Testing

### MD-SOGAE Analyze
- **Endpoint**: `POST /api/md-sogae/analyze`
- **Request Body**:
  ```json
  {
    "imageUrl": "string",
    "category": "string"
  }
  ```
- **Response**: A nested object containing `careLabel`, `marketPrice`, `professionalName`, `metadataCard`, and `editorial`.

### Inventory Products
- **Endpoint**: `GET /api/products` (List products)
- **Endpoint**: `POST /api/products` (Create product)

## 🎯 Testing Goals for TestSprite
1. **Functional Testing**: Verify the MD-SOGAE analysis pipeline handles various image URLs and categories correctly.
2. **Error Handling**: Ensure the API returns 400 when required fields are missing and 500 on AI failures.
3. **Data Integrity**: Confirm that extracted data (productCode, finalPrice) matches the expected schema.
4. **End-to-End**: Simulate the flow from image upload to product registration.

## 🔑 Environment Variables Required
- `GEMINI_API_KEY`: Required for AI analysis.
- `LIBSQL_URL`: Turso DB connection.
- `LIBSQL_AUTH_TOKEN`: Turso DB auth.

# 🛍️ Recommendation System — AI-Powered E-Commerce

A full-stack e-commerce recommendation platform that delivers personalized product discovery through production-grade multi-stage machine learning pipelines. The system implements multi-channel recall (Two-Tower, Collaborative Filtering, Popularity-based), coarse-to-fine ranking with MMoE multi-task learning, and business-aware reranking—served through RESTful FastAPI endpoints backed by PostgreSQL, and rendered in responsive, mobile-first React storefront with real-time user behavior tracking.

## 🔑 Key Features

- **🧠 Multi-Channel Recall Strategy**

  Combines five parallel retrieval paths—Two-Tower embedding similarity, Item-based Collaborative Filtering, User-based Collaborative Filtering, Global Popularity, and Interest-based Category Recall—to capture user preferences from multiple angles. Each channel surfaces hundreds of candidates from distinct signal sources, ensuring both personalization depth and recommendation diversity.

- **🔗 Full-Stage Recommendation Pipeline**

  Implements industry-standard Recall → Coarse Ranking → Fine Ranking → Reranking pipeline. Lightweight neural network performs coarse ranking to filter thousands of candidates down to hundreds, MMoE (Multi-gate Mixture-of-Experts) model jointly optimizes purchase probability and GMV prediction during fine ranking, and business-logic reranking layer adjusts final scores based on inventory availability and regional stock distribution.

- **🎨 Responsive Mobile-First UI**

  Modern storefront built with React 18, TypeScript, and Tailwind CSS featuring Pinterest-style masonry feed with infinite scroll, product detail pages with popularity scoring, full shopping cart and checkout flow with payment simulation, order history with logistics tracking, and category-based filtering—all optimized for mobile-first interaction with seamless AJAX-driven data loading.

- **⚡ RESTful FastAPI Backend with PostgreSQL**

  High-performance Python backend serving recommendation results, user profiles, transaction processing, and order management through clean RESTful endpoints. Pydantic models enforce strict request/response validation, PostgreSQL handles persistent storage with parameterized queries and normalized relational schemas, and the recommendation pipeline initializes all model weights on startup for low-latency inference.

- **📊 Real-Time User Behavior Tracking**

  Client-side event instrumentation captures product impressions, clicks, add-to-cart, and purchase actions with automatic batched uploads to the database. Zustand-powered tracking store buffers events at configurable intervals and flushes them through Axios-based API calls, with `sendBeacon` fallback on page unload ensuring zero data loss—providing complete behavioral dataset for downstream analytics and model retraining.

## 📂 Project Structure

```bash
recommendation-system/
├── backend/                              # Backend - FastAPI + PyTorch + PostgreSQL
│   ├── main.py                           # FastAPI app, recommendation pipeline, API endpoints
│   ├── models/                           # ML model definitions
│   │   ├── two_tower_model.py            # Two-Tower embedding recall
│   │   ├── item_cf.py                    # Item-based Collaborative Filtering
│   │   ├── user_cf.py                    # User-based Collaborative Filtering
│   │   ├── global_popular.py             # Global popularity recall
│   │   ├── category_popular.py           # Category-specific popularity recall
│   │   ├── coarse_ranking.py             # Coarse ranking neural network
│   │   ├── mmoe.py                       # MMoE multi-task fine ranking model
│   │   └── reranking.py                  # Business-logic reranking module
│   ├── *.pth                             # Trained PyTorch model weights
│   ├── *.pkl                             # Pre-computed similarity matrices & popularity data
│   ├── Dockerfile                        # Container deployment configuration
│   └── requirements.txt                  # Python dependencies
│
├── notebooks/                            # Model Training & Data Processing
│   ├── Database_Initialization.ipynb     # PostgreSQL schema creation & data preprocessing
│   └── Recommendation_System.ipynb       # Model training for all pipeline stages
│
├── src/                                  # Frontend - React + TypeScript + Tailwind CSS
│   ├── api/
│   │   ├── client.ts                     # Axios API client configuration
│   │   ├── clients.ts                    # User profile API calls
│   │   ├── recommendations.ts            # Recommendation feed API calls
│   │   ├── transactions.ts               # Order transaction API calls
│   │   ├── orders.ts                     # Order history & detail API calls
│   │   └── mappers.ts                    # Backend-to-frontend data mappers
│   ├── components/
│   │   ├── Layout.tsx                    # App shell with responsive navigation
│   │   ├── ProductCard.tsx               # Product card with tracking instrumentation
│   │   ├── LoginHeroPanel.tsx            # Animated login hero section
│   │   ├── UserDropdown.tsx              # User profile dropdown menu
│   │   └── ui/                           # ShadcnUI + Radix UI primitives
│   ├── pages/
│   │   ├── LoginPage.tsx                 # User selection with live profile carousel
│   │   ├── FeedPage.tsx                  # Recommendation feed with infinite scroll
│   │   ├── ProductDetailPage.tsx         # Product detail page with stats & actions
│   │   ├── CartPage.tsx                  # Shopping cart management
│   │   ├── CheckoutPage.tsx              # Checkout with payment simulation
│   │   ├── OrderHistoryPage.tsx          # Order list with pagination
│   │   ├── OrderDetailPage.tsx           # Order detail with logistics tracking
│   │   └── ProfilePage.tsx               # User profile dashboard
│   ├── store/
│   │   ├── useUserStore.ts               # Zustand user session state
│   │   ├── useCartStore.ts               # Zustand shopping cart state
│   │   ├── useTrackingStore.ts           # Zustand event tracking with batch upload
│   │   └── useProductCache.ts            # Zustand feed cache with scroll restoration
│   ├── types/
│   │   └── index.ts                      # TypeScript type definitions
│   ├── App.tsx                           # Main app component with routing
│   └── main.tsx                          # Application entry point
│
├── package.json                          # Frontend dependencies and scripts
├── .env                                  # Environment variables
├── .gitignore                            # Git ignored files
└── README.md                             # Project documentation
```

## 🛠️ Tech Stack

- **Backend**: `FastAPI`, `Python`, `uvicorn`, `PostgreSQL`, `psycopg2`, `Pydantic`

- **Machine Learning**: `PyTorch`, `Two-Tower Model`, `MMoE`, `Collaborative Filtering`, `numpy`

- **Frontend**: `React 18`, `TypeScript`, `React Router`, `Vite`, `Axios`, `React Query`

- **UI & Styling**: `Tailwind CSS`, `ShadcnUI`, `Radix UI`, `Sonner`, `Lucide Icons`

- **State Management**: `Zustand`

- **Data Processing**: `PySpark`, `PostgreSQL`, `Jupyter Notebook`

## ⚙️ Dependencies

- **Python 3.10+** — Required for backend API and ML inference
   👉 [Download Python](https://www.python.org/downloads/)

- **Node.js 18+** — Required for React frontend
   👉 [Download Node.js](https://nodejs.org/en/download)

- **PostgreSQL 13+** — Database for clients, products, transactions, and event tracking
   👉 [Download PostgreSQL](https://www.postgresql.org/download/)

- **PyTorch** — Required for model inference (CPU version sufficient)
   👉 [Install PyTorch](https://pytorch.org/get-started/locally/)

## 🚀 Setup & Usage

1. **Clone the repository**

   ```bash
   git clone https://github.com/HenryyyLI/recommendation-system.git
   cd recommendation-system
   ```

2. **Configure environment variables**

   ```bash
   # Create .env file in backend directory with:
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=recommendation
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_SSLMODE=prefer
   PIXABAY_API_KEY=your_pixabay_api_key
   ```

3. **Install dependencies**

   ```bash
   # Install backend dependencies
   cd backend
   pip install torch --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements.txt

   # Install frontend dependencies
   cd ../src
   npm install
   ```

4. **Set up the database**

   ```bash
   # Create PostgreSQL database
   psql -U postgres -c "CREATE DATABASE recommendation;"

   # Run Database_Initialization.ipynb to create schemas and populate data
   ```

5. **Train recommendation models** (Optional — pre-trained weights included)

   ```bash
   # Run Recommendation_System.ipynb to train all pipeline stages
   # Outputs: two_tower_model.pth, coarse_ranking_model.pth, mmoe_model.pth,
   #          item_similarity.pkl, user_similarity.pkl, global_popular.pkl, category_popular.pkl
   ```

6. **Start backend & frontend**

   ```bash
   # Start backend server (from backend directory)
   uvicorn main:app --reload --port 8000

   # Start frontend dev server (from src directory, in new terminal)
   npm run dev
   ```

## 🌐 Deployment

👉 **Live Demo**: https://recommendation-system-lovable.vercel.app

## 🔧 Contact

Henry Li - [GitHub Profile](https://github.com/HenryyyLI)

Project Link: [https://github.com/HenryyyLI/recommendation-system](https://github.com/HenryyyLI/recommendation-system)

---

⭐ If you find this project useful, please consider giving it a star!

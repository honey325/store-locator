# Store Locator & Live Chat App

Hey! This is a full-stack web application I built for finding nearest stores on a map and chatting with shop owners in real-time.

## Main Features
- **Role-based Access:** Customer, Shop Owner, and Admin roles.
- **Store Locator:** Finds nearest stores using your current GPS location (Haversine formula).
- **Interactive Map:** Displays stores dynamically using OpenStreetMap/Leaflet so we don't need Google Maps API keys.
- **Real-time Chat:** Customers and owners can message each other instantly using Socket.io.
- **Store Management:** Owners get a dedicated dashboard to create, update, and delete their own stores.

## Tech Stack
- **Frontend:** React, Vite, React Router, Socket.io-client, React Leaflet
- **Backend:** Node.js, Express, Socket.io, Prisma ORM
- **Database:** PostgreSQL

## How to Run Locally

### 1. Database
Make sure you have PostgreSQL installed and create a database (e.g. `store_locator_db`).

### 2. Backend Setup
Navigate to the `backend` folder:
1. Run `npm install`
2. Create a `.env` file with your details:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://username:password@localhost:5432/store_locator_db?schema=public"
   JWT_SECRET="your_secret_key"
   FRONTEND_URL="http://localhost:5173"
   BCRYPT_SALT_ROUNDS=10
   ```
3. Run `npx prisma db push` to sync the database schema.
4. Run `node prisma/seeders/roleSeeder.js` to create the default user roles.
5. Start the server: `npm run dev`

### 3. Frontend Setup
Open a new terminal and navigate to the `frontend` folder:
1. Run `npm install`
2. Create a `.env` file with:
   ```env
   VITE_API_URL="http://localhost:3000/api"
   ```
3. Start the app: `npm run dev`

That's it! Open your browser to `http://localhost:5173` to see it in action.

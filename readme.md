To run the WMS application, you have a monorepo with multiple services. Here's how to start them:

Option 1: Run Both Services (Recommended)

Open two terminals:

Terminal 1 - Start the API Server:

pnpm --filter @workspace/api-server run dev

Terminal 2 - Start the Frontend:

pnpm --filter @workspace/wms-app run dev

The frontend will be available at http://localhost:5173 (or the URL shown in the terminal).

Option 2: Run Services Individually

API Server only:

pnpm --filter @workspace/api-server run dev

Runs on the configured port (check .env or logs for the port)

Frontend only:

pnpm --filter @workspace/wms-app run dev

Runs on port 5173

Available Scripts:

For the frontend (@workspace/wms-app):

dev - Start dev server
build - Build for production
serve - Preview production build
For the API (@workspace/api-server):

dev - Build and start dev server
build - Build the project
start - Run the compiled server

# Plume Price API (TypeScript)

A simple Express.js API written in TypeScript that fetches the price of the PLUME token from the Plume network.

## Prerequisites

- Node.js
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository_url>
   cd plume-price-api-ts
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Create a `.env` file in the root directory and add your Alchemy RPC URL for Ethereum mainnet:
   ```
   ALCHEMY_RPC=<your_alchemy_mainnet_rpc_url>
   PORT=8000 # Optional: defaults to 8000
   ```

## Running the API

### For Production/Staging

1. Compile TypeScript:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```
   The API will be running on `http://localhost:8000` (or the port specified in `.env`).

### For Local Development

You can run the application directly using `ts-node` (make sure you have it installed, e.g., via `npm install -D ts-node` or it's in your project's `devDependencies`). This is useful for quick testing as it compiles and runs the TypeScript code in memory.

   ```bash
   npx ts-node index.ts
   ```
   The API will be running on `http://localhost:8000` (or the port specified in `.env`).

## Endpoint

### Get PLUME Price

Fetches the current price of the PLUME token.

- **URL:** `/price`
- **Method:** `GET`
- **Query Parameters:**
  - `denom` (optional): Specifies the denomination for the price.
    - `usd` (default): Returns the price in USD.
    - `eth`: Returns the price in ETH.
- **Success Response:**
  - **Code:** 200
  - **Content Example (denom=usd):**
    ```json
    {
      "symbol": "PLUME",
      "price_usd": "0.123456789"
    }
    ```
  - **Content Example (denom=eth):**
    ```json
    {
      "symbol": "PLUME",
      "price_eth": "0.000045678"
    }
    ```
- **Error Response:**
  - **Code:** 500
  - **Content Example:**
    ```json
    {
      "error": "Error message describing the issue"
    }
    ```

## How it Works

The API uses `ethers.js` to interact with:

1.  **Plume Network:** It calls the `getPoolPrice` function on the `PoolLens` contract (`0xBf0D89E67351f68a0a921943332c5bE0f7a0FF8A`) via the public Plume RPC (`https://rpc.plume.org`) to get the PLUME/PUSD price (assuming PUSD is pegged 1:1 to USD).
2.  **Ethereum Mainnet (Optional):** If `denom=eth` is requested, it calls the `latestRoundData` function on the Chainlink ETH/USD price feed contract (`0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`) via the Alchemy RPC specified in `.env` to get the current ETH price in USD. The PLUME/USD price is then divided by the ETH/USD price to get the PLUME/ETH price. 
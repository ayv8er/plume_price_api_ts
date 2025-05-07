import express from 'express';
import dotenv from 'dotenv';
import { createPublicClient, http, formatUnits, defineChain } from 'viem';
import { mainnet } from 'viem/chains';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

export const plume = defineChain({
  id: 98866,
  name: 'Plume Mainnet',
  nativeCurrency: { name: 'PLUME', symbol: 'PLUME', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.plume.org'] },
  },
  blockExplorers: {
    default: { name: 'Plume Explorer', url: 'https://explorer.plume.org' },
  },
});

const plumeClient = createPublicClient({
  chain: plume,
  transport: http(),
});

const POOL_LENS_ADDRESS = '0xBf0D89E67351f68a0a921943332c5bE0f7a0FF8A';
const PLUME_PUSD_POOL = '0x4A14398C5c5B4B7913954cB82521fB7afA676314';

const POOL_LENS_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
    name: 'getPoolPrice',
    outputs: [{ internalType: 'uint256', name: 'price', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const alchemyRpc = process.env.ALCHEMY_RPC;
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(alchemyRpc || undefined),
});
const CHAINLINK_ETH_USD = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';

const CHAINLINK_ABI = [
  {
    name: 'latestRoundData',
    outputs: [
      { type: 'uint80', name: 'roundId' },
      { type: 'int256', name: 'answer' },
      { type: 'uint256', name: 'startedAt' },
      { type: 'uint256', name: 'updatedAt' },
      { type: 'uint80', name: 'answeredInRound' },
    ],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'decimals',
    outputs: [{ type: 'uint8', name: 'value' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

app.get('/price', async (req, res) => {
  const denom = req.query.denom === 'eth' ? 'eth' : 'usd';

  try {
    const rawPrice = await plumeClient.readContract({
      address: POOL_LENS_ADDRESS,
      abi: POOL_LENS_ABI,
      functionName: 'getPoolPrice',
      args: [PLUME_PUSD_POOL],
    });
    const plumePusd = parseFloat(formatUnits(rawPrice, 18));

    let price = plumePusd;

    if (denom === 'eth') {
      const roundData = await mainnetClient.readContract({
        address: CHAINLINK_ETH_USD,
        abi: CHAINLINK_ABI,
        functionName: 'latestRoundData',
      });
      const answer = roundData[1];

      const decimals = await mainnetClient.readContract({
        address: CHAINLINK_ETH_USD,
        abi: CHAINLINK_ABI,
        functionName: 'decimals',
      });

      const ethUsd = parseFloat(formatUnits(answer, Number(decimals)));
      price = plumePusd / ethUsd;
    }

    res.json({
      symbol: 'PLUME',
      [`price_${denom}`]: price.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

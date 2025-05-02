import express from 'express';
import dotenv from 'dotenv';
import { ethers, formatUnits } from 'ethers';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

const w3Plume = new ethers.JsonRpcProvider('https://rpc.plume.org');
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
];

const alchemyRpc = process.env.ALCHEMY_RPC;
const w3Mainnet = new ethers.JsonRpcProvider(alchemyRpc);
const CHAINLINK_ETH_USD = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';

const CHAINLINK_ABI = [
  {
    name: 'latestRoundData',
    outputs: [
      { type: 'uint80' },
      { type: 'int256' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint80' },
    ],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  },
];

app.get('/price', async (req, res) => {
  const denom = req.query.denom === 'eth' ? 'eth' : 'usd';

  try {
    const lens = new ethers.Contract(POOL_LENS_ADDRESS, POOL_LENS_ABI, w3Plume);
    const rawPrice = await lens.getPoolPrice(PLUME_PUSD_POOL);
    const plumePusd = parseFloat(formatUnits(rawPrice, 18));

    let price = plumePusd;

    if (denom === 'eth') {
      const chainlink = new ethers.Contract(CHAINLINK_ETH_USD, CHAINLINK_ABI, w3Mainnet);
      const [ , answer ] = await chainlink.latestRoundData();
      const decimals = Number(await chainlink.decimals());
      const ethUsd = parseFloat(formatUnits(answer, decimals));
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

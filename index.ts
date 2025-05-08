import express from 'express';
import dotenv from 'dotenv';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import Decimal from 'decimal.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

const alchemyRpc = process.env.ALCHEMY_RPC;

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(alchemyRpc || undefined),
});

const UNISWAP_V3_PLUME_USDC_POOL = '0xe35Bfbf439D7C37E2Df41BF1236cCf1dEc0543fd';

const UNISWAP_V3_POOL_ABI = [
  {
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' },
    ],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

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
    const slot0 = await mainnetClient.readContract({
      address: UNISWAP_V3_PLUME_USDC_POOL,
      abi: UNISWAP_V3_POOL_ABI,
      functionName: 'slot0',
    });

    const sqrtX96 = new Decimal(slot0[0].toString());
    const Q96 = new Decimal(2).pow(96);
    const Q192 = Q96.pow(2);
    const price = sqrtX96.pow(2).div(Q192).mul(new Decimal(10).pow(18 - 6));

    let priceResult = price;

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

      const ethUsd = new Decimal(answer.toString()).div(new Decimal(10).pow(decimals));
      priceResult = price.div(ethUsd);
    }

    res.json({
      symbol: 'PLUME',
      [`price_${denom}`]: priceResult.toFixed(8),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
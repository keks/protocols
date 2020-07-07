import BN = require("bn.js");
import { Constants } from "loopringV3.js";
import { ExchangeTestUtil } from "./testExchangeUtil";
import { Deposit, SpotTrade, AuthMethod } from "./types";

contract("Exchange", (accounts: string[]) => {
  let exchangeTestUtil: ExchangeTestUtil;
  let exchangeId = 0;

  const createRandomRing = () => {
    // Make sure the ring is valid
    const fillA = new BN(1).add(exchangeTestUtil.getRandomAmount());
    const fillB = new BN(1).add(exchangeTestUtil.getRandomAmount());
    const ring: SpotTrade = {
      orderA: {
        tokenS: "WETH",
        tokenB: "GTO",
        amountS: fillA,
        amountB: fillB,
        buy: exchangeTestUtil.getRandomInt(2) > 0
      },
      orderB: {
        tokenS: "GTO",
        tokenB: "WETH",
        amountS: fillB,
        amountB: fillA,
        buy: exchangeTestUtil.getRandomInt(2) > 0
      }
    };
    return ring;
  };

  const doRandomDeposit = async () => {
    const orderOwners = exchangeTestUtil.testContext.orderOwners;
    const owner =
      orderOwners[Number(exchangeTestUtil.getRandomInt(orderOwners.length))];
    const amount = new BN(
      web3.utils.toWei(
        "" + exchangeTestUtil.getRandomInt(100000000) / 1000,
        "ether"
      )
    );
    const token = exchangeTestUtil.getTokenAddress("LRC");
    return await exchangeTestUtil.deposit(
      owner,
      owner,
      token,
      amount
    );
  };

  const doRandomOnchainWithdrawal = async (deposit: Deposit) => {
    await exchangeTestUtil.requestWithdrawal(
      deposit.owner,
      deposit.token,
      exchangeTestUtil.getRandomAmount(),
      "ETH",
      new BN(0),
      {authMethod: AuthMethod.FORCE}
    );
  };

  const doRandomOffchainWithdrawal = async (deposit: Deposit) => {
    await exchangeTestUtil.requestWithdrawal(
      deposit.owner,
      deposit.token,
      exchangeTestUtil.getRandomAmount(),
      "LRC",
      new BN(0)
    );
  };

  const doRandomInternalTransfer = async (
    depositA: Deposit,
    depositB: Deposit
  ) => {
    await exchangeTestUtil.transfer(
      depositA.owner,
      depositB.owner,
      depositA.token,
      depositA.amount.div(new BN(10)),
      depositA.token,
      depositA.amount.div(new BN(100))
    );
  };

  const createExchange = async (bDataAvailability: boolean) => {
    exchangeId = await exchangeTestUtil.createExchange(
      exchangeTestUtil.testContext.stateOwners[0],
      true,
      bDataAvailability
    );
  };

  const bVerify = true;
  const verify = async () => {
    if (bVerify) {
      await exchangeTestUtil.submitPendingBlocks();
    }
  };

  before(async () => {
    exchangeTestUtil = new ExchangeTestUtil();
    await exchangeTestUtil.initialize(accounts);
  });

  after(async () => {
    await exchangeTestUtil.stop();
  });

  describe("Permutations", function() {
    this.timeout(0);

    it("Ring Settlement", async () => {
      const bDataAvailabilities = [true];
      for (const bDataAvailability of bDataAvailabilities) {
        await createExchange(bDataAvailability);
        const blockSizes = exchangeTestUtil.blockSizes;
        for (const blockSize of blockSizes) {
          const rings: SpotTrade[] = [];
          for (let i = 0; i < blockSize; i++) {
            rings.push(createRandomRing());
          }
          for (const ring of rings) {
            await exchangeTestUtil.setupRing(ring);
            await exchangeTestUtil.sendRing(exchangeId, ring);
          }
          await exchangeTestUtil.submitTransactions();
        }
        await verify();
      }
    });

    it("Deposit", async () => {
      await createExchange(true);
      const blockSizes = exchangeTestUtil.blockSizes;
      for (const blockSize of blockSizes) {
        for (let i = 0; i < blockSize; i++) {
          await doRandomDeposit();
        }
        await exchangeTestUtil.submitTransactions();
      }
      await verify();
    });

    it("Onchain withdrawal", async () => {
      await createExchange(true);

      // Do some deposits
      const numDeposits = 8;
      const deposits: Deposit[] = [];
      for (let i = 0; i < numDeposits; i++) {
        deposits.push(await doRandomDeposit());
      }
      await exchangeTestUtil.submitTransactions();

      const blockSizes = exchangeTestUtil.blockSizes;
      for (const blockSize of blockSizes) {
        for (let i = 0; i < blockSize; i++) {
          const randomDeposit =
            deposits[exchangeTestUtil.getRandomInt(numDeposits)];
          await doRandomOnchainWithdrawal(randomDeposit);
        }
        await exchangeTestUtil.submitTransactions();
      }
      await verify();
    });

    it("Offchain withdrawal", async () => {
      const bDataAvailabilities = [true];
      for (const bDataAvailability of bDataAvailabilities) {
        await createExchange(bDataAvailability);

        // Do some deposits
        const numDeposits = 8;
        const deposits: Deposit[] = [];
        for (let i = 0; i < numDeposits; i++) {
          deposits.push(await doRandomDeposit());
        }
        await exchangeTestUtil.submitTransactions();

        const blockSizes = exchangeTestUtil.blockSizes;
        for (const blockSize of blockSizes) {
          for (let i = 0; i < blockSize; i++) {
            const randomDeposit =
              deposits[exchangeTestUtil.getRandomInt(numDeposits)];
            await doRandomOffchainWithdrawal(randomDeposit);
          }
          await exchangeTestUtil.submitTransactions();
        }
        await verify();
      }
    });

    it("Internal transfer", async () => {
      const bDataAvailabilities = [true];
      for (const bDataAvailability of bDataAvailabilities) {
        await createExchange(bDataAvailability);

        // Do some deposits
        const numDeposits = 8;
        const deposits: Deposit[] = [];
        for (let i = 0; i < numDeposits; i++) {
          deposits.push(await doRandomDeposit());
        }
        await exchangeTestUtil.submitTransactions();

        const blockSizes = exchangeTestUtil.blockSizes;
        for (const blockSize of blockSizes) {
          for (let i = 0; i < blockSize; i++) {
            const randomDepositA =
              deposits[exchangeTestUtil.getRandomInt(numDeposits)];
            const randomDepositB =
              deposits[exchangeTestUtil.getRandomInt(numDeposits)];
            await doRandomInternalTransfer(randomDepositA, randomDepositB);
          }
          await exchangeTestUtil.submitTransactions();
        }
        await verify();
      }
    });
  });
});

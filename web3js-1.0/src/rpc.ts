import { Connection, PublicKey } from "@solana/web3.js";
import { getStakeAccount, getStakeHistory } from "./stake";
import { getStakeActivatingAndDeactivating } from "./delegation";

export interface StakeActivation {
  status: string;
  active: bigint;
  inactive: bigint;
}

export async function getStakeActivation(
  connection: Connection,
  stakeAddress: PublicKey
): Promise<StakeActivation> {
  const SYSVAR_STAKE_HISTORY_ADDRESS = new PublicKey("SysvarStakeHistory1111111111111111111111111");
  const stakeAccountParsed = await connection.getParsedAccountInfo(stakeAddress);
  if (stakeAccountParsed === null || stakeAccountParsed.value === null) {
    throw new Error("Account not found");
  }
  const stakeHistoryParsed = await connection.getParsedAccountInfo(SYSVAR_STAKE_HISTORY_ADDRESS);
  if (stakeHistoryParsed === null) {
    throw new Error("StakeHistory not found");
  }

  const stakeHistory = getStakeHistory(stakeHistoryParsed);
  
  const epochInfo = await connection.getEpochInfo();

  const stakeAccount = getStakeAccount(stakeAccountParsed);

  const { effective, activating, deactivating } =
    getStakeActivatingAndDeactivating(
      stakeAccount.stake.delegation,
      BigInt(epochInfo.epoch),
      stakeHistory
    );

  let status;
  if (deactivating > 0) {
    status = 'deactivating';
  } else if (activating > 0) {
    status = 'activating';
  } else if (effective > 0) {
    status = 'active';
  } else {
    status = 'inactive';
  }
  const inactive = BigInt(stakeAccountParsed.value.lamports) - effective - stakeAccount.meta.rentExemptReserve;

  return {
    status,
    active: effective,
    inactive,
  };
}
import { Entity } from "@subql/types";
import assert from "assert";
import { Parachain } from "../types/models/Parachain";
import { Crowdloan } from "../types/models/Crowdloan";
import { CrowdloanSequence } from "../types/models/CrowdloanSequence";
import {
  fetchCrowdloan,
  fetchParachain,
  getParachainId,
  parseNumber,
  parseBigInt,
} from "../utils";
import { CrowdloanReturn, CrowdloanStatus } from "../types";

export const save = async <T extends Entity>(
  colName: string,
  entity: T,
): Promise<T> => {
  const { id } = entity;
  assert(id != null, `Invalid entity id: ${id}`);
  await store.set(colName, id, entity).catch((err) => {
    logger.error(`Save entity failed, ${err.toString()}`);
    process.exit(-1);
  });
  return entity;
};

export const get = async <T extends Entity>(
  colName: string,
  id: string,
): Promise<T | null> => store.get(colName, id) as Promise<T | null>;

export const upsert = async <T extends Entity>(
  colName: string,
  id: string,
  updater: Record<string, any>,
  updateFn?: (entry?: Entity) => Omit<T, "save">,
): Promise<T> => {
  const entry = await get(colName, id);
  const updatedItem = entry
    ? updateFn
      ? updateFn(entry)
      : { ...entry, ...updater, id }
    : updateFn
      ? updateFn()
      : { ...updater, id };

  logger.debug(`UpsertItem: ${JSON.stringify(updatedItem, null, 2)}`);
  return store
    .set(colName, id, updatedItem)
    .then(() => updatedItem as T)
    .catch((err) => {
      logger.error(
        `Upsert entity ${colName} ${JSON.stringify(updatedItem, null, 2)} failed, ${err.toString()}`,
      );
      throw err;
    });
};

export const ensureParachain = async (paraId: number): Promise<Parachain> => {
  logger.info(`Fetch parachain by ${paraId}`);
  const { manager, deposit } = await fetchParachain(paraId);
  const parachainId = `${paraId}-${manager}`;
  return upsert("Parachain", parachainId, {
    id: parachainId,
    paraId,
    manager,
    deposit,
    deregistered: false,
  });
};

export const ensureFund = async (
  paraId: number,
  modifier?: Record<string, any>,
): Promise<Crowdloan> => {
  const fund = await fetchCrowdloan(paraId);
  const parachainId = await getParachainId(paraId);
  logger.info(`Retrieved parachainId: ${parachainId} for paraId: ${paraId}`);
  const fundId = await getLatestCrowdloanId(parachainId);
  const {
    cap,
    end,
    trieIndex,
    raised,
    lastContribution,
    firstPeriod,
    lastPeriod,
    deposit,
    verifier,
    ...rest
  } = fund || ({} as CrowdloanReturn);
  logger.info(
    `Fund detail: ${JSON.stringify(fund, null, 2)} - cap: ${cap} - raised: ${raised}`,
  );

  return upsert<Crowdloan>("Crowdloan", fundId, null, (cur: Crowdloan) => {
    return !cur
      ? {
          id: fundId,
          parachainId,
          ...rest,
          firstSlot: firstPeriod,
          lastSlot: lastPeriod,
          status: CrowdloanStatus.STARTED,
          raised: parseNumber(raised) as unknown as bigint,
          cap: parseNumber(cap) as unknown as bigint,
          deposit: parseNumber(deposit) as unknown as bigint,
          lockExpiredBlock: end,
          isFinished: false,
          verifier: verifier?.toString() || undefined,
          ...modifier,
        }
      : {
          id: fundId,
          ...cur,
          raised:
            raised === undefined
              ? (parseBigInt(cur.raised) as unknown as bigint)
              : (parseNumber(raised) as unknown as bigint),
          cap:
            cap === undefined
              ? (parseBigInt(cur.cap) as unknown as bigint)
              : (parseNumber(cap) as unknown as bigint),
          deposit:
            deposit === undefined
              ? (parseBigInt(cur.deposit) as unknown as bigint)
              : (parseNumber(deposit) as unknown as bigint),
          ...modifier,
        };
  });
};

export const getLatestCrowdloanId = async (parachainId: string) => {
  const seq = await CrowdloanSequence.get(parachainId);
  const curBlockNum = await api.query.system.number();
  if (seq) {
    const crowdloanIdx = seq.curIndex;
    const isReCreateCrowdloan = await getIsReCreateCrowdloan(
      `${parachainId}-${crowdloanIdx}`,
    );
    let curIdex = crowdloanIdx;
    if (isReCreateCrowdloan) {
      curIdex = crowdloanIdx + 1;
      seq.curIndex = curIdex;
      seq.blockNum = curBlockNum.toNumber();
      await seq.save();
    }

    logger.info(`Crowdloan: ${parachainId} fundId curIndex: ${curIdex}`);
    return `${parachainId}-${curIdex}`;
  }

  await CrowdloanSequence.create({
    id: parachainId,
    curIndex: 0,
    createdAt: new Date(),
    blockNum: curBlockNum,
  }).save();
  logger.info(`Crowdloan: ${parachainId} fundId: 0`);
  return `${parachainId}-0`;
};

export const getIsReCreateCrowdloan = async (
  fundId: string,
): Promise<Boolean> => {
  const fund = await Crowdloan.get(fundId);
  const isReCreateCrowdloan = !!(
    fund?.dissolvedBlock &&
    fund?.status === CrowdloanStatus.DISSOLVED &&
    fund?.isFinished
  );
  logger.info(` =======
  Crowdloan: ${fundId} - DissolveBlock: ${fund?.dissolvedBlock} - Status: ${fund?.status} re-create crowdloan: ${isReCreateCrowdloan}
  ======`);
  return isReCreateCrowdloan;
};

import { Address } from "@polkadot/types/interfaces";
import { SubstrateEvent } from "@subql/types";
import { CrowdloanReturn, ParachainReturn } from "./types";

export const parseNumber = (hexOrNum: string | number | undefined): number => {
  if (!hexOrNum) {
    return 0;
  }
  return typeof hexOrNum === "string"
    ? parseInt(hexOrNum.replace(/^0x/, ""), 16) || 0
    : hexOrNum;
};

export const parseBigInt = (data) => {
  if (data !== undefined) {
    return JSON.stringify(data, (_, v) =>
      typeof v === "bigint" ? `${v}#bigint` : v,
    ).replace(/"(-?\d+)#bigint"/g, (_, a) => a);
  }
  return 0;
};

export const getParachainId = async (paraId: number | ParachainReturn) => {
  if (typeof paraId === "number") {
    const { manager } = (await fetchParachain(paraId)) || {};
    return `${paraId}-${manager || ""}`;
  }
  const { manager } = paraId || {};
  return `${paraId}-${manager || ""}`;
};

export const fetchParachain = async (
  paraId: number,
): Promise<ParachainReturn | null> => {
  const parachain = (
    await api.query.registrar.paras(paraId)
  ).toJSON() as unknown;
  logger.info(
    `Fetched parachain ${paraId}: ${JSON.stringify(parachain, null, 2)}`,
  );
  return parachain as ParachainReturn | null;
};

export const fetchCrowdloan = async (
  paraId: number,
): Promise<CrowdloanReturn | null> => {
  const fund = await api.query.crowdloan.funds(paraId);
  logger.info(`Fetched crowloan ${paraId}: ${JSON.stringify(fund, null, 2)}`);
  return fund.toJSON() as unknown as CrowdloanReturn | null;
};

export const isFundAddress = (address: Address) => {
  const hexStr = address.toHex();
  return Buffer.from(hexStr.slice(4, 28), "hex")
    .toString()
    .startsWith("modlpy/cfund");
};

export const getParachainIndex = (address: string) => {
  const hexStr = api.createType("Address", address).toHex();
  const hexIndexLE =
    "0x" + hexStr.slice(28, 32).match(/../g).reverse().join("");
  return parseInt(hexIndexLE, 10);
};

export const getEventLogger = (event: SubstrateEvent) => {
  const {
    event: { method, section },
    block: {
      block: { header },
    },
    idx,
    extrinsic,
  } = event;
  const eventType = `${section}/${method}`;
  const { method: extMethod, section: extSection } =
    extrinsic?.extrinsic.method || {};
  logger.info(
    `
    -------------
    Event ${eventType} at ${idx} received, block: ${header.number.toNumber()}, extrinsic: ${extSection}/${extMethod}:
    -------------
      ${JSON.stringify(event.toJSON(), null, 2)} ${JSON.stringify(
        event.toHuman(),
        null,
        2,
      )}
    =============
    `,
  );
};

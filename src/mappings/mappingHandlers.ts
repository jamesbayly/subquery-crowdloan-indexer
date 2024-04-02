import {
  SubstrateExtrinsic,
  SubstrateEvent,
  SubstrateBlock,
} from "@subql/types";
import { Balance } from "@polkadot/types/interfaces";
import * as Storage from "../services/storage";
import { Chronicle } from "../types/models/Chronicle";
import { ChronicleKey } from "../constants";
import {
  onParachainRegistered,
  onCrowdloanCreated,
  onCrowdloanContributed,
  onCrowdloanDissolved,
} from "../handlers/parachain-handlers";
import { onSlotsLeased, onNewLeasePeriod } from "../handlers/lease-handlers";
import { getEventLogger } from "../utils";
import {
  onAuctionStarted,
  onAuctionClosed,
  onAuctionWinningOffset,
  onBidAccepted,
} from "../handlers/auction-handler";

export async function handleParachainRegistered(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onParachainRegistered(substrateEvent);
}

export async function handleCrowdloanCreated(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onCrowdloanCreated(substrateEvent);
}

export async function handleCrowdloanContributed(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onCrowdloanContributed(substrateEvent);
}

// export async function handleCrowdloanAllRefunded(substrateEvent: SubstrateEvent): Promise<void> {
//   getEventLogger(substrateEvent);
//   await onCrowdloanAllRefunded(substrateEvent);
// }

export async function handleCrowdloanDissolved(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onCrowdloanDissolved(substrateEvent);
}

export async function handleSlotsLeased(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onSlotsLeased(substrateEvent);
}

export async function handleNewLeasePeriod(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onNewLeasePeriod(substrateEvent);
}

export async function handleAuctionStarted(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onAuctionStarted(substrateEvent);
}

export async function handleAuctionClosed(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onAuctionClosed(substrateEvent);
}

export async function handleAuctionWinningOffset(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onAuctionWinningOffset(substrateEvent);
}

export async function handleBidAccepted(
  substrateEvent: SubstrateEvent,
): Promise<void> {
  getEventLogger(substrateEvent);
  await onBidAccepted(substrateEvent);
}

const init = async () => {
  const chronicle = await Chronicle.get(ChronicleKey);
  if (!chronicle) {
    logger.info("Setup Chronicle");
    await Chronicle.create({ id: ChronicleKey })
      .save()
      .catch((err) => logger.error(err));
  }
};

init();

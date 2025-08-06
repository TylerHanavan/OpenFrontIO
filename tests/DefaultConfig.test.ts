import { DefaultConfig } from "../src/core/configuration/DefaultConfig";
import {
  Difficulty,
  GameMapType,
  GameMode,
  GameType,
  Player,
  PlayerType,
  UnitType,
} from "../src/core/game/Game";
import { GameConfig } from "../src/core/Schemas";

describe("DefaultConfig", () => {
  const mockServerConfig = {
    infiniteGold: () => false,
  } as any;

  const baseGameConfig: GameConfig = {
    bots: 0,
    instantBuild: false,
    infiniteGold: false,
    infiniteTroops: false,
    disabledUnits: [],
    difficulty: Difficulty.Medium,
    gameMap: GameMapType.Africa,
    gameType: GameType.Public,
    gameMode: GameMode.FFA,
    disableNPCs: false,
  };

  const config = new DefaultConfig(
    mockServerConfig,
    baseGameConfig,
    null,
    false,
  );

  // Do Map<UnitType, Map<number, bigint>> and add all to beforeAll, then iterate in a test
  let costScaling: Map<number, bigint>;

  beforeAll(async () => {
    costScaling = new Map<number, bigint>();
    for (let x = 0; x < 4; x++) {
      costScaling.set(x, BigInt(250_000 * (x + 1)));
    }
    for (let x = 4; x < 20; x++) {
      costScaling.set(x, BigInt(1_000_000));
    }
    for (let x = 20; x < 300; x++) {
      costScaling.set(x, BigInt(1_000_000 + (x - 19) * 50_000));
    }
  });

  test("Warship cost is calculated correctly", () => {
    let runningSum: bigint = 0n;
    for (const [num, expectedCost] of costScaling.entries()) {
      const mockPlayer = {
        type: () => PlayerType.Human,
        unitsConstructed: (t: UnitType) => (t === UnitType.Warship ? num : 0),
        unitsOwned: (t: UnitType) => (t === UnitType.Warship ? num : 0),
      } as Partial<Player> as Player;
      runningSum += expectedCost;
      const constructed: number = mockPlayer.unitsConstructed(UnitType.Warship);
      const info = config.unitInfo(UnitType.Warship);
      //console.log(`${num} => ` + expectedCost + ` (player has constructed ${constructed} warships), running cost: ${runningSum}`);
      expect(info.cost(mockPlayer)).toBe(expectedCost);
    }
  });

  test("throws for unknown UnitType", () => {
    expect(() => config.unitInfo("NotARealUnit" as UnitType)).toThrow();
  });
});

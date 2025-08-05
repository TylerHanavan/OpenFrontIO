import { AttackExecution } from "../../../src/core/execution/AttackExecution";
import { SpawnExecution } from "../../../src/core/execution/SpawnExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../../src/core/game/Game";
import { TileRef } from "../../../src/core/game/GameMap";
import { setup } from "../../util/Setup";
import {
  mockAllowAttackDisconnectedTeammates,
  mockPlayerAlliance,
  mockPlayerDisconnected,
  mockPlayersSameTeam,
} from "../../util/utils";

describe("AttackExecution", () => {
  let game: Game; // The game
  let attacker: Player; // The attacker
  let defender: Player; // The target
  let attackerSpawn: TileRef; // The player spawn
  let defenderSpawn: TileRef; // The target spawn

  beforeEach(async () => {
    // Setup a new game on the "ocean_and_land" map, with infiniteGold and infiniteBuild flags turned on
    game = await setup("ocean_and_land", {
      infiniteGold: true,
      instantBuild: true,
    });

    // Create the attacker Player
    attacker = game.addPlayer(
      new PlayerInfo("Origin", PlayerType.Human, "1", "1"),
    );

    // Create the target Player
    defender = game.addPlayer(
      new PlayerInfo("Destination", PlayerType.Human, "2", "2"),
    );

    // Set both player's troops to 1,000
    attacker.setTroops(80000);
    defender.setTroops(1000);

    // Spawn point for attacker
    attackerSpawn = game.map().ref(7, 4);
    // Spawn point for target
    defenderSpawn = game.map().ref(7, 8);

    // Add a SpawnExecution for each player
    game.addExecution(
      new SpawnExecution(game.player(attacker.id()).info(), attackerSpawn),
      new SpawnExecution(game.player(defender.id()).info(), defenderSpawn),
    );

    // Keep stepping 1 tick until the spawn phase ends (and the game starts)
    while (game.inSpawnPhase()) {
      game.executeNextTick();
    }

    // Step 2 ticks
    game.executeNextTick();
    game.executeNextTick();
  });

  test("expect game config, map and player to be properly setup", async () => {
    // Ensure the game has the attacker
    expect(game.hasPlayer("1")).toBe(true);
    // Ensure the game has the target
    expect(game.hasPlayer("2")).toBe(true);

    // Ensure both players are alive
    expect(attacker.isAlive()).toBe(true);
    expect(defender.isAlive()).toBe(true);

    // Loop through every tile in the map (x,y)
    for (let x = 0; x < 15; x++) {
      for (let y = 0; y < 15; y++) {
        // Ensure every tile with x less than 7 is Land
        if (x < 7) expect(game.map().isLand(game.map().ref(x, y))).toBe(true);

        // Ensure every tile with x = y is Shore and is OceanShore
        if (x === 7) {
          expect(game.map().isShore(game.map().ref(x, y))).toBe(true);
          expect(game.map().isOceanShore(game.map().ref(x, y))).toBe(true);
        }
        // Ensure every tile with x greater than 7 (besides (14,6), (14,7), and (14,8)) are Water tiles
        if (x > 7)
          expect(game.map().isWater(game.map().ref(x, y))).toBe(
            x !== 14 ? true : y < 6 || y > 8,
          );
      }
    }

    // Ensure (14,6), (14,7), and (14,8) are land tiles
    for (let x = 6; x < 8; x++) {
      expect(game.map().isLand(game.map().ref(x, 14))).toBe(true);
    }

    // Ensure the attacker owns the attacker spawn
    expect(game.map().ownerID(attackerSpawn)).toBe(1);
    // Ensure the target owns the target spawn
    expect(game.map().ownerID(defenderSpawn)).toBe(2);
  });

  test("test with different team, non-allianced players, target is disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    mockAllowAttackDisconnectedTeammates(false, game);
    mockPlayerDisconnected(true, defender);
    testAttack(true, false, false);
  });

  test("test with different team, non-allianced players, target is not disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    mockAllowAttackDisconnectedTeammates(false, game);
    mockPlayerDisconnected(false, defender);
    testAttack(true, false, false);
  });

  test("test with different team, non-allianced players, target is not disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    mockAllowAttackDisconnectedTeammates(true, game);
    mockPlayerDisconnected(false, defender);
    testAttack(true, false, false);
  });

  test("test with different team, non-allianced players, target is disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    mockAllowAttackDisconnectedTeammates(true, game);
    mockPlayerDisconnected(true, defender);
    testAttack(true, false, false);
  });

  test("test with allianced players, target is disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    mockAllowAttackDisconnectedTeammates(false, game);
    mockPlayerDisconnected(true, defender);
    testAttack(false, false, true);
  });

  test("test with same team players, target is disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    mockAllowAttackDisconnectedTeammates(false, game);
    mockPlayerDisconnected(true, defender);
    testAttack(false, true, false);
  });

  test("test with allianced players, target is disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    mockAllowAttackDisconnectedTeammates(true, game);
    mockPlayerDisconnected(true, defender);
    testAttack(false, false, true);
  });

  test("test with same team players, target is disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    mockAllowAttackDisconnectedTeammates(true, game);
    mockPlayerDisconnected(true, defender);
    testAttack(true, true, false);
  });

  test("test with allianced players, target is not disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    mockAllowAttackDisconnectedTeammates(false, game);
    mockPlayerDisconnected(false, defender);
    testAttack(false, false, true);
  });

  test("test with same team players, target is not disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    mockAllowAttackDisconnectedTeammates(false, game);
    mockPlayerDisconnected(false, defender);
    testAttack(false, true, false);
  });

  test("test with allianced players, target is not disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    mockAllowAttackDisconnectedTeammates(true, game);
    mockPlayerDisconnected(false, defender);
    testAttack(false, false, true);
  });

  test("test with same team players, target is not disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    mockAllowAttackDisconnectedTeammates(true, game);
    mockPlayerDisconnected(false, defender);
    testAttack(false, true, false);
  });

  function doAttack(attacker: Player, defender: Player, troops: number) {
    const attackExec = new AttackExecution(troops, attacker, defender.id());
    game.addExecution(attackExec);
    return attackExec;
  }

  function testAttack(
    expectAttackSuccessful: boolean,
    sameTeam: boolean,
    allied: boolean,
  ) {
    if (allied && sameTeam)
      throw new Error(
        "testAttack(): players should not be allied and on the same team",
      );
    if (allied) mockPlayerAlliance(game, attacker, defender);
    if (sameTeam) mockPlayersSameTeam(attacker, defender);

    const attackExec: AttackExecution = doAttack(attacker, defender, 20000);
    game.executeNextTick();

    if (expectAttackSuccessful) {
      expect(attackExec.isActive()).toBe(true);
      expect(attacker.outgoingAttacks().length).toBe(0);
    }

    expect(defender.isAlive()).toBe(true);

    expect(defender.tiles().size).toBeGreaterThan(0);

    let counter = 0;

    while (attackExec.isActive()) {
      game.executeNextTick();
      if (counter++ > 1000)
        throw new Error(
          "testAttack(): it took too long to finish the AttackExecution",
        );
    }
    expect(attacker.unitCount(UnitType.TransportShip)).toBe(0);

    if (expectAttackSuccessful) {
      expect(defender.tiles().size).toBe(0);
    } else {
      expect(defender.tiles().size).toBeGreaterThan(0);
    }
  }
});

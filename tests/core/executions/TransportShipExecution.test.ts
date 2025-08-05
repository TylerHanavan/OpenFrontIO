import { SpawnExecution } from "../../../src/core/execution/SpawnExecution";
import { TransportShipExecution } from "../../../src/core/execution/TransportShipExecution";
import { AllianceRequestExecution } from "../../../src/core/execution/alliance/AllianceRequestExecution";
import { AllianceRequestReplyExecution } from "../../../src/core/execution/alliance/AllianceRequestReplyExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../../src/core/game/Game";
import { TileRef } from "../../../src/core/game/GameMap";
import { targetTransportTile } from "../../../src/core/game/TransportShipUtils";
import { setup } from "../../util/Setup";

/**
 * Scenarios that need to be tested for TransportShipExecution
 * - The TransportShipExecution succeeds and results in the destination tile being conquered under the following conditions
 *   - The target is not on the same team as the attacker
 *   - The target is is on the same team as the attacker AND the target is disconnected AND the allowAttackDisconnecedTeammates flag is on
 * - The TransportShipExecution fails and does not result in the destination tile being conquered under the following conditions
 *   - The target is on the same team as the attacker AND the target is disconnected AND the allowAttackDisconnecedTeammates flag is off
 *   - The target is on the same team as the attacker AND the target is not disconnected AND the allowAttackDisconnecedTeammates flag is on
 */

describe("TransportShipExecution", () => {
  let game: Game; // The game
  let origOwner: Player; // The attacker
  let dstOwner: Player; // The target
  let srcTile: TileRef; // The player spawn
  let dstTile: TileRef; // The target spawn

  beforeEach(async () => {
    // Setup a new game on the "ocean_and_land" map, with infiniteGold and infiniteBuild flags turned on
    game = await setup("ocean_and_land", {
      infiniteGold: true,
      instantBuild: true,
    });

    // Create the attacker Player
    origOwner = game.addPlayer(
      new PlayerInfo("Origin", PlayerType.Human, "1", "1"),
    );

    // Create the target Player
    dstOwner = game.addPlayer(
      new PlayerInfo("Destination", PlayerType.Human, "2", "2"),
    );

    // Spawn point for attacker
    srcTile = game.map().ref(7, 4);
    // Spawn point for target
    dstTile = game.map().ref(7, 11);

    // Add a SpawnExecution for each player
    game.addExecution(
      new SpawnExecution(game.player(origOwner.id()).info(), srcTile),
      new SpawnExecution(game.player(dstOwner.id()).info(), dstTile),
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

    // Ensure the game config's boatMaxNumber is not 0
    expect(game.config().boatMaxNumber()).toBeGreaterThan(0);

    // Ensure the attacker owns the attacker spawn
    expect(game.map().ownerID(srcTile)).toBe(1);
    // Ensure the target owns the target spawn
    expect(game.map().ownerID(dstTile)).toBe(2);

    // Ensure targetTransportTile() does not return null (i.e. there is a path to send the ship to the dstTile)
    expect(targetTransportTile(game, dstTile)).not.toBeNull();
  });

  test("test with non-teammate players", async () => {
    // Spawn the TransportShipExecution and run the test suite, ignoring the Config.allowAttackDisconnectedTeammates flag and (attacker) Player.isDisconnected flag
    // Expect a TransportShip unit to be sent
    // Do not mark the players as being on the same team
    testSendingBoat(true, false, false);
  });

  test("test with teammate players, but neither is disconnected", async () => {
    // Spawn the TransportShipExecution and run the test suite, ignoring the Config.allowAttackDisconnectedTeammates flag and (attacker) Player.isDisconnected flag
    // Do not expect a TransportShip unit to be sent
    // Mark the players as being on the same team
    testSendingBoat(false, true, false);
  });

  test("test with teammate players, target is disconnected, but allowAttackDisconnectedTeammates turned off", async () => {
    // Mock the Config.allowAttackDisconnectedTeammates() function to return false
    jest
      .spyOn(game.config(), "allowAttackDisconnectedTeammates")
      .mockReturnValue(false);

    // For the attacker only: Mock the Player.isDisconnected() function to return true
    jest.spyOn(dstOwner, "isDisconnected").mockReturnValue(true);

    // Spawn the TransportShipExecution and run the test suite given the above conditions
    // Expect a TransportShip unit to be sent
    // Mark the players as being on the same team
    testSendingBoat(false, true, false);
  });

  test("test with teammate players, target is not disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    // Mock the Config.allowAttackDisconnectedTeammates() function to return true
    jest
      .spyOn(game.config(), "allowAttackDisconnectedTeammates")
      .mockReturnValue(true);

    // For the attacker only: Mock the Player.isDisconnected() function to return false
    jest.spyOn(dstOwner, "isDisconnected").mockReturnValue(false);

    // Spawn the TransportShipExecution and run the test suite given the above conditions
    // Do not expect a TransportShip unit to be sent
    // Mark the players as being on the same team
    testSendingBoat(false, true, false);
  });

  test("test with teammate players, target is disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    // Mock the Config.allowAttackDisconnectedTeammates() function to return true
    jest
      .spyOn(game.config(), "allowAttackDisconnectedTeammates")
      .mockReturnValue(true);

    // For the attacker only: Mock the Player.isDisconnected() function to return true
    jest.spyOn(dstOwner, "isDisconnected").mockReturnValue(true);

    // Spawn the TransportShipExecution and run the test suite given the above conditions
    // Expect a TransportShip unit to be sent
    // Mark the players as being on the same team
    testSendingBoat(true, true, false);
  });

  test("test with allianced players, target is not disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    // Mock the Config.allowAttackDisconnectedTeammates() function to return true
    jest
      .spyOn(game.config(), "allowAttackDisconnectedTeammates")
      .mockReturnValue(true);

    // For the attacker only: Mock the Player.isDisconnected() function to return false
    jest.spyOn(dstOwner, "isDisconnected").mockReturnValue(false);

    // Spawn the TransportShipExecution and run the test suite given the above conditions
    // Do not expect a TransportShip unit to be sent
    // Mark the players as being allianced
    testSendingBoat(false, false, true);
  });

  test("test with allianced players, target is not disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    // Mock the Config.allowAttackDisconnectedTeammates() function to return false
    jest
      .spyOn(game.config(), "allowAttackDisconnectedTeammates")
      .mockReturnValue(false);

    // For the attacker only: Mock the Player.isDisconnected() function to return false
    jest.spyOn(dstOwner, "isDisconnected").mockReturnValue(false);

    // Spawn the TransportShipExecution and run the test suite given the above conditions
    // Do not expect a TransportShip unit to be sent
    // Mark the players as being allianced
    testSendingBoat(false, false, true);
  });

  test("test with allianced players, target is disconnected, and allowAttackDisconnectedTeammates turned on", async () => {
    // Mock the Config.allowAttackDisconnectedTeammates() function to return true
    jest
      .spyOn(game.config(), "allowAttackDisconnectedTeammates")
      .mockReturnValue(true);

    // For the attacker only: Mock the Player.isDisconnected() function to return true
    jest.spyOn(dstOwner, "isDisconnected").mockReturnValue(true);

    // Spawn the TransportShipExecution and run the test suite given the above conditions
    // Do not expect a TransportShip unit to be sent
    // Mark the players as being allianced
    testSendingBoat(false, false, true);
  });

  test("test with allianced players, target is disconnected, and allowAttackDisconnectedTeammates turned off", async () => {
    // Mock the Config.allowAttackDisconnectedTeammates() function to return false
    jest
      .spyOn(game.config(), "allowAttackDisconnectedTeammates")
      .mockReturnValue(false);

    // For the attacker only: Mock the Player.isDisconnected() function to return true
    jest.spyOn(dstOwner, "isDisconnected").mockReturnValue(true);

    // Spawn the TransportShipExecution and run the test suite given the above conditions
    // Do not expect a TransportShip unit to be sent
    // Mark the players as being allianced
    testSendingBoat(false, false, true);
  });

  function testSendingBoat(
    expectShipSent: boolean,
    sameTeam: boolean,
    allianced: boolean,
  ) {
    if (sameTeam === allianced && allianced === true)
      throw new Error(
        "testSendingBoat(): Do not call this function with `sameTeam` and `allianced` flags both set to `true`",
      );

    if (allianced) {
      // For the attacker only: Mock the Player.canSendAllianceRequest function to return true
      jest.spyOn(origOwner, "canSendAllianceRequest").mockReturnValue(true);

      //For both players: Mock the Player.isAlive function to return true
      jest.spyOn(dstOwner, "isAlive").mockReturnValue(true);
      jest.spyOn(origOwner, "isAlive").mockReturnValue(true);

      // Generate an alliance request
      game.addExecution(new AllianceRequestExecution(origOwner, dstOwner.id()));
      // Step 2 ticks
      game.executeNextTick();
      game.executeNextTick();

      // Generate an alliance accept reply
      game.addExecution(
        new AllianceRequestReplyExecution(origOwner.id(), dstOwner, true),
      );
      // Step 2 ticks
      game.executeNextTick();
      game.executeNextTick();

      // Ensure both players are allianced with each other
      expect(origOwner.allianceWith(dstOwner)).toBeTruthy();
      expect(dstOwner.allianceWith(origOwner)).toBeTruthy();
    }

    // Mock the Player.team() function to return "Red" if sameTeam flag is turned on
    if (sameTeam) {
      jest.spyOn(origOwner, "team").mockReturnValue("Red");
      jest.spyOn(dstOwner, "team").mockReturnValue("Red");
    }

    // Spawn and begin the TransportShipExecution
    const boatExec: TransportShipExecution = createBoat(
      origOwner,
      "2",
      dstTile,
      100000,
      srcTile,
    );

    // Ensure the boat exec is active
    expect(boatExec.isActive()).toBe(true);

    // Ensure the boat has not spawned yet
    expect(origOwner.unitCount(UnitType.TransportShip)).toBe(0);
    expect(boatExec["boat"]).toBeFalsy();

    // Step 2 ticks
    game.executeNextTick();
    game.executeNextTick();

    // TransportShipExecution active status === expectShipSent
    expect(boatExec.isActive()).toBe(expectShipSent);

    // If we are not expecting the boat to be sent, ensure there's 0 boats, and return
    if (expectShipSent === false) {
      expect(origOwner.unitCount(UnitType.TransportShip)).toBe(0);
      expect(game.map().ownerID(dstTile)).toBe(2);
      return;
    }

    // Ensure boat has spawned
    expect(origOwner.unitCount(UnitType.TransportShip)).toBe(1);
    expect(boatExec["boat"]).toBeTruthy();

    // Step 1 tick
    game.executeNextTick();

    // Ensure the boat exec is still active after three ticks
    expect(boatExec.isActive()).toBe(true);

    // Get the TransportShip unit's current TileRef
    let shipTile: TileRef = boatExec["boat"].tile();

    // Step 1 tick three times, ensure the boat moves position each time
    for (let x = 0; x < 3; x++) {
      // Step 1 tick
      game.executeNextTick();

      // Ensure the TransportShip unit's current TileRef has changed
      expect(boatExec["boat"].tile()).not.toBe(shipTile);

      // Get the TransportShip unit's current TileRef
      shipTile = boatExec["boat"].tile();
    }

    // Step 10 ticks
    for (let x = 0; x < 10; x++) game.executeNextTick();

    // Ensure the boat exec is inactive after all the above ticks
    expect(boatExec.isActive()).toBe(false);

    // Ensure the target tile was conquered by the attacking player
    expect(game.map().ownerID(dstTile)).toBe(1);
  }

  // Spawn and begin the TransportShipExecution
  function createBoat(
    origOwner: Player,
    targetId: string,
    dstTile: TileRef,
    troops: number,
    srcTile: TileRef,
  ) {
    const transportShipExecution: TransportShipExecution =
      new TransportShipExecution(origOwner, targetId, dstTile, troops, srcTile);
    game.addExecution(transportShipExecution);
    return transportShipExecution;
  }
});

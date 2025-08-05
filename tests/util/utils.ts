// Either someone can straight up call player.buildUnit. It's simpler and immediate (no tick required)
// Either someone can straight up call player.buildUnit. It's simpler and immediate (no tick required)
// However buildUnit do not create executions (e.g.: WarshipExecution)
// If you also need execution use function below. Does not work with things not

import { ConstructionExecution } from "../../src/core/execution/ConstructionExecution";
import { Game, Player, UnitType } from "../../src/core/game/Game";

import { AllianceRequestExecution } from "../../src/core/execution/alliance/AllianceRequestExecution";
import { AllianceRequestReplyExecution } from "../../src/core/execution/alliance/AllianceRequestReplyExecution";

// built via UI (e.g.: trade ships)
export function constructionExecution(
  game: Game,
  _owner: Player,
  x: number,
  y: number,
  unit: UnitType,
  ticks = 4,
) {
  game.addExecution(new ConstructionExecution(_owner, unit, game.ref(x, y)));

  // 4 ticks by default as it usually goes like this
  // Init of construction execution
  // Exec construction execution
  // Tick of construction execution which adds the execution related to the building/unit
  // First tick of the execution of the constructed building/unit
  // (sometimes step 3 and 4 are merged in one)

  for (let i = 0; i < ticks; i++) {
    game.executeNextTick();
  }
}

export function executeTicks(game: Game, numTicks: number): void {
  for (let i = 0; i < numTicks; i++) {
    game.executeNextTick();
  }
}

export function mockPlayerAlliance(
  game: Game,
  sender: Player,
  receiver: Player,
) {
  // For the attacker only: Mock the Player.canSendAllianceRequest function to return true
  jest.spyOn(sender, "canSendAllianceRequest").mockReturnValue(true);

  jest.spyOn(sender, "isDisconnected").mockReturnValue(true);
  jest.spyOn(receiver, "isDisconnected").mockReturnValue(true);

  // Generate an alliance request
  game.addExecution(new AllianceRequestExecution(sender, receiver.id()));
  // Step 2 ticks
  game.executeNextTick();
  game.executeNextTick();

  // Generate an alliance accept reply
  game.addExecution(
    new AllianceRequestReplyExecution(sender.id(), receiver, true),
  );
  // Step 2 ticks
  game.executeNextTick();
  game.executeNextTick();
}

export function mockPlayersSameTeam(player1: Player, player2: Player) {
  jest.spyOn(player1, "team").mockReturnValue("Red");
  jest.spyOn(player2, "team").mockReturnValue("Red");
}

export function mockAllowAttackDisconnectedTeammates(
  status: boolean,
  game: Game,
) {
  jest
    .spyOn(game.config(), "allowAttackDisconnectedTeammates")
    .mockReturnValue(status);
}

export function mockPlayerDisconnected(status: boolean, ...players: Player[]) {
  for (const player of players) {
    jest.spyOn(player, "isDisconnected").mockReturnValue(status);
  }
}

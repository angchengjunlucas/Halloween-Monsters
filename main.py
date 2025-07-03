# main.py

import random
from collections import deque

class Weapon:
    def __init__(self, name, attack_power):
        self.name = name
        self.attack_power = attack_power

    def __repr__(self):
        return f"{self.name}(ATK={self.attack_power})"

class Monster:
    """
    Now includes a 'name' field (string) alongside id, health, loot.
    """
    def __init__(self, monster_id: int, name: str, health: int, loot_weapon: Weapon):
        self.id = monster_id
        self.name = name
        self.max_health = health
        self.loot = loot_weapon
        self.health = health
        self.status_effects = {"poison": 0, "ice_locked": False}

    def apply_poison(self):
        if self.status_effects["poison"] > 0:
            self.health -= 1
            self.status_effects["poison"] -= 1

    def is_alive(self):
        return self.health > 0

    def __repr__(self):
        return (
            f"Monster(id={self.id}, name={self.name}, "
            f"health={self.health}, max_health={self.max_health}, loot={self.loot})"
        )

class Player:
    def __init__(self, name):
        self.name = name
        self.alliance = None
        self.vp = 5
        self.weapons = [Weapon("Dagger", 3)]
        self.dynamite_pending = False

    def add_weapon(self, weapon):
        self.weapons.append(weapon)

    def remove_weapon(self, weapon):
        if weapon in self.weapons:
            self.weapons.remove(weapon)

    def __repr__(self):
        return f"Player(name={self.name}, vp={self.vp}, weapons={self.weapons})"

class Alliance:
    def __init__(self, name, players):
        self.name = name
        self.players = players
        for p in players:
            p.alliance = self

    def exchange_points(self, transfers):
        total_old = sum(p.vp for p in self.players)
        total_new = sum(transfers[p] for p in self.players)
        if total_old != total_new:
            raise ValueError("Total VP must remain unchanged in alliance exchange.")
        for p in self.players:
            if transfers[p] < 1:
                raise ValueError(f"Player {p.name} must have at least 1 VP.")
        for p in self.players:
            p.vp = transfers[p]

    def average_vp(self):
        return sum(p.vp for p in self.players) / len(self.players)

    def __repr__(self):
        return f"Alliance(name={self.name}, players={[p.name for p in self.players]})"

class GameEngine:
    def __init__(self, player_names, monster_data, faction_lists, initial_field_size=3):
        # Create Player objects
        self.players = [Player(name) for name in player_names]
        name_to_player = {p.name: p for p in self.players}

        # Create Alliance objects
        self.alliances = []
        for idx, group in enumerate(faction_lists, start=1):
            obj_group = [name_to_player[name] for name in group]
            self.alliances.append(Alliance(f"Faction_{idx}", obj_group))

        # Build and shuffle reserve of monsters
        # monster_data is a list of tuples: (id, health, loot Weapon)
        reserve = []
        for (mid, health, loot) in monster_data:
            # Name each monster "Monster {mid}"
            m = Monster(monster_id=mid, name=f"Monster {mid}", health=health, loot_weapon=loot)
            reserve.append(m)
        random.shuffle(reserve)
        self.reserve = deque(reserve)

        # Fill initial battlefield
        self.battlefield = []
        for _ in range(initial_field_size):
            if self.reserve:
                self.battlefield.append(self.reserve.popleft())

        # Map of submitted moves: player_name -> (position, weapon_name)
        self.submitted_moves = {}

        # Cache for turn order
        self.current_turn_order = None

        # NEW: keep a running kill history (list of strings)
        self.kill_history = []

    def get_turn_order(self):
        # Use cached order if it exists
        if self.current_turn_order is not None:
            return self.current_turn_order

        # Otherwise, compute (sort by vp, randomize ties)
        players_sorted = sorted(self.players, key=lambda p: p.vp, reverse=True)
        turn_order = []
        i = 0
        while i < len(players_sorted):
            tie_group = [players_sorted[i]]
            j = i + 1
            while j < len(players_sorted) and players_sorted[j].vp == players_sorted[i].vp:
                tie_group.append(players_sorted[j])
                j += 1
            random.shuffle(tie_group)
            turn_order.extend(tie_group)
            i = j

        self.current_turn_order = turn_order
        return turn_order

    def get_battlefield_status(self):
        status = []
        for idx, m in enumerate(self.battlefield, start=1):
            status.append({
                'position': idx,
                'name': m.name,               # NEW
                'health': m.health,
                'max_health': m.max_health,
                'loot': m.loot.name if m.loot else None
            })
        return status

    def get_reserve_status(self):
        status = []
        for idx, m in enumerate(self.reserve, start=1):
            status.append({
                'position': idx,
                'name': m.name,               # NEW
                'health': m.max_health,
                'loot': m.loot.name if m.loot else None
            })
        return status

    def get_player_weapons(self, player_name):
        p = next(pl for pl in self.players if pl.name == player_name)
        return [(w.name, w.attack_power) for w in p.weapons]

    def submit_move(self, player_name, position, weapon_name):
        self.submitted_moves[player_name] = (position, weapon_name)

    def resolve_round(self):
        # Use cached turn order
        turn_order = self.get_turn_order()

        kill_announcements = []
        for p in turn_order:
            if p.name not in self.submitted_moves:
                continue
            pos, weapon_name = self.submitted_moves[p.name]
            if pos < 1 or pos > len(self.battlefield):
                continue

            target = self.battlefield[pos - 1]
            if not target.is_alive():
                continue

            weapon = next((w for w in p.weapons if w.name == weapon_name), None)
            if weapon is None:
                continue

            if weapon.name == "Dynamite":
                p.dynamite_pending = True
                p.remove_weapon(weapon)
                continue

            dmg = weapon.attack_power
            if weapon.name != "Dagger":
                p.remove_weapon(weapon)

            if weapon.name == "Ice":
                target.status_effects['ice_locked'] = True

            if weapon.name == "Poison":
                target.status_effects['poison'] = target.health - 1
                dmg = 0

            if dmg > 0:
                target.health -= dmg

            if target.health <= 0:
                # Monster dies from this hit
                p.vp += target.max_health
                announcement = f"{p.name} killed {target.name}"
                kill_announcements.append(announcement)
                self.kill_history.append(announcement)  # NEW: record history

                if target.loot:
                    p.add_weapon(target.loot)
                self.battlefield.remove(target)
                if self.reserve:
                    self.battlefield.append(self.reserve.popleft())

        # Apply poison effects after all attacks
        for monster in list(self.battlefield):
            monster.apply_poison()
            if not monster.is_alive():
                # We record poison kill as well
                announcement = f"{monster.name} died from poison"
                kill_announcements.append(announcement)
                self.kill_history.append(announcement)  # NEW

                self.battlefield.remove(monster)
                if self.reserve:
                    self.battlefield.append(self.reserve.popleft())

        # Clear moves and turn order for next round
        self.submitted_moves.clear()
        self.current_turn_order = None

        return kill_announcements

    def is_game_over(self):
        return not self.battlefield and not self.reserve

    def get_winner(self):
        averages = [(a.average_vp(), a) for a in self.alliances]
        return max(averages, key=lambda x: x[0])[1]

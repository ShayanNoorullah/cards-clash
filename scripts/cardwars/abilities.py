"""
Rules for every ability text in the CARD INFO EXTRACTOR data.

Each entry maps the printed text (matched case-insensitively, ignoring extra
spaces and trailing periods) to the engine's effect list. The printed text is
shown on the card unchanged; this file only decides what it does.

Interpretation notes (where the printed text is vague):
- "adjacent creatures" are your creatures in the lanes next to this one.
- Stat changes are permanent unless the text names a duration.
- "Critical/defence area" bonuses (from the original game's timing mini-game)
  become stat bonuses: +X% area -> +(X-100)% ATK this turn / DEF until your next turn.
- "Return any card from the Discard Pile" returns your most valuable matching card.
"""


def P(of, mul=1, **kw):
    """A scaled amount: mul * quantity."""
    out = {'of': of}
    if mul != 1:
        out['mul'] = mul
    out.update(kw)
    return out


FULL = P('targetDamage')  # heal all damage


def dmg(target, amount, **kw):
    return {'type': 'damage', 'target': target, 'amount': amount, **kw}


def heal(target, amount, **kw):
    return {'type': 'heal', 'target': target, 'amount': amount, **kw}


def buff(target, atk=0, df=0, **kw):
    return {'type': 'buff', 'target': target, 'atk': atk, 'def': df, **kw}


def eff(effect_type, **kw):
    return {'type': effect_type, **kw}


SELF, OPP, ADJ = 'self', 'opposingCreature', 'adjacentAllies'
ALLIES, ENEMIES, ALL = 'allAllyCreatures', 'allEnemyCreatures', 'allCreatures'
CH_ANY, CH_ENEMY, CH_ALLY = 'chosenCreature', 'chosenEnemyCreature', 'chosenAllyCreature'
HERO, EHERO = 'ownHero', 'enemyHero'
LAND = {'plains': 'azure', 'corn': 'golden', 'swamp': 'murk', 'sand': 'dune', 'nice': 'candy', 'rainbow': 'neutral'}


def only(land):
    return {'landscape': LAND[land]}


FLOOP = {
    "+1 Attack.": [buff(SELF, 1)],
    "+13 Attack.": [buff(SELF, 13)],
    "+2 Attack for each of your Corn landscapes.": [buff(SELF, P('ownLandscapesOf', 2, landscape='golden'))],
    "+2 Attack.": [buff(SELF, 2)],
    "+3 Attack for every card in your hand.": [buff(SELF, P('handSize', 3))],
    "+9 Defense to a random creature on the field, including your opponents..": [buff('randomCreature', 0, 9)],
    "Activate an adjacent creature's Floop Ability if applicable.": [eff('activateFloop', target=ADJ)],
    "Adjacent creatures gain +13 Defense.": [buff(ADJ, 0, 13)],
    "Adjacent creatures gain +2 Attack.": [buff(ADJ, 2)],
    "Adjacent creatures gain +3 Attack.": [buff(ADJ, 3)],
    "Adjacent creatures gain +3 Defense.": [buff(ADJ, 0, 3)],
    "Adjacent creatures gain +4 Attack.": [buff(ADJ, 4)],
    "Adjacent creatures gain +4 Defense.": [buff(ADJ, 0, 4)],
    "Adjacent creatures gain +5 Defense.": [buff(ADJ, 0, 5)],
    "Adjacent creatures gain +9 Attack.": [buff(ADJ, 9)],
    "Adjacent creatures heal 6 points.": [heal(ADJ, 6)],
    "All of your creatures gain +5 Defense": [buff(ALLIES, 0, 5)],
    "All your creatures gain +4 Attack.": [buff(ALLIES, 4)],
    "All your creatures gain +5 Attack.": [buff(ALLIES, 5)],
    "Choose a creature and give it +6 Attack.": [buff(CH_ANY, 6)],
    "Choose a creature and heal 3 points for each of your different landscapes.": [heal(CH_ANY, P('ownLandscapeTypes', 3))],
    "Choose a creature and heal it 5 points for every creature you Flooped this turn.": [heal(CH_ANY, P('floopsThisTurn', 5))],
    "Choose a creature and raise its Attack 4 points for each building you control.": [buff(CH_ANY, P('ownBuildings', 4))],
    "Choose a friendly creature and negate all Damage, Defense, and Attack modifiers on it.": [eff('reset', target=CH_ALLY)],
    "Choose a friendly creature and raise its Defense by 4 for every creature you Flooped this turn.": [buff(CH_ALLY, 0, P('floopsThisTurn', 4))],
    "Choose an enemy creature and lower its Defense by 5 for every creature you Flooped this turn.": [buff(CH_ENEMY, 0, P('floopsThisTurn', -5))],
    "Choose an opposing Building and send it back to your opponent's hand.": [eff('returnBuilding', target='chosenEnemyBuilding')],
    "Choose an opposing creature and lower its Attack by 4.": [buff(CH_ENEMY, -4)],
    "Choose an opposing creature and lower its Defense by 2": [buff(CH_ENEMY, 0, -2)],
    "Choose an opposing creature and lower its Defense by 30.": [buff(CH_ENEMY, 0, -30)],
    "Choose an opposing creature and lower its Defense by 6.": [buff(CH_ENEMY, 0, -6)],
    "Choose an opposing creature. Deal 14 Damage to it and heal this creature 25 points.": [dmg(CH_ENEMY, 14), heal(SELF, 25)],
    "Choose an opposing creature. Deal 4 Damage to it and heal this creature 6 points.": [dmg(CH_ENEMY, 4), heal(SELF, 6)],
    "Choose an opposing creature. It cannot use its Floop ability next turn.": [eff('lockFloop', target=CH_ENEMY)],
    "Choose and opposing creature and lower its Defense by 2": [buff(CH_ENEMY, 0, -2)],
    "Choose one of your creature and heal it 3 points.": [heal(CH_ALLY, 3)],
    "Choose one of your creatures and give it +2 Defense.": [buff(CH_ALLY, 0, 2)],
    "Choose one of your creatures and give it +4 Defense each.": [buff(CH_ALLY, 0, 4)],
    "Choose one of your creatures and give it +4 Defense.": [buff(CH_ALLY, 0, 4)],
    "Choose one of your creatures and heal all Damage from it.": [heal(CH_ALLY, FULL)],
    "Choose one of your creatures and heal it 4 points for each card in your hand.": [heal(CH_ALLY, P('handSize', 4))],
    "Choose one of your creatures and heal it 4 points for each of your buildings.": [heal(CH_ALLY, P('ownBuildings', 4))],
    "Choose one of your creatures and heal it 4 points.": [heal(CH_ALLY, 4)],
    "Choose one of your creatures and heal it 6 points for each of your buildings.": [heal(CH_ALLY, P('ownBuildings', 6))],
    "Choose one of your creatures. Heal it and its adjacent creatures 3 points.": [heal(CH_ALLY, 3, splash=True)],
    "Creature in opposing lane cannot Attack next Battle Phase.": [eff('lockAttack', target=OPP)],
    "Creature in opposing lane cannot use Floop ability next turn.": [eff('lockFloop', target=OPP)],
    "Creature in the opposing lane cannot use its Floop ability next turn.": [eff('lockFloop', target=OPP)],
    "Damage all enemy creatures for 5 and take 5 damage in return.": [dmg(ENEMIES, 5), dmg(SELF, 5)],
    "Damage done to opposing creature next Battle Phase is transferred to Hero.": [eff('redirect', target=OPP)],
    "Deal 10 damage to all opposing creatures.": [dmg(ENEMIES, 10)],
    "Deal 10 damage to creature in opposing lane and heal this creature 6 points.": [dmg(OPP, 10), heal(SELF, 6)],
    "Deal 15 Damage to all opposing creatures.": [dmg(ENEMIES, 15)],
    "Deal 2 Damage for each card in your hand to the creature in the opposing lane.": [dmg(OPP, P('handSize', 2))],
    "Deal 2 Damage to all opposing creatures and heal all of your creatures 4 points.": [dmg(ENEMIES, 2), heal(ALLIES, 4)],
    "Deal 2 Damage to any opposing creature.": [dmg(CH_ENEMY, 2)],
    "Deal 2 Damage to creature in opposing lane and heal this creature 4 points.": [dmg(OPP, 2), heal(SELF, 4)],
    "Deal 2 Damage to creature in opposing lane for each of your different landscapes.": [dmg(OPP, P('ownLandscapeTypes', 2))],
    "Deal 2 Damage to opposing Hero for every card in your hand.": [dmg(EHERO, P('handSize', 2))],
    "Deal 2 Damage to the Opposing Hero.": [dmg(EHERO, 2)],
    "Deal 2 Damage to the opposing creature for each of your opponent's Discarded creatures.": [dmg(OPP, P('enemyDiscardCreatures', 2))],
    "Deal 2 damage to creature in the opposing lane.": [dmg(OPP, 2)],
    "Deal 20 Damage to creature in opposing lane and heal this creature 28 points.": [dmg(OPP, 20), heal(SELF, 28)],
    "Deal 20 damage to all opposing creatures.": [dmg(ENEMIES, 20)],
    "Deal 3 Damage for each card in your hand to the creature in the opposing lane.": [dmg(OPP, P('handSize', 3))],
    "Deal 3 Damage for each enemy building to the creature in the opposing lane.": [dmg(OPP, P('enemyBuildings', 3))],
    "Deal 3 Damage for each of your buildings to the creature in the opposing lane.": [dmg(OPP, P('ownBuildings', 3))],
    "Deal 3 Damage to creature in the opposing lane.": [dmg(OPP, 3)],
    "Deal 3 Damage to opposing Hero for every creature you Flooped this turn.": [dmg(EHERO, P('floopsThisTurn', 3))],
    "Deal 3 Damage to the creature in opposing lane.": [dmg(OPP, 3)],
    "Deal 3 Damage to the opposing creature and heal 3 points to this creature.": [dmg(OPP, 3), heal(SELF, 3)],
    "Deal 3 damage to creature in opposing lane and heal this creature 4 points.": [dmg(OPP, 3), heal(SELF, 4)],
    "Deal 3 damage to creature in the opposing lane and Discard this creature.": [dmg(OPP, 3), eff('destroy', target=SELF)],
    "Deal 33 Damage to any opposing Corn creature.": [dmg(CH_ENEMY, 33, filter=only('corn'))],
    "Deal 4 Damage for each card in your hand to the creature in the opposing lane.": [dmg(OPP, P('handSize', 4))],
    "Deal 4 Damage to any opposing creature.": [dmg(CH_ENEMY, 4)],
    "Deal 4 Damage to creature in opposing lane and heal this creature 5 points.": [dmg(OPP, 4), heal(SELF, 5)],
    "Deal 4 Damage to creature in opposing lane and its adjacent creatures.": [dmg(OPP, 4, splash=True)],
    "Deal 4 Damage to creature in the opposing lane and Discard this creature.": [dmg(OPP, 4), eff('destroy', target=SELF)],
    "Deal 4 Damage to opposing creature and its adjacent creatures.": [dmg(OPP, 4, splash=True)],
    "Deal 4 damage to a random creature, including your own.": [dmg('randomCreature', 4)],
    "Deal 4 damage to all opposing creatures.": [dmg(ENEMIES, 4)],
    "Deal 4 damage to creature in the opposing lane.": [dmg(OPP, 4)],
    "Deal 5 Damage to all opposing creatures.": [dmg(ENEMIES, 5)],
    "Deal 5 Damage to creature in opposing lane and damage this creature for 2 Damage.": [dmg(OPP, 5), dmg(SELF, 2)],
    "Deal 5 Damage to creature in opposing lane and heal this creature 5 points.": [dmg(OPP, 5), heal(SELF, 5)],
    "Deal 5 Damage to creature in opposing lane for each of your different landscapes.": [dmg(OPP, P('ownLandscapeTypes', 5))],
    "Deal 5 Damage to opposing creature for every creature you Flooped this turn.": [dmg(OPP, P('floopsThisTurn', 5))],
    "Deal 5 Damage to the opposing creature and Hero": [dmg(OPP, 5), dmg(EHERO, 5)],
    "Deal 5 Damage to the opposing creature and lower its Attack by 5.": [dmg(OPP, 5), buff(OPP, -5)],
    "Deal 5 damage to creature in the opposing lane.": [dmg(OPP, 5)],
    "Deal 7 damage to all opposing creatures.": [dmg(ENEMIES, 7)],
    "Deal 7 damage to creature in opposing lane and heal this creature 7 points": [dmg(OPP, 7), heal(SELF, 7)],
    "Deal 8 Damage to creature in opposing lane.": [dmg(OPP, 8)],
    "Deal Damage to creature in opposing equal to this creature's Defense.": [dmg(OPP, P('selfDef'))],
    "Deal Damage to the opposing creature equal to the Damage on this creature.": [dmg(OPP, P('selfDamage'))],
    "Deals 200% of the damage that it received last turn to the opposing creature.": [dmg(OPP, P('selfDamage', 2))],
    "Decrease the Attack of all Corn creatures by 1.": [buff(ALL, -1, filter=only('corn'))],
    "Destroy Building in the opposing lane.": [eff('destroyBuilding', target='opposingBuilding')],
    "Destroy a Building in the opposing lane.": [eff('destroyBuilding', target='opposingBuilding')],
    "Destroy this creature and gain 6 Magic Points this turn.": [eff('gainMp', amount=6), eff('destroy', target=SELF)],
    "Does 4 damage. If the defending creature card dies, the card is added into the attacker's hand instead of going into the defender's discard pile.": [dmg(OPP, 4, stealOnKill=True)],
    "Draw 1 Card.": [eff('draw', amount=1)],
    "Draw 3 card.": [eff('draw', amount=3)],
    "Draw one card and send this creature to the Discard Pile.": [eff('draw', amount=1), eff('destroy', target=SELF)],
    "For every 2 cards in your Discard Pile, deal 4 damage to creature in opposing lane.": [dmg(OPP, P('ownDiscard', 4, div=2))],
    "For every card in your Discard Pile, deal 3 Damage to creature in opposing lane.": [dmg(OPP, P('ownDiscard', 3))],
    "Fully heal all your creatures and destroy this creature.": [heal(ALLIES, FULL), eff('destroy', target=SELF)],
    "Gain +1 Attack for each adjacent empty lane.": [buff(SELF, P('adjacentEmptyLanes'))],
    "Gain +2 Attack and +3 Defense.": [buff(SELF, 2, 3)],
    "Gain +2 Attack for each adjacent empty lane.": [buff(SELF, P('adjacentEmptyLanes', 2))],
    "Gain +2 Defense.": [buff(SELF, 0, 2)],
    "Gain +2 Magic Points next turn.": [eff('gainMp', amount=2, nextTurn=True)],
    "Gain +3 Attack and +7 Defense.": [buff(SELF, 3, 7)],
    "Gain +4 Defense for each of your creatures.": [buff(SELF, 0, P('ownCreatures', 4))],
    "Gain +4 Defense.": [buff(SELF, 0, 4)],
    "Gain +7 Attack and +3 Defense.": [buff(SELF, 7, 3)],
    "Gain +8 Defense.": [buff(SELF, 0, 8)],
    "Gain 3 Magic Points next turn.": [eff('gainMp', amount=3, nextTurn=True)],
    "Heal adjacent creatures 2 points.": [heal(ADJ, 2)],
    "Heal adjacent creatures 3 points.": [heal(ADJ, 3)],
    "Heal adjacent creatures 5 points.": [heal(ADJ, 5)],
    "Heal adjacent creatures by this creature's current DEF and discard.": [heal(ADJ, P('selfDef')), eff('destroy', target=SELF)],
    "Heal adjacent creatures equal to the Damage on this creature.": [heal(ADJ, P('selfDamage'))],
    "Heal all Damage from this creature.": [heal(SELF, FULL)],
    "Heal all creatures for 5 and take 2 damage in return.": [heal(ALL, 5), dmg(SELF, 2)],
    "Heal all of your creatures 5 points.": [heal(ALLIES, 5)],
    "Heal this creature and adjacent creatures 4 points.": [heal(SELF, 4), heal(ADJ, 4)],
    "Heal this creature and adjacent creatures 5 points.": [heal(SELF, 5), heal(ADJ, 5)],
    "Heal your Hero 2 points.": [heal(HERO, 2)],
    "Heal your Hero 3 points for every creature you Flooped this turn.": [heal(HERO, P('floopsThisTurn', 3))],
    "Heal your Hero 5 points": [heal(HERO, 5)],
    "Heal your Hero equal to this creature's Attack.": [heal(HERO, P('selfAtk'))],
    "Heals this creature with the amount of the opposing creature's attack.": [heal(SELF, P('opposingAtk'))],
    "Increase enemy's Flooping cost by 1 next turn.": [eff('costMod', who='enemy', kind='floop', amount=1)],
    "Increase the Defense of all of your creatures by 2 for each building you control.": [buff(ALLIES, 0, P('ownBuildings', 2))],
    "Increase the critical area for all your creatures on your next attack by 200%.": [buff(ALLIES, P('targetAtk'), 0, duration='turn')],
    "Increase the defence area for all creatures next turn by 150%.": [buff(ALLIES, 0, P('targetMaxDef', 0.5), duration='round')],
    "Increased the defence critical area by 200% for all your creatures for the next time you defend.": [buff(ALLIES, 0, P('targetMaxDef'), duration='round')],
    "Inflict 2 Damage on this creature and lower the Defense of the opposing creature by 10": [dmg(SELF, 2), buff(OPP, 0, -10)],
    "Inflict 2 Damage to this creature and gain +2 attack.": [dmg(SELF, 2), buff(SELF, 2)],
    "Lower Attack of all enemy creatures by 12 and destroy this creature.": [buff(ENEMIES, -12), eff('destroy', target=SELF)],
    "Lower opposing creature's Attack by 4 and raise this creature's Attack by 4.": [buff(OPP, -4), buff(SELF, 4)],
    "Lower the Attack of All opposing creatures by 4.": [buff(ENEMIES, -4)],
    "Lower the Attack of opposing creature by half and raise this creature's Attack, and also reduce it's Defense, by that amount.": [
        buff(SELF, P('opposingAtk', 0.5), P('opposingAtk', -0.5)),
        buff(OPP, P('targetAtk', -0.5)),
    ],
    "Lower the Attack of the creature in opposing lane by 2 for each of your opponent's creatures.": [buff(OPP, P('enemyCreatures', -2))],
    "Lower the Attack of the creature in the opposing lane by 2.": [buff(OPP, -2)],
    "Lower the Attack of the creature in the opposing lane by 4.": [buff(OPP, -4)],
    "Lower the Attack of the opposing creature by 3 and destroy this creature.": [buff(OPP, -3), eff('destroy', target=SELF)],
    "Lower the Attack of the opposing creature by 5.": [buff(OPP, -5)],
    "Lower the Attack of the opposing creature equal to this creature's Attack.": [buff(OPP, P('selfAtk', -1))],
    "Lower the Defense of adjacent creatures by 2 and increase the Attack of this creature by 5.": [buff(ADJ, 0, -2), buff(SELF, 5)],
    "Lower the Defense of adjacent creatures by 2 and increase their Attack by 4.": [buff(ADJ, 4, -2)],
    "Lower the Defense of all opposing creatures by 5.": [buff(ENEMIES, 0, -5)],
    "Lower the Defense of creature in the opposite lane by 2.": [buff(OPP, 0, -2)],
    "Lower the Defense of the creature in the opposite lane by 5.": [buff(OPP, 0, -5)],
    "Lower the Defense of the opposing creature equal to this creature's Attack.": [buff(OPP, 0, P('selfAtk', -1))],
    "Lower the cost of Flooping creatures by 1 this turn.": [eff('costMod', who='self', kind='floop', amount=-1)],
    "Lower the opposing creature's Attack by 1 for every card in your opponent's hand.": [buff(OPP, P('enemyHandSize', -1))],
    "Make the Attack of the opposing creature equal to this creature's Attack.": [buff(OPP, P('selfAtk', sub='targetAtk'))],
    "Negate all Damage, Defense, and Attack modifiers on this creature.": [eff('reset', target=SELF)],
    "No Creature or Building may be summoned on the opposing lane next turn.": [eff('seal', target='opposingLandscape')],
    "Opposing creature cannot attack on opponent's next Battle Phase": [eff('lockAttack', target=OPP)],
    "Raise Attack by the number of times you have flooped this creature.": [buff(SELF, P('timesFlooped'))],
    "Raise this creature's Attack by 4 for each creature you Flooped this turn.": [buff(SELF, P('floopsThisTurn', 4))],
    "Return a Building from the Discard Pile to your hand.": [eff('recover', cardType='building', pick='best')],
    "Return a Spell from the Discard Pile to your hand.": [eff('recover', cardType='spell', pick='best')],
    "Return a creature the from Discard Pile to your hand.": [eff('recover', cardType='creature', pick='best')],
    "Return all cards, draw 5 cards, and gain 2 Magic points next turn.": [eff('cycleHand', draw=5), eff('gainMp', amount=2, nextTurn=True)],
    "Return this creature to your hand and draw 1 card.": [eff('draw', amount=1), eff('returnToHand', target=SELF)],
    "Return this creature to your hand and draw 4 card.": [eff('draw', amount=4), eff('returnToHand', target=SELF)],
    "Sacrifice this card and heal adjacent cards for 20 HP each.": [heal(ADJ, 20), eff('destroy', target=SELF)],
    "Select a Random card from the Discard Pile and put it in your hand.": [eff('recover', pick='random')],
    "Send Building in opposing lane back to opponent's hand.": [eff('returnBuilding', target='opposingBuilding')],
    "Send Creature in opposing lane back to opponent's hand.": [eff('returnToHand', target=OPP)],
    "Send Creature in opposing lane back to the opponent's hand.": [eff('returnToHand', target=OPP)],
    "Shuffle your hand back into your Deck and draw 5 cards.": [eff('cycleHand', draw=5)],
    "This creature and adjacent creature's gain +6 Defense.": [buff(SELF, 0, 6), buff(ADJ, 0, 6)],
    "This creature and adjacent creatures gain +10 Defense.": [buff(SELF, 0, 10), buff(ADJ, 0, 10)],
    "This creature and adjacent creatures gain +3 Defense.": [buff(SELF, 0, 3), buff(ADJ, 0, 3)],
    "This creature and adjacent creatures gain +4 Attack.": [buff(SELF, 4), buff(ADJ, 4)],
    "This creature and adjacent creatures gain +4 Defense.": [buff(SELF, 0, 4), buff(ADJ, 0, 4)],
    "This creature and adjacent creatures gain +5 Attack.": [buff(SELF, 5), buff(ADJ, 5)],
    "This creature and adjacent creatures gain +6 Defense.": [buff(SELF, 0, 6), buff(ADJ, 0, 6)],
}


def attack_with(land):
    return [eff('forceAttack', target=CH_ALLY, filter=only(land))]


SPELL = {
    "All your creatures' FLOOP abilities cost 0 Magic Points this turn.": [eff('costMod', who='self', kind='floop', amount=-99)],
    "Choose a Blue Plains creature and attack the opposing creature in its lane.": attack_with('plains'),
    "Choose a Corn creature and attack the opposing creature in its lane": attack_with('corn'),
    "Choose a Nice Lands creature and attack the creature in the opposing lane.": attack_with('nice'),
    "Choose a Sandy Lands creature and attack the opposing creature in its lane.": attack_with('sand'),
    "Choose a Useless Swamp creature and attack the opposing creature in its lane.": attack_with('swamp'),
    "Choose a lane and destroy all buildings and creatures on it (player and opponent)": [eff('wipeLane', target='chosenEnemyLandscape')],
    "Choose an opposing Building and move it to an empty lane.": [eff('moveBuilding', target='chosenEnemyBuilding')],
    "Choose an opposing creature and deal Damage equal to its own Attack.": [dmg(CH_ENEMY, P('targetAtk'))],
    "Choose an opposing creature and double the amount of Damage on it.": [dmg(CH_ENEMY, P('targetDamage'))],
    "Choose an opposing creature and send it back to your opponent's hand.": [eff('returnToHand', target=CH_ENEMY)],
    "Choose an opposing creature. It cannot use its Floop ability next turn.": [eff('lockFloop', target=CH_ENEMY)],
    "Choose an opposing lane. No building or creature may be summoned on this lane next turn.": [eff('seal', target='chosenEnemyLandscape')],
    "Choose one of your Buildings and move it to one of your empty lanes.": [eff('moveBuilding', target='chosenAllyBuilding')],
    "Choose one of your creatures and give it Attack equal to how much Damage it has taken.": [buff(CH_ALLY, P('targetDamage'))],
    "Choose one of your creatures and heal all damage.": [heal(CH_ALLY, FULL)],
    "Choose one of your creatures and return it to your hand.": [eff('returnToHand', target=CH_ALLY)],
    "Choose one of your creatures and switch its Attack and Defense values.": [eff('swapStats', target=CH_ALLY)],
    "Choose one of your damaged creatures and heal it equal to its own Attack.": [heal(CH_ALLY, P('targetAtk'), filter={'damaged': True})],
    "Choose one of your opponent's creatures and switch its Attack and Defense values.": [eff('swapStats', target=CH_ENEMY)],
    "Creature in this lane heals 5 Damage when it destroys a creature.": [eff('grantKeyword', target=CH_ALLY, keyword='feast:5')],
    "Deal 10 damage to the opposing Leader and heal your Leader by 10 points.": [dmg(EHERO, 10), heal(HERO, 10)],
    "Deal 5 damage to the opposing Leader and heal your Leader 5 points.": [dmg(EHERO, 5), heal(HERO, 5)],
    "Destroy all enemy creatures of rarity 3 or lower.": [eff('destroy', target=ENEMIES, filter={'maxStars': 3})],
    "Destroy all enemy creatures of rarity 4 or higher.": [eff('destroy', target=ENEMIES, filter={'minStars': 4})],
    "Destroy any of your Buildings and gain 4 Magic Points.": [eff('destroyBuilding', target='chosenAllyBuilding'), eff('gainMp', amount=4)],
    "Destroy any of your creatures and gain 4 Magic Points.": [eff('destroy', target=CH_ALLY), eff('gainMp', amount=4)],
    "Destroy one of your Buildings and draw 1 card.": [eff('destroyBuilding', target='chosenAllyBuilding'), eff('draw', amount=1)],
    "Destroy one of your Creatures and draw 1 card.": [eff('destroy', target=CH_ALLY), eff('draw', amount=1)],
    "Destroy one of your creatures and an opposing creature. Also draw 1 card.": [
        eff('destroy', target=CH_ENEMY),
        eff('destroy', target='weakestAllyCreature'),
        eff('draw', amount=1),
    ],
    "Discard your hand and gain 4 Magic Points": [eff('discardHand'), eff('gainMp', amount=4)],
    "Draw 1 card for each of your empty lanes.": [eff('draw', amount=P('ownEmptyLanes'))],
    "Draw 2 cards.": [eff('draw', amount=2)],
    "Draw 3 Cards.": [eff('draw', amount=3)],
    "Every card cast this turn costs 1 less Magic Point.": [eff('costMod', who='self', kind='card', amount=-1)],
    "Gain 1 Magic Point for each of your creatures on the field.": [eff('gainMp', amount=P('ownCreatures'))],
    "Gain 1 Magic Point for every different landscape on the field.": [eff('gainMp', amount=P('fieldLandscapeTypes'))],
    "Heal 5 to all your creatures and Hero.": [heal(ALLIES, 5), heal(HERO, 5)],
    "Heal all creatures on the field (including your opponent's).": [heal(ALL, FULL)],
    "Instantly kills the lone creature on the opponent's side": [
        eff('destroy', target=ENEMIES, when={'type': 'creatureCountAtMost', 'who': 'enemy', 'value': 1})
    ],
    "Opponent cannot cast spells next turn.": [eff('block', what='spell')],
    "Opponent cannot summon Buildings next turn.": [eff('block', what='building')],
    "Opponent cannot summon creatures next turn.": [eff('block', what='creature')],
    "Opponent gets 2 less Magic Point next turn.": [eff('loseMp', amount=2)],
    "Put a random creature from your deck into your hand.": [eff('tutor', cardType='creature')],
    "Reduce the defence of ALL creatures by 50%.": [buff(ALL, 0, P('targetDef', -0.5))],
    "Return a Building card from the Discard Pile to your hand.": [eff('recover', cardType='building', pick='best')],
    "Return a spell card from your Discard pile to your hand.": [eff('recover', cardType='spell', pick='best')],
    "Return all of your creatures on the field to your hand).": [eff('returnToHand', target=ALLIES)],
    "Return any creature from your Discard Pile to your hand.": [eff('recover', cardType='creature', pick='best')],
    "Shuffle your hand back into your Deck and draw 5 new cards.": [eff('cycleHand', draw=5)],
}

# Buildings: (abilities, statics)
LANE_C = 'laneCreature'


def lane_stat(atk=0, df=0):
    return {'kind': 'stat', 'scope': 'lane', 'atk': atk, 'def': df}


def on(trigger, *effects):
    return {'trigger': trigger, 'effects': list(effects)}


BUILDING = {
    "Creature in this lane get 4 Attack every time it uses a Floop ability.": ([on('onFloop', buff(LANE_C, 4))], []),
    "Creature in this lane gets +2 Attack for each card in your opponent's hand.": ([], [lane_stat(P('enemyHandSize', 2))]),
    "Creature in this lane gets +2 Attack for each of your creatures on the field.": ([], [lane_stat(P('ownCreatures', 2))]),
    "Creature in this lane gets +2 Defense for each of your creatures on the field.": ([], [lane_stat(0, P('ownCreatures', 2))]),
    "Creature in this lane gets +3 Attack.": ([], [lane_stat(3)]),
    "Creature in this lane gets +3 Defense for each of your creatures on the field.": ([], [lane_stat(0, P('ownCreatures', 3))]),
    "Creature in this lane gets +4 Attack and +4 Defense": ([], [lane_stat(4, 4)]),
    "Creature in this lane gets +4 Defense": ([], [lane_stat(0, 4)]),
    "Creature in this lane gets +8 Attack and +8 Defense.": ([], [lane_stat(8, 8)]),
    "Creature in this lane heals 2 Damage for each creature you control at start of turn.": ([on('startOfTurn', heal(LANE_C, P('ownCreatures', 2)))], []),
    "Creature in this lane heals 5 Damage at the start of your turn.": ([on('startOfTurn', heal(LANE_C, 5))], []),
    "Creature in this lane swap Attack and Defense.": ([], [{'kind': 'swapStats', 'scope': 'lane'}]),
    "Creatures in this lane get +2 Attack for each different landscape on the field.": ([], [lane_stat(P('fieldLandscapeTypes', 2))]),
    "Creatures in this lane get +2 defense for each card in your hand.": ([], [lane_stat(0, P('handSize', 2))]),
    "Creatures in this lane get +5 Attack and +5 Defense for each of your empty lands.": ([], [lane_stat(P('ownEmptyLanes', 5), P('ownEmptyLanes', 5))]),
    "Creatures in this lane takes 5 less Damage when attacked.": ([], [{'kind': 'armor', 'scope': 'lane', 'amount': 5}]),
    "Deal 4 Damage to the opposing Hero when your creature in this lane is destroyed.": ([on('onLaneCreatureDestroyed', dmg(EHERO, 4))], []),
    "Deal 5 Damage to the opposing creature when a new creature is placed on this lane.": ([on('onLaneCreaturePlayed', dmg(OPP, 5))], []),
    "Deal 5 Damage to the opposing hero when a new creature is placed on this lane.": ([on('onLaneCreaturePlayed', dmg(EHERO, 5))], []),
    "Deals 5 Damage to the opposing Hero when your creayure in this lane is destroyed.": ([on('onLaneCreatureDestroyed', dmg(EHERO, 5))], []),
    "Enemy can only summon creatures with rarity of 1 where hero places this building in a lane.": ([], [{'kind': 'laneRarityCap', 'maxStars': 1}]),
    "Enemy may only play creatures of 3 Rarity or lower on this lane.": ([], [{'kind': 'laneRarityCap', 'maxStars': 3}]),
    "Floop ability costs 1 less Magic Point for creatures in this lane.": ([], [{'kind': 'floopCost', 'scope': 'lane', 'amount': -1}]),
    "Gain 1 Magic Point when a creature in this lane uses a Floop ability.": ([on('onFloop', eff('gainMp', amount=1))], []),
    "Heal 5 damage from your hero when a creature in this lane is destroyed.": ([on('onLaneCreatureDestroyed', heal(HERO, 5))], []),
    "When creature in this lane is destroyed return it to your hand send this building to the Discard Pile.": (
        [on('onLaneCreatureDestroyed', eff('recoverDestroyed'), eff('destroyBuilding', target='thisBuilding'))], []),
    "When creature in this lane is destroyed, return it to your hand and send this Building to the Discard Pile.": (
        [on('onLaneCreatureDestroyed', eff('recoverDestroyed'), eff('destroyBuilding', target='thisBuilding'))], []),
    "Your creature in this lane gains 5 Defense when a Floop ability is used.": ([on('onAllyFloop', buff(LANE_C, 0, 5))], []),
}


def all_mine(atk=0, df=0, land=None):
    e = buff(ALLIES, atk, df)
    if land:
        e['filter'] = only(land)
    return [e]


def full_heal(land=None):
    e = heal(ALLIES, FULL)
    if land:
        e['filter'] = only(land)
    return [e]


def cheaper(kind, amount):
    return [eff('costMod', who='self', kind=kind, amount=-amount)]


HERO_ABILITY = {
    "All creatures summoned this turn cost 1 less Magic Point.": cheaper('creature', 1),
    "All of your creatures gain +2 Attack.": all_mine(2),
    "All your creatures gain +2 Defense. Get everything if you play despacito": all_mine(0, 2),
    "Return any Creature from the Discard Pile back to your hand.": [eff('recover', cardType='creature', pick='best')],
    "Send all of your opponent's Buildings back to their hand.": [eff('returnBuilding', target='allEnemyBuildings')],
    "All of your Rainbow creatures gain +6 Defense.": all_mine(0, 6, 'rainbow'),
    "All of your Universal creatures gain +5 Attack.": all_mine(5, 0, 'rainbow'),
    "All of your creatures gain +4 Attack.": all_mine(4),
    "All your Corn creatures gain +5 Attack.": all_mine(5, 0, 'corn'),
    "All your Sand creatures gain +5 Attack.": all_mine(5, 0, 'sand'),
    "All your creatures gain +3 Defense.": all_mine(0, 3),
    "Fully heal all of your Plains creatures.": full_heal('plains'),
    "Fully heal all of your creatures.": full_heal(),
    "Gain +3 extra Magic Points for 1 turn.": [eff('gainMp', amount=3)],
    "Gain 1 extra Magic Point this turn.": [eff('gainMp', amount=1)],
    "Gain 3 extra Magic Points for 1 turn.": [eff('gainMp', amount=3)],
    "Return any Building card from the Discard Pile to your hand.": [eff('recover', cardType='building', pick='best')],
    "Return any Spell card from the Discard Pile to your hand.": [eff('recover', cardType='spell', pick='best')],
    "+1 Attack & +2 Def to all Nice Land Cards.": all_mine(1, 2, 'nice'),
    "All Spells cast this turn cost 1 less Magic Point.": cheaper('spell', 1),
    "All Spells cast this turn cost 2 less Magic Points.": cheaper('spell', 2),
    "All Spells cast this turn cost less 2 Magic Points.": cheaper('spell', 2),
    "All cards cast this turn cost 1 less magic point.": cheaper('card', 1),
    "All of your Swamp creatures gain +8 Attack.": all_mine(8, 0, 'swamp'),
    "All of your creatures gain +3 Attack.": all_mine(3),
    "All of your creatures gain +5 Attack.": all_mine(5),
    "All your Corn creatures gain +3 Attack.": all_mine(3, 0, 'corn'),
    "All your Nicelands creatures gain +3 Attack.": all_mine(3, 0, 'nice'),
    "All your Plains creatures gain +5 Attack.": all_mine(5, 0, 'plains'),
    "All your Swamp creatures gain +4 Attack.": all_mine(4, 0, 'swamp'),
    "All your Universal creatures gain +4 Defense.": all_mine(0, 4, 'rainbow'),
    "All your Universal creatures gain +5 Attack.": all_mine(5, 0, 'rainbow'),
    "All your creatures gain +4 Defense.": all_mine(0, 4),
    "Choose a creature and fully heal it.": [heal(CH_ANY, FULL)],
    "Draw 1 card.": [eff('draw', amount=1)],
    "Draw 2 Cards.": [eff('draw', amount=2)],
    "Fully heal all of your Swamp creatures": full_heal('swamp'),
    "Gain 2 extra Magic Points for 1 turn.": [eff('gainMp', amount=2)],
    "Nice Lands Creatures deploy cost cut by 2, every other land cut by 1.": [
        eff('costMod', who='self', kind='creature', amount=-1),
        eff('costMod', who='self', kind='creature', amount=-1, landscape='candy'),
    ],
    "Opponent cannot use Spells next round and all Buildings on the board are discarded.": [
        eff('block', what='spell'),
        eff('destroyBuilding', target='allBuildings'),
    ],
    "All Spells cast this turn cost 2 less Magic Point.": cheaper('spell', 2),
    "Return any card from the Discard Pile back to your hand.": [eff('recover', pick='best')],
    "Return any card from the Discard Pile to your hand.": [eff('recover', pick='best')],
    "Draw 3 cards.": [eff('draw', amount=3)],
    "All plain creatures on your side +8 attack": all_mine(8, 0, 'plains'),
}

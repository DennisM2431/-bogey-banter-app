export const TEAM_NAMES = [
  "The Bogey Boys","Fairway Fiends","Grip It & Sip It","The Tree Magnets",
  "Sandbaggers Anonymous","The Shank Redemption","Fore Play Specialists",
  "Beerway Bandits","Par-Tee Animals","Pin Seekers","Lost Ball Legends","The Three-Putt Club"
];
export const AWARDS = ["Beer Monster","Chaos King","Biggest Choke","Sand Specialist","Tree Magnet","Best Banter","Court Jester","MVP"];
// [title, category, icon, one-hole rule, artKey]
export const CHAOS_CARDS = [
["Foot Wedge","Lucky Break","👟","Move the chosen ball one club length, no closer to the hole.","foot-wedge"],
["Mulligan","Lucky Break","✨","Replay one shot on this hole with no penalty.","mulligan"],
["Four-Ball Tee Shot","Lucky Break","💥","Each player hits two tee shots. Choose the best ball.","four-ball"],
["Free Drop","Lucky Break","🟢","Take one free drop within one club length, no closer to the hole.","free-drop"],
["Gimme Putt","Lucky Break","🎁","One putt inside one standard putter length counts as holed.","gimme-putt"],
["Club Length Boost","Lucky Break","📏","Move the selected ball one club length before one shot.","club-boost"],
["Second Chance","Lucky Break","🔁","Replay one missed putt immediately and use the better result.","second-chance"],
["Power Drive","Lucky Break","🚀","Choose one player to tee off twice and use the better drive.","power-drive"],
["Shotgun a Beer","Beer Card","🍺","Everyone on the team drinks before teeing off.","shotgun-beer"],
["Beer Caddy","Beer Card","🍻","Choose one player to carry the team's drinks for this hole.","beer-caddy"],
["Buy the Next Round","Beer Card","💳","The player with the worst shot on this hole buys the next round.","buy-round"],
["Sip Before Every Shot","Beer Card","🥤","Take one sip before every team shot on this hole.","sip-shot"],
["Cheers Before Putt","Beer Card","🥂","The team must cheers before every putt on this hole.","cheers-putt"],
["Designated Drinker","Beer Card","😵","Choose one player to take the team's drinking penalties for this hole.","designated-drinker"],
["Closest to the Pin","Challenge","🎯","Nominate one tee shot. If it finishes outside the green, add one stroke.","closest-pin"],
["Kick Save","Challenge","⚽","Kick the ball once instead of taking a normal shot.","kick-save"],
["Silent Hole","Challenge","🤫","No talking from tee-off until the ball is holed.","silent-hole"],
["Commentator Mode","Challenge","🎤","One player must loudly commentate every team shot.","commentator"],
["One-Handed Putt","Challenge","☝️","Every putt must be taken one-handed.","one-hand-putt"],
["Happy Gilmore","Challenge","🏃","One player must use a running start for the tee shot.","happy-gilmore"],
["Eyes Closed Putt","Challenge","🙈","One nominated putt must be taken with eyes closed.","eyes-closed"],
["Backwards Tee Shot","Challenge","🔄","One player must face backwards and hit through their legs from the tee.","backwards-shot"],
["No Practice Swings","Challenge","🚫","No practice swings are allowed on this hole.","no-practice"],
["Club Toss Choice","Challenge","🪃","Toss a club gently; whichever club lands closest must be used for the next shot.","club-toss"],
["Opponent Chooses Clubs","Sabotage","😈","The paired opponent chooses every club used on this hole.","opponent-clubs"],
["Bag Swap","Sabotage","🎒","Swap golf bags with the paired opponent for this hole.","bag-swap"],
["No Tee Allowed","Sabotage","📍","All tee shots must be hit directly from the ground.","no-tee"],
["Bunker Tax","Sabotage","🏖️","Each bunker visit adds one stroke to this hole.","bunker-tax"],
["Second-Best Shot","Sabotage","2️⃣","Reject the best available shot and play the second-best each time.","second-best"],
["Wrong-Handed Hole","Sabotage","🫲","Every player must play opposite-handed for this hole.","wrong-handed"],
["No Putters","Sabotage","🥄","Use any club except a putter on the green.","no-putter"],
["One Club Only","Sabotage","1️⃣","Choose one club and use only that club until holed.","one-club"],
["Worst Ball Ambrose","Sabotage","☠️","Always continue from the worst available team shot.","worst-ball"],
["Cart Path Only","Sabotage","🛣️","If the ball misses the fairway, move it to the nearest cart path edge and play from there.","cart-path"],
["Club Roulette","Sabotage","🎰","The opponent selects one club that every player must use for the hole.","club-roulette"],
["Reverse Order","Sabotage","↩️","Players must hit in reverse team order for every shot.","reverse-order"],
["Tree Magnet","Legendary","🌳","If any ball hits a tree, add one stroke to the hole.","tree-magnet"],
["Water Watch","Legendary","💧","Any ball entering water adds two strokes instead of the usual penalty.","water-watch"],
["Double Bunker Tax","Legendary","⛱️","Each bunker visit adds two strokes on this hole.","double-bunker"],
["Pressure Putt","Legendary","🔥","The team gets only one putting attempt from the first chosen spot on the green.","pressure-putt"],
["Captain's Call","Legendary","👑","One nominated player must take every shot on this hole.","captains-call"],
["Chaos Combo","Legendary","🌪️","Draw one extra card and both effects apply to this hole only.","chaos-combo"]
];
export const DEMO_NAMES=["Dennis","Jared","Tristen","Jak"];
export const CARD_CATEGORIES={"Lucky Break":{className:"lucky"},"Beer Card":{className:"beer"},"Challenge":{className:"challenge"},"Sabotage":{className:"sabotage"},"Legendary":{className:"legendary"}};

"""Art job registry for tools/art.py. Tiers: 1 likenesses (faces first), 2 scenes/enemies,
3 cards, 4 pets & extras. World looks: base (farm storybook gouache — RL1–3's block),
w1 Barbie Dreamhouse, w2 squishy-toy world, w3 sassy tea party.

Recognition rule for every world edit: same subject, same pose, same composition and
framing, same likeness — only material, palette, costume and setting change."""

REF = 'assets/ref-photos/'
O = 'assets/originals/'

# ---------------------------------------------------------------- style blocks
BASE = ("Warm hand-painted storybook gouache illustration, friendly caricature with gently exaggerated "
        "proportions, bold clean silhouette, soft golden-hour farm lighting with warm rim light, rich saturated "
        "colors on a simple painterly farm-vignette background, matched art series for a children's trading-card "
        "game, centered subject, no text, no borders, no frames, no watermark.")
SCENE = ("Warm hand-painted storybook gouache illustration, rich saturated colors, soft golden-hour light, matched "
         "art series for a children's trading-card game, no text, no borders, no frames, no watermark.")

WORLD = {
    'w1': ("the BARBIE DREAMHOUSE world: everything becomes glossy molded toy plastic in candy pink, hot pink, "
           "lavender, white and gold, with sparkles and glitter glints and bright playroom lighting, like a "
           "fashion-doll playset; people become posable fashion-doll versions of themselves with a smooth plastic "
           "sheen (still clearly the same person, same face and hair); all decorations are original — hearts, stars, "
           "bows, crowns and sparkles — never a brand logo, wordmark, doll-head silhouette emblem, or any lettering"),
    'w2': ("the SQUISHY-TOY world: everything becomes a soft, squeezable squishy toy or stress ball — puffy rounded "
           "shapes, soft matte foam and glossy jelly textures, gentle squish highlights, a pastel mint, peach, "
           "lilac, butter-yellow and baby-blue palette, cozy soft lighting; people become cute plush-soft squishy-toy "
           "versions of themselves (still clearly the same person, same face and hair)"),
    'w3': ("a FANCY, SASSY LITTLE-GIRL TEA PARTY: fine bone china, lace doilies, ribbons, teacups, tiered cake "
           "stands and an ornate pastel parlor, soft afternoon window light, a rose, cream, teal and gold palette "
           "with gold filigree accents, delicate storybook ink-and-watercolor finish; people are dressed up in fancy "
           "tea-party clothes, pinkies out (still clearly the same person, same face and hair)"),
}
WORLD_NAME = {'w1': 'Dreamhouse', 'w2': 'Squishy', 'w3': 'Tea Party'}
HERO_COSTUME = {
    'wyatt': {'w1': 'a sporty doll outfit with a racing stripe', 'w2': 'a squishy-toy tracksuit with speed-line puffs',
              'w3': 'a black top hat with bright racing stripes and a little bow tie'},
    'aaron': {'w1': 'a pink doll-gym outfit, the hammer now shiny pink plastic', 'w2': 'a puffy squishy outfit, the hammer now a giant squishy toy hammer',
              'w3': 'a fancy bow tie over his muscles and a vest, the hammer with a lace ribbon on the handle'},
    'liam': {'w1': 'tiny doll-style pajamas with long pants (fully clothed), the potty now a sparkly pink plastic toy potty', 'w2': 'a puffy squishy onesie, the potty now a squishy toy',
             'w3': 'a frilly lace bonnet and a little fancy outfit, the potty now a gilded porcelain tea-party throne'},
}


def edit(world, what, extra=''):
    return (f"Restyle this exact image into {WORLD[world]}. KEEP the same subject, the same pose, the same composition "
            f"and framing, and the same face and likeness — a viewer must instantly recognize it as the same picture. "
            f"Change only the materials, palette, lighting, costume and background to match that world. {extra} "
            f"Subject: {what}. Children's trading-card game art, centered subject, no text, no borders, no frames, no watermark.")


JOBS = {}


def job(jid, out, prompt, refs=(), size='1024x1024', tier=9):
    JOBS[jid] = {'out': out, 'prompt': prompt, 'refs': list(refs), 'size': size, 'tier': tier}


# ---------------------------------------------------------------- heroes (tier 1)
LIKE = ("Use the reference photo for the child's likeness: keep his real face shape, hair color and style, eye color "
        "and smile, as a friendly caricature that is clearly recognizable as the same kid. Wholesome and cheerful.")
HEROES = {
    'wyatt': ('wyatt.png', "Wyatt the Speedy, a 10-year-old boy mid-sprint in running gear and sneakers, one foot off the "
              "ground, bright speed lines streaming behind him, confident competitive grin, leaning forward like he is "
              "about to win a race"),
    'aaron': ('aaron.png', "Aaron the Strong, an 8-year-old boy with a goofy determined grin, flexing one arm and resting a "
              "giant wooden-handled hammer with a big iron head on his shoulder, planted in a strong wide stance"),
    'liam': ('liam.png', "Liam the Potty Trained, a proud 3-year-old toddler, fully clothed in cozy pajamas, standing beside a "
             "small child's training potty decorated like a royal throne with gold stars, giving a big thumbs-up with a "
             "delighted grin, a little paper crown of gold stars on his head"),
}
for h, (photo, desc) in HEROES.items():
    job(f'hero_{h}_base', f'{O}heroes/{h}_base.png', f"Square image, 1024x1024.\n{BASE}\n\nSubject: {desc}. {LIKE}",
        [REF + photo], tier=1)
    for w in ('w1', 'w2', 'w3'):
        job(f'hero_{h}_{w}', f'{O}heroes/{h}_{w}.png',
            edit(w, desc, f"Costume for this world: {HERO_COSTUME[h][w]}."), [f'@hero_{h}_base'], tier=1)

# ---------------------------------------------------------------- cousins, family (tier 1)
KID = ("Use the reference photo for the girl's likeness: keep her real face, hair color and style, and smile, as a "
       "friendly, affectionate caricature clearly recognizable as the same girl. Wholesome, funny, never scary or mean.")


def world_style(w):
    return (f"Hand-painted children's trading-card game illustration set in {WORLD[w]}. Bold clean silhouette, "
            f"centered subject, no text, no borders, no frames, no watermark.")


job('boss_stella', f'{O}bosses/stella.png', f"Square image, 1024x1024.\n{world_style('w1')}\n\nSubject: Stella, Queen "
    "of Barbies, a 7-year-old girl with long blonde hair in a sparkly pink ballgown and a glittering tiara, holding a "
    "heart-topped scepter, striking a fabulous runway pose in front of a giant pink Dreamhouse staircase, confident "
    f"sparkling grin. {KID}", [REF + 'stella.jpg'], tier=1)
job('boss_lucy', f'{O}bosses/lucy.png', f"Square image, 1024x1024.\n{world_style('w2')}\n\nSubject: Lucy, Ruler of "
    "Squishies, a 5-year-old girl with wavy blonde hair, sitting on a tall throne built entirely of colorful squishy "
    "toys and stress balls, wearing a crown made of little squishies, holding a glowing squishy ball like a royal orb, "
    f"a mischievous little smile. {KID}", [REF + 'lucy.jpg'], tier=1)
job('boss_lucy_mega', f'{O}bosses/lucy_mega.png', f"Square image, 1024x1024.\n{world_style('w2')}\n\nSubject: MEGA "
    "SQUISH Lucy — the same girl has squished herself into a giant, round, adorable squishy toy: a huge soft pastel "
    f"squishy ball with her face, her wavy blonde hair and her squishy crown on top, cheeks puffed, playful. {KID}",
    ['@boss_lucy'], tier=1)
job('boss_delilah', f'{O}bosses/delilah.png', f"Square image, 1024x1024.\n{world_style('w3')}\n\nSubject: Delilah the "
    "Sassafras, a 2-year-old toddler girl with very light blonde hair and a huge scrunched-up grin, in a frilly "
    "tea-party dress, one hand on her hip and the other holding a tiny teacup with her pinky out, one eyebrow raised in "
    f"maximum sass at a fancy tea table. {KID}", [REF + 'delilah.jpg'], tier=1)
job('boss_delilah_tantrum', f'{O}bosses/delilah_tantrum.png', f"Square image, 1024x1024.\n{world_style('w3')}\n\n"
    "Subject: Delilah's TANTRUM — the same toddler girl stomping one foot in a comic tantrum, fists balled, cheeks "
    "puffed, while the tea table flips behind her and teacups, cookies and cake slices fly through the air with little "
    f"motion lines. Funny, not scary. {KID}", ['@boss_delilah'], tier=1)
job('visitor_grandma_rockie', f'{O}visitors/grandma_rockie.png', f"Wide image, 1536x1024.\n{world_style('w1')}\n\n"
    "Subject: Grandma Rockie, a warm smiling grandmother, arriving inside the pink Dreamhouse holding out three glowing "
    "gifts to choose from, as if offering a blessing. Use the reference photo for her likeness — clearly the same "
    "woman, friendly caricature.", [REF + 'kim.png'], size='1536x1024', tier=1)
job('visitor_grampa_flaj', f'{O}visitors/grampa_flaj.png', f"Wide image, 1536x1024.\n{world_style('w2')}\n\nSubject: "
    "Grampa Flaj, a cheerful grandfather, arriving inside the squishy-toy world, holding out three glowing gifts to "
    "choose from, bouncing a little on the squishy floor. Use the reference photo for his likeness — clearly the same "
    "man, friendly caricature.", [REF + 'sean.png'], size='1536x1024', tier=1)
job('visitor_mom_dad', f'{O}visitors/mom_dad.png', f"Wide image, 1536x1024.\n{world_style('w3')}\n\nSubject: Mom and "
    "Dad arriving together at the fancy tea party, smiling proudly, holding out three glowing gifts to choose from. "
    "Use the two reference photos for their likenesses (the woman is Mom, the man is Dad) — clearly the same people, "
    "friendly caricature.", [REF + 'tory.png', REF + 'jacob.png'], size='1536x1024', tier=1)

# ---------------------------------------------------------------- the ending (tier 1) — Wyatt's design, farm look
FARM = ("a Midwestern family farmyard: a big gravel patch in front of a red barn, a wooden fence with a cream-colored "
        "guard llama inside it, tall silver grain bins, a white farmhouse, all surrounded by tall green trees")
job('end_1_window', f'{O}ending/1_window.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: the moment after the tea "
    "party boss fight: a toddler girl with very light blonde hair in a frilly tea-party dress is cheerfully "
    "cracking open a farmhouse window and hopping out of it, looking back over her shoulder with a sassy grin; inside, a "
    f"wrecked fancy tea party. {KID}", [REF + 'delilah.jpg'], size='1536x1024', tier=1)
job('end_2_wyatt', f'{O}ending/2_wyatt.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: Wyatt the Speedy, a 10-year-old "
    "boy, leaping heroically out of an open farmhouse window in a blur of speed lines, landing toward a gravel yard. "
    f"{LIKE}", ['@hero_wyatt_base'], size='1536x1024', tier=1)
job('end_2_aaron', f'{O}ending/2_aaron.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: Aaron the Strong, an 8-year-old "
    "boy, jumping out of an open farmhouse window with his giant hammer on his shoulder, landing toward a gravel yard "
    f"with a big goofy grin. {LIKE}", ['@hero_aaron_base'], size='1536x1024', tier=1)
job('end_2_liam', f'{O}ending/2_liam.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: Liam, a 3-year-old toddler, fully "
    "clothed in pajamas, calmly opening the farmhouse's front door and waddling out onto the porch step, very pleased "
    f"with himself. {LIKE}", ['@hero_liam_base'], size='1536x1024', tier=1)
job('end_3_girls', f'{O}ending/3_girls.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: on a big gravel patch in {FARM}, "
    "two older sisters (about 7 and 5, blonde) come running over to stand beside their little sister (about 2, very "
    "light blonde) — the three girls together, laughing, arms around each other. Use the three reference photos for "
    "the three girls' likenesses: first photo the oldest (Stella), second the middle (Lucy), third the youngest "
    "(Delilah); the fourth photo shows all three sisters together (left = Lucy, middle = Stella, right = Delilah). "
    "Friendly caricature, clearly the same girls.", [REF + 'stella.jpg', REF + 'lucy.jpg', REF + 'delilah.jpg', REF + 'girls-family.jpg'],
    size='1536x1024', tier=1)
job('end_4_farm', f'{O}ending/4_farm.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: a peaceful wide establishing shot "
    f"of {FARM}; the guard llama watches from her fence. Use the reference photo for the llama.", [REF + 'llama.jpeg'],
    size='1536x1024', tier=1)
job('end_5_car', f'{O}ending/5_car.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: a shiny silver-gray car pulling up on "
    "the gravel patch of a farmyard; a smiling young mom with light brown hair waves from the driver's window as her "
    "three blonde daughters run toward the car. Use the reference photo for the mom's likeness (friendly caricature, "
    "clearly the same woman).", [REF + 'savannah.jpg'], size='1536x1024', tier=1)
job('end_6_lane', f'{O}ending/6_lane.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: the shiny silver-gray car driving "
    "away down a long country lane lined with tall green trees, three little girls waving out the back windows, warm "
    "sunset light, a happy goodbye.", ['@end_5_car'], size='1536x1024', tier=1)
job('end_7_heroes', f'{O}ending/7_heroes.png', f"Wide image, 1536x1024.\n{SCENE}\n\nSubject: three heroes standing "
    f"victorious together on the gravel patch of {FARM} at sunset, waving goodbye down the lane: Wyatt the Speedy (10), "
    "Aaron the Strong (8) with his giant hammer, and little Liam (3, fully clothed in pajamas) in the middle. Use the "
    "three reference images for their likenesses.", ['@hero_wyatt_base', '@hero_aaron_base', '@hero_liam_base'],
    size='1536x1024', tier=1)

# ================================================================ tier 2: enemies, scenes, backgrounds
ENEMY_DESC = {
    # World 1 — Barbie Dreamhouse
    'pink_pony': ('w1', 'a sparkly pink toy pony with a flowing glitter mane, rearing up dramatically, sassy and prancing'),
    'mannequin': ('w1', 'a blank-faced fashion mannequin striking a dramatic pose, glossy plastic, one hand on hip'),
    'shoe_stampede': ('w1', 'a stampede of tiny pink high-heel shoes and sparkly sneakers kicking all at once, cartoonish'),
    'convertible': ('w1', 'a shiny pink toy convertible car with big headlight eyes, revving and honking, smoke puffs'),
    'hairbrush_hydra': ('w1', 'a three-headed pink hairbrush monster with bristle teeth and tangled ribbons, silly not scary'),
    'makeover_mirror': ('w1', 'a magic vanity mirror with a sparkly frame and a smug reflection face, makeup brushes floating around it'),
    'closet_monster': ('w1', 'a big walk-in closet with googly eyes and a mouth full of hanging dresses, wearing a feather boa, trying on a hat'),
    'barbie_guard': ('w1', 'a toy fashion-doll royal guard in a pink uniform with a tall fuzzy hat and a toy spear, standing at attention'),
    'runway_diva': ('w1', 'a glamorous toy doll on a runway in a huge ruffled gown and sunglasses, striking a pose under spotlights'),
    # World 2 — squishy toys
    'squishy_dumpling': ('w2', 'a cute squishy dumpling toy with a little face, slowly puffing back up after being squeezed, steam wisps'),
    'stretchy_monkey': ('w2', 'a stretchy rubber toy monkey with super long stretched-out arms pulled back like a slingshot'),
    'cube_needoh': ('w2', 'a squishy cube-shaped stress ball toy with a determined little face, jelly texture'),
    'gumdrop_needoh': ('w2', 'a bouncy gumdrop-shaped squishy stress ball toy mid-bounce with motion lines, gummy translucent'),
    'teenie_needoh': ('w2', 'a swarm of tiny colorful teenie squishy stress balls with cute faces, bouncing together'),
    'mesh_squish_ball': ('w2', 'a mesh-net squishy ball toy with colorful goo bulging out between the net strings, gooey and gross-cute'),
    'splat_ball': ('w2', 'a sticky splat ball toy mid-SPLAT against the air, goopy flattened, cartoon splat shape'),
    'sticky_hand': ('w2', 'a stretchy sticky-hand toy on a long rubbery string, slapping forward, glossy and wobbly'),
    'king_needoh': ('w2', 'a huge king-sized squishy stress ball wearing a tiny golden crown, bulging and royal, pompous face'),
    'water_bead_ball': ('w2', 'a big clear water-bead stress ball filled with colorful water beads, wobbling, about to burst'),
    'water_bead': ('w2', 'a single tiny colorful water bead with a cute face, bouncing'),
    'mega_stress_ball': ('w2', 'a giant orange stress ball squeezed into a funny shape with a big grin, huge and squishy'),
    # World 3 — tea party
    'teapot_tantrum': ('w3', 'a fancy porcelain teapot having a tantrum, steam blasting from its spout, lid rattling, red-faced'),
    'snooty_teacup': ('w3', 'a set of snooty fine-china teacups with their noses in the air, pinkies out'),
    'sugar_cube': ('w3', 'a pair of sugar cube twins with little faces, one half-dissolving into sparkles'),
    'rude_scone': ('w3', 'a rude scone with a smug face blowing a raspberry, crumbs flying, jam on its head'),
    'spoon_knight': ('w3', 'a tiny silver teaspoon knight in a doily cape poking with its handle like a lance, gallant'),
    'teddy_in_a_tiara': ('w3', 'a plush teddy bear hostess wearing a sparkly tiara and pearls, pouring tea with pinky out'),
    'bunny_guest': ('w3', 'a plush bunny tea-party guest in a frilly hat nibbling a cookie'),
    'dino_guest': ('w3', 'a plush baby dinosaur tea-party guest in a bow tie doing a tiny roar'),
    'tea_time_clock': ('w3', 'a fancy grandfather clock with a mustache face, its hands pointing to tea time, teacups on top'),
    'headmistress_teapot': ('w3', 'a stern headmistress teapot wearing spectacles and a pearl necklace, holding a ruler with its handle'),
}
for key, (w, desc) in ENEMY_DESC.items():
    job(f'enemy_{key}', f'{O}enemies/{key}.png', f"Square image, 1024x1024.\n{world_style(w)}\n\nSubject: {desc}. A funny, "
        "kid-friendly cartoon enemy for a children's card game — silly, never scary.", tier=2)

BG = {
    'w1': {
        'battle': 'a wide Barbie Dreamhouse living room battle stage: glossy pink floors, a grand staircase, chandeliers, a pool visible through glass doors — empty stage, no characters',
        'map': 'a tall top-down storybook map of a giant pink Dreamhouse: rooms, a pink elevator, a pool, a closet, staircases winding up to a throne room at the top — no characters',
        'shop': "Stella's Closet: an enormous sparkly pink walk-in closet full of dresses, shoes, and sticker racks, a little shop counter",
        'rest': 'a sparkling pink Dreamhouse pool with floaties and lounge chairs, calm and cozy',
        'treasure': 'a giant pink toy box with the lid popping open and golden light spilling out',
        'arena': 'a fashion show runway with spotlights, a judges table with score cards, a sparkly curtain',
        'story': 'a giant pink Dreamhouse seen from the front, towering, sparkly, with a huge pink door opening',
    },
    'w2': {
        'battle': 'the soft pastel inside of a giant squishy toy: puffy foam walls, floating air bubbles, jelly floor — an empty battle stage',
        'map': 'a tall storybook map of the squishy tunnels inside a giant stress ball: winding soft passages leading up to a bright hole of daylight at the top — no characters',
        'shop': "Lucy's Squish Stand: a cute market stall made of squishy toys, shelves of squishies and stickers",
        'rest': 'a giant squishy cushion nest, soft pastel pillows, cozy glow',
        'treasure': 'a pastel capsule toy machine with a glowing capsule dropping out',
        'arena': 'a squishy race track with bouncy lanes and a finish line, cheering squishy crowd',
        'story': 'an enormous pastel squishy stress ball the size of a house, with a soft wobbly mouth opening',
    },
    'w3': {
        'battle': 'an ornate pastel tea party parlor with a long lace-covered table, teacups, cake stands, and fancy chairs — an empty battle stage',
        'map': 'a tall storybook map of a sprawling fancy tea party: a winding path of lace tablecloths, teapots, cake towers, climbing to a grand throne-chair at the top — no characters',
        'shop': "Delilah's Sweet Shop: a tiny pastel sweet shop counter with jars of candy, cupcakes, and stickers",
        'rest': 'a velvet fainting couch with lace pillows by a sunny window',
        'treasure': 'a tall tiered cake stand with a glowing treasure on the very top tier',
        'arena': 'an etiquette-school classroom set for a tea party exam, a chalkboard with doodles of teacups, a ribbon podium',
        'story': 'a grand fancy tea party table stretching into the distance under chandeliers, a tiny throne at the head',
    },
}
for w, kinds in BG.items():
    for kind, desc in kinds.items():
        job(f'bg_{w}_{kind}', f'{O}bg/{w}_{kind}.png', f"Wide image, 1536x1024.\nHand-painted children's trading-card game background "
            f"set in {WORLD[w]}. No text, no borders, no characters unless described. Subject: {desc}.", size='1536x1024', tier=2)

job('ui_title', f'{O}ui/title.png', "Tall image, 1024x1536.\n" + SCENE + "\n\nSubject: the title painting for 'Rolfe Legends 4: "
    "Attack of the Cousins' (NO text): three boy heroes — Wyatt the Speedy (10) sprinting, Aaron the Strong (8) with a giant "
    "hammer, and toddler Liam (3, in pajamas) with a paper crown — face three little blonde cousin girls across a magical split "
    "landscape: a pink Dreamhouse, a giant pastel squishy toy, and a fancy tea party. Playful rivalry, everyone smiling. Use the "
    "reference images for the heroes' likenesses; the girls are the three sisters in the last reference photo "
    "(left = Lucy, middle = Stella, right = Delilah) — match their real faces.",
    ['@hero_wyatt_base', '@hero_aaron_base', '@hero_liam_base', REF + 'girls-family.jpg'],
    size='1024x1536', tier=2)
for h in ('wyatt', 'aaron', 'liam'):
    job(f'ui_ko_{h}', f'{O}ui/ko_{h}.png', f"Square image, 1024x1024.\n{BASE}\n\nSubject: the same child sitting on a hay bale, "
        "a little dusty and tired but smiling bravely, a band-aid on one knee, ready to try again. Wholesome. "
        f"{LIKE}", [f'@hero_{h}_base'], tier=2)

SCENES = {
    'plunge_w1': ('Wide image, 1536x1024.', 'w1', 'three heroes (a boy running, a boy with a giant hammer, a toddler in pajamas) tumbling '
                  'through a sparkly pink swirl into a giant Barbie Dreamhouse, amazed faces', ['@hero_wyatt_base', '@hero_aaron_base', '@hero_liam_base']),
    'swallow_w2': ('Wide image, 1536x1024.', 'w2', 'the three heroes being gently slurped into the soft mouth of an enormous pastel squishy '
                   'stress ball, funny surprised faces, bouncing', ['@hero_wyatt_base', '@hero_aaron_base', '@hero_liam_base']),
    'squeeze_out': ('Wide image, 1536x1024.', 'w2', 'POP! the three heroes squeezing out of a hole in a giant squishy toy into daylight, and '
                    'Lucy (about 5, golden-blonde hair) on a throne of squishies waiting for them with arms crossed and a smile — Lucy must '
                    'look like the girl in the fourth reference (her approved portrait) and the LEFT girl in the fifth reference photo',
                    ['@hero_wyatt_base', '@hero_aaron_base', '@hero_liam_base', '@boss_lucy', REF + 'girls-family.jpg']),
    'arrive_w3': ('Wide image, 1536x1024.', 'w3', 'the three heroes arriving at the end of a very long, very fancy tea party table, '
                  'teacups turning to look at them, a tiny blonde toddler at the far end raising an eyebrow',
                  ['@hero_wyatt_base', '@hero_aaron_base', '@hero_liam_base', REF + 'delilah.jpg']),
    'farm_start': ('Wide image, 1536x1024.', None, 'three heroes (a boy runner, a boy with a giant hammer, a toddler in pajamas) on a Midwestern '
                   'farm at golden hour, a mysterious pink sparkle portal opening in the barn doorway',
                   ['@hero_wyatt_base', '@hero_aaron_base', '@hero_liam_base']),
}
for sid, (sz, w, desc, refs) in SCENES.items():
    style = SCENE if w is None else f"Hand-painted children's storybook illustration set in {WORLD[w]}, no text, no borders."
    job(f'scene_{sid}', f'{O}scenes/{sid}.png', f"{sz}\n{style}\n\nSubject: {desc}. Use the reference images for likenesses "
        "(friendly caricature).", refs, size='1536x1024', tier=2)

# ================================================================ tier 3: money pets (native world, then later worlds)
PET_DESC = {
    'pink_poodle': (1, 'a fluffy pink poodle proudly holding a gold coin in its mouth'),
    'pony_pal': (1, 'a tiny sparkly pony pal with a coin-shaped cutie mark, happily trotting'),
    'glitter_kitten': (1, 'a kitten covered in glitter leaving a trail of shiny pennies'),
    'dream_bunny': (1, 'a fancy bunny with a tiny purse full of gold coins'),
    'squishy_kitten': (2, 'a round squishy kitten toy popping out a gold coin when squeezed'),
    'dumpling_pup': (2, 'a puppy shaped like a dumpling fetching a gold coin'),
    'jelly_turtle': (2, 'a jelly turtle with a coin-stack shell, slow and smug'),
    'mochi_hamster': (2, 'a mochi hamster with cheeks stuffed full of gold coins'),
    'teacup_pig': (3, 'a tiny pig sitting inside a teacup with a little coin purse'),
    'fancy_parrot': (3, 'a fancy parrot in a bow tie holding a gold coin in its claw'),
    'lace_lamb': (3, 'a little lamb wearing a lace doily collar, nudging a gold coin'),
    'royal_corgi': (3, 'a royal corgi wearing a crown with a coin purse on its collar'),
}
for pid, (w, desc) in PET_DESC.items():
    native = f'w{w}'
    job(f'pet_{pid}_{native}', f'{O}pets/{pid}_{native}.png', f"Square image, 1024x1024.\n{world_style(native)}\n\nSubject: {desc}. "
        "An adorable money-making pet for a children's card game.", tier=3)
    for lw in range(w + 1, 4):
        job(f'pet_{pid}_w{lw}', f'{O}pets/{pid}_w{lw}.png', edit(f'w{lw}', desc), [f'@pet_{pid}_{native}'], tier=5)

# ================================================================ tier 4: card paintings (base), tier 5: world edits
CARD_DESC = {
    # Wyatt
    'kick': ('wyatt', 'Wyatt doing a flying front kick with bright speed lines'),
    'dodge': ('wyatt', 'Wyatt swerving sideways as a blur whooshes past him'),
    'quick_step': ('wyatt', 'Wyatt taking one super-quick step, sparks flying off his sneakers'),
    'dash_attack': ('wyatt', 'Wyatt dashing forward shoulder-first with a long dust trail'),
    'zoom': ('wyatt', 'Wyatt zooming so fast he leaves a spiral swirl behind'),
    'cartwheel': ('wyatt', 'Wyatt doing a perfect cartwheel'),
    'quick_pass': ('wyatt', 'Wyatt passing a soccer ball that zips forward with speed lines'),
    'tap_tap': ('wyatt', 'Wyatt tapping two lightning-quick kicks, two small impact stars'),
    'juke': ('wyatt', 'Wyatt faking left and cutting right, a confused shadow going the wrong way'),
    'warm_up': ('wyatt', 'Wyatt stretching his legs, getting ready to race'),
    'slide_tackle': ('wyatt', 'Wyatt doing a scissor kick in mid-air'),
    'hat_trick': ('wyatt', 'Wyatt juggling three soccer balls at once'),
    'blur_kick': ('wyatt', 'Wyatt kicking so fast there are five afterimages of him'),
    'shuffle_step': ('wyatt', 'Wyatt doing fancy shuffle footwork, dance-like'),
    'keep_moving': ('wyatt', 'Wyatt running in a loop around the scene, a circle of speed lines'),
    'whirlwind_kick': ('wyatt', 'Wyatt spinning in a whirlwind kick, a mini tornado around him'),
    'lightning_legs': ('wyatt', 'Wyatt with lightning bolts crackling around his legs'),
    'photo_finish': ('wyatt', 'Wyatt bursting through a finish-line ribbon as a camera flashes'),
    'relay_race': ('wyatt', 'Wyatt grabbing a relay baton mid-run'),
    # Aaron
    'punch': ('aaron', 'Aaron throwing a big cartoon punch'),
    'guard': ('aaron', 'Aaron guarding with crossed arms, tough stance'),
    'big_hammer': ('aaron', 'Aaron raising his giant hammer high overhead, ready to SMASH'),
    'sharpen': ('aaron', 'Aaron sharpening his giant hammer on a big grindstone, sparks flying'),
    'uppercut': ('aaron', 'Aaron winding up a huge haymaker swing'),
    'temper': ('aaron', 'Aaron holding his hammer in a glowing orange forge fire'),
    'brace': ('aaron', 'Aaron crouched like a turtle behind a big round shield'),
    'shoulder_charge': ('aaron', 'Aaron charging shoulder-first like a football player'),
    'deep_breath': ('aaron', 'Aaron taking a huge deep breath, chest puffed, eyes closed, calm'),
    'iron_stance': ('aaron', 'Aaron planted like a statue with his hammer head-down in front of him as a wall'),
    'wide_swing': ('aaron', 'Aaron swinging his hammer in a huge wide arc, a sweeping trail'),
    'hammer_toss': ('aaron', 'Aaron throwing his hammer spinning like a boomerang'),
    'get_pumped': ('aaron', 'Aaron flexing both arms with sparkles and power lines'),
    'anvil': ('aaron', 'Aaron pounding his hammer on an anvil, a shower of sparks'),
    'bounce_back': ('aaron', 'the hammer bouncing back into Aaron\'s hand with a boing'),
    'stomp': ('aaron', 'Aaron stomping the ground, a shockwave ring spreading out'),
    'forged_in_rolfe': ('aaron', 'Aaron at a glowing farm forge with silver grain bins behind him'),
    'titan_grip': ('aaron', 'Aaron gripping his hammer handle, the grip glowing gold'),
    'legendary_swing': ('aaron', 'Aaron doing a legendary golden hammer swing, a starburst of light'),
    # Liam — ALWAYS fully clothed
    'toddle': ('liam', 'Liam toddling forward bravely holding a toy'),
    'hide': ('liam', 'Liam playing peekaboo, hands over his eyes'),
    'sippy_cup': ('liam', 'Liam drinking an apple juice box with both hands'),
    'waddle': ('liam', 'Liam waddling like a little penguin'),
    'big_gulp': ('liam', 'Liam holding a HUGE cup with a curly straw'),
    'tantrum_toss': ('liam', 'Liam tossing toy blocks in a funny mini tantrum'),
    'blanket_fort': ('liam', 'Liam peeking out of a cozy pillow fort'),
    'wiggle': ('liam', 'Liam hopping with both feet off the ground, giggling'),
    'naptime': ('liam', 'Liam napping peacefully hugging a teddy bear'),
    'uh_oh': ('liam', 'Liam saying uh-oh as toys spill everywhere'),
    'hold_it': ('liam', 'Liam standing with crossed legs and a very determined face, fully clothed'),
    'potty_dance': ('liam', 'Liam doing a silly happy dance, fully clothed in pajamas'),
    'double_flush': ('liam', 'two sparkly swirling whirlpools of bubbles, with Liam cheering between them'),
    'big_kid_stickers': ('liam', 'Liam proudly pointing at a sticker chart covered in gold stars'),
    'big_boy_undies': ('liam', 'Liam in pajamas and a superhero cape, proudly holding up a sealed package of superhero big-kid underwear'),
    'splash_zone': ('liam', 'Liam in his pajamas and little rain boots stomping into a puddle, a big harmless splash of water flying up, laughing'),
    'royal_throne': ('liam', 'Liam in pajamas sitting proudly on the CLOSED lid of a golden throne-shaped training potty, wearing a crown'),
    'emergency': ('liam', 'Liam running fast with a spinning red siren light on his head, fully clothed'),
    'all_by_myself': ('liam', 'Liam giving a huge proud thumbs-up, "I did it all by myself" pose'),
}
LIAM_CLOTHED = " Liam is ALWAYS fully clothed in pajamas or a shirt and pants — never in underwear, a diaper, or a bare bottom."
for cid, (hero, desc) in CARD_DESC.items():
    clothed = LIAM_CLOTHED if hero == 'liam' else ''
    job(f'card_{cid}_base', f'{O}cards/{cid}_base.png', f"Square image, 1024x1024.\n{BASE}\n\nSubject: {desc}.{clothed} {LIKE} "
        "Card art for a children's card game.", [f'@hero_{hero}_base'], tier=4)
    for w in ('w1', 'w2', 'w3'):
        job(f'card_{cid}_{w}', f'{O}cards/{cid}_{w}.png', edit(w, desc, f"Costume for this world: {HERO_COSTUME[hero][w]}.{clothed}"),
            [f'@card_{cid}_base'], tier=5)
job('card_sass_w3', f'{O}cards/sass_w3.png', f"Square image, 1024x1024.\n{world_style('w3')}\n\nSubject: a dramatic sassy eye-roll: "
    "a cartoon teacup character flipping its imaginary hair and rolling its eyes with a big sigh. Funny, no text.", tier=4)
job('ui_icon', f'{O}ui/icon.png', "Square image, 1024x1024.\n" + SCENE + "\n\nSubject: a bold app icon: a pink tiara, a squishy ball "
    "and a teacup stacked playfully on a golden shield, simple and readable at small size, no text.", tier=2)

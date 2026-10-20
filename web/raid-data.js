// Extracted from the public Mifozov client; see tools/extract-raids.cjs.
(function(root){const data={
  "version": "0.42",
  "source": "https://mifozov.com/assets/index-C15W6ar6.js",
  "guide": "https://mifozov.com/players#bosses",
  "checkedAt": "2026-10-20",
  "sha256": "f0f1dca51fbc5167a3a72a598b471bb47a9e094bf750ff7a1c8d2397988024cd",
  "rules": {
    "windows": [
      8,
      13,
      18
    ],
    "windowHours": 5,
    "eggMin": 60,
    "liveMin": 45,
    "starWeights": [
      0.5,
      0.35,
      0.15
    ],
    "tiers": [
      {
        "level": 20,
        "hp": 2000,
        "pool": [
          "volkodlak",
          "ognenny_zmey",
          "shchuka",
          "nagay"
        ]
      },
      {
        "level": 25,
        "hp": 4000,
        "pool": [
          "drevlen",
          "aspid",
          "kashcheeva_utka",
          "tur"
        ]
      },
      {
        "level": 30,
        "hp": 7500,
        "pool": [
          "poloz",
          "vasilisk",
          "rarog",
          "finist"
        ]
      }
    ],
    "testCycleMin": 20,
    "devEggSec": 60,
    "lobbySec": 120,
    "maxPlayers": 6,
    "fightSec": 180,
    "catchMin": 15,
    "catchBase": [
      0.35,
      0.3,
      0.25
    ],
    "attackK": 2.5,
    "stones": {
      "base": 6,
      "mvp": 4,
      "holders": 2,
      "group": 1,
      "groupFrom": 4
    },
    "reward": [
      {
        "xp": 3000,
        "items": {
          "dust": 300,
          "stone_grom": 2
        }
      },
      {
        "xp": 5000,
        "items": {
          "dust": 500,
          "stone_grom": 3
        }
      },
      {
        "xp": 8000,
        "items": {
          "dust": 800,
          "stone_grom": 4
        }
      }
    ]
  },
  "battle": {
    "squad": 6,
    "hpK": 4,
    "fastPower": 32,
    "ultraPower": 270,
    "scale": 0.5,
    "energyPerFast": 12,
    "ultraCost": 100,
    "fastMs": 520,
    "aiFastMs": 1150,
    "speedSpan": [
      0.75,
      1.35
    ],
    "runeMin": 0.3,
    "runeMax": 1.5,
    "blockMax": 0.8,
    "runeTolerance": 0.07,
    "attackRuneMs": 3000,
    "defendRuneMs": 2500,
    "swapCooldownMs": 60000,
    "aiStartMs": 1500,
    "faintPickMs": 10000,
    "healMinutes": 60
  },
  "retired": [
    "izbushka",
    "mora",
    "ognevka",
    "svetlyachok",
    "tenetnik",
    "ugolny_zhuk",
    "uzh_tsar",
    "zapechnik",
    "bozhya_korovka",
    "medunitsa"
  ],
  "catalog": {
    "version": "0.42",
    "excluded": [
      "izbushka"
    ],
    "species": [
      {
        "id": "ogonyok",
        "name": "Блуждающий огонёк",
        "rarity": "common",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 70,
          "stoikost": 60,
          "pryt": 130,
          "duh": 120
        }
      },
      {
        "id": "auka",
        "name": "Аука",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 120,
          "sila": 80,
          "stoikost": 100,
          "pryt": 90,
          "duh": 80
        }
      },
      {
        "id": "shishiga",
        "name": "Шишига",
        "rarity": "common",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 110,
          "sila": 95,
          "stoikost": 85,
          "pryt": 100,
          "duh": 75
        }
      },
      {
        "id": "anchutka",
        "name": "Анчутка",
        "rarity": "common",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 110,
          "stoikost": 70,
          "pryt": 115,
          "duh": 80
        }
      },
      {
        "id": "bayun",
        "name": "Кот Баюн",
        "rarity": "uncommon",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 140,
          "sila": 120,
          "stoikost": 110,
          "pryt": 120,
          "duh": 150
        }
      },
      {
        "id": "rarog",
        "name": "Рарог",
        "rarity": "rare",
        "elements": [
          "ogon",
          "veter"
        ],
        "base": {
          "zhivitsa": 150,
          "sila": 180,
          "stoikost": 120,
          "pryt": 190,
          "duh": 160
        }
      },
      {
        "id": "indrik",
        "name": "Индрик",
        "rarity": "legendary",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 260,
          "sila": 220,
          "stoikost": 250,
          "pryt": 160,
          "duh": 210
        }
      },
      {
        "id": "zhar_ptitsa",
        "name": "Жар-птица",
        "rarity": "legendary",
        "elements": [
          "yav",
          "ogon"
        ],
        "base": {
          "zhivitsa": 200,
          "sila": 210,
          "stoikost": 170,
          "pryt": 240,
          "duh": 270
        }
      },
      {
        "id": "rosinka",
        "name": "Росинка",
        "rarity": "common",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "kvakusha",
        "name": "Квакуша",
        "rarity": "common",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 90,
          "stoikost": 90,
          "pryt": 90,
          "duh": 90
        }
      },
      {
        "id": "rachok",
        "name": "Пятун",
        "rarity": "common",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 90,
          "stoikost": 125,
          "pryt": 60,
          "duh": 85
        }
      },
      {
        "id": "tumannik",
        "name": "Туманник",
        "rarity": "common",
        "elements": [
          "voda",
          "nav"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 75,
          "stoikost": 80,
          "pryt": 100,
          "duh": 135
        }
      },
      {
        "id": "ersh",
        "name": "Ёрш Ершович",
        "rarity": "common",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "vodokon",
        "name": "Водокон",
        "rarity": "uncommon",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 110,
          "sila": 120,
          "stoikost": 95,
          "pryt": 170,
          "duh": 110
        }
      },
      {
        "id": "som",
        "name": "Водяник",
        "rarity": "uncommon",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 160,
          "sila": 105,
          "stoikost": 155,
          "pryt": 70,
          "duh": 100
        }
      },
      {
        "id": "studenets",
        "name": "Студенец",
        "rarity": "uncommon",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 105,
          "sila": 95,
          "stoikost": 100,
          "pryt": 125,
          "duh": 165
        }
      },
      {
        "id": "uzh_tsar",
        "name": "Ужиный царь",
        "rarity": "uncommon",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 115,
          "sila": 100,
          "stoikost": 105,
          "pryt": 130,
          "duh": 175
        }
      },
      {
        "id": "lebed",
        "name": "Лебедь белая",
        "rarity": "uncommon",
        "elements": [
          "voda",
          "veter"
        ],
        "base": {
          "zhivitsa": 120,
          "sila": 120,
          "stoikost": 120,
          "pryt": 120,
          "duh": 120
        }
      },
      {
        "id": "shchuka",
        "name": "Велевница",
        "rarity": "rare",
        "elements": [
          "voda"
        ],
        "base": {
          "zhivitsa": 165,
          "sila": 220,
          "stoikost": 160,
          "pryt": 160,
          "duh": 120
        }
      },
      {
        "id": "zolotaya_rybka",
        "name": "Золотая рыбка",
        "rarity": "rare",
        "elements": [
          "voda",
          "yav"
        ],
        "base": {
          "zhivitsa": 140,
          "sila": 125,
          "stoikost": 135,
          "pryt": 165,
          "duh": 220
        }
      },
      {
        "id": "utitsa",
        "name": "Утица",
        "rarity": "legendary",
        "elements": [
          "voda",
          "yav"
        ],
        "base": {
          "zhivitsa": 200,
          "sila": 180,
          "stoikost": 190,
          "pryt": 235,
          "duh": 315
        }
      },
      {
        "id": "ryba_kit",
        "name": "Рыба-кит",
        "rarity": "legendary",
        "elements": [
          "voda",
          "zemlya"
        ],
        "base": {
          "zhivitsa": 280,
          "sila": 185,
          "stoikost": 270,
          "pryt": 125,
          "duh": 175
        }
      },
      {
        "id": "iskorka",
        "name": "Искорка",
        "rarity": "common",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 100,
          "stoikost": 80,
          "pryt": 135,
          "duh": 90
        }
      },
      {
        "id": "zharok",
        "name": "Жарок",
        "rarity": "common",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 125,
          "sila": 85,
          "stoikost": 120,
          "pryt": 55,
          "duh": 80
        }
      },
      {
        "id": "ovinny_kot",
        "name": "Овинный кот",
        "rarity": "common",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 95,
          "stoikost": 95,
          "pryt": 95,
          "duh": 95
        }
      },
      {
        "id": "petushok",
        "name": "Красный петушок",
        "rarity": "common",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 100,
          "stoikost": 80,
          "pryt": 135,
          "duh": 90
        }
      },
      {
        "id": "zapechnik",
        "name": "Запечник",
        "rarity": "common",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 95,
          "stoikost": 95,
          "pryt": 95,
          "duh": 95
        }
      },
      {
        "id": "ugolny_zhuk",
        "name": "Угольный жук",
        "rarity": "common",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 85,
          "stoikost": 125,
          "pryt": 60,
          "duh": 80
        }
      },
      {
        "id": "ognevka",
        "name": "Огнёвка",
        "rarity": "common",
        "elements": [
          "ogon",
          "yav"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 100,
          "stoikost": 80,
          "pryt": 135,
          "duh": 90
        }
      },
      {
        "id": "kostrovik",
        "name": "Костровик",
        "rarity": "uncommon",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 120,
          "sila": 160,
          "stoikost": 115,
          "pryt": 115,
          "duh": 85
        }
      },
      {
        "id": "lisa",
        "name": "Лиса Патрикеевна",
        "rarity": "uncommon",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 105,
          "sila": 120,
          "stoikost": 95,
          "pryt": 165,
          "duh": 105
        }
      },
      {
        "id": "zherebenok",
        "name": "Огненный жеребёнок",
        "rarity": "uncommon",
        "elements": [
          "ogon"
        ],
        "base": {
          "zhivitsa": 110,
          "sila": 120,
          "stoikost": 95,
          "pryt": 170,
          "duh": 110
        }
      },
      {
        "id": "sivka",
        "name": "Сивка-Бурка",
        "rarity": "rare",
        "elements": [
          "ogon",
          "veter"
        ],
        "base": {
          "zhivitsa": 165,
          "sila": 220,
          "stoikost": 155,
          "pryt": 155,
          "duh": 120
        }
      },
      {
        "id": "ognenny_zmey",
        "name": "Огненный змей",
        "rarity": "rare",
        "elements": [
          "ogon",
          "nav"
        ],
        "base": {
          "zhivitsa": 140,
          "sila": 125,
          "stoikost": 130,
          "pryt": 165,
          "duh": 215
        }
      },
      {
        "id": "gorynych",
        "name": "Змей Горыныч",
        "rarity": "legendary",
        "elements": [
          "ogon",
          "nav"
        ],
        "base": {
          "zhivitsa": 220,
          "sila": 290,
          "stoikost": 210,
          "pryt": 210,
          "duh": 155
        }
      },
      {
        "id": "borovichok",
        "name": "Боровичок",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 85,
          "stoikost": 125,
          "pryt": 60,
          "duh": 80
        }
      },
      {
        "id": "mokhnatik",
        "name": "Мохнатик",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 90,
          "stoikost": 125,
          "pryt": 60,
          "duh": 85
        }
      },
      {
        "id": "shishok",
        "name": "Шишок",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "listovert",
        "name": "Листоверт",
        "rarity": "common",
        "elements": [
          "drevo",
          "veter"
        ],
        "base": {
          "zhivitsa": 80,
          "sila": 90,
          "stoikost": 70,
          "pryt": 125,
          "duh": 80
        }
      },
      {
        "id": "ezhik",
        "name": "Колючник",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 90,
          "stoikost": 125,
          "pryt": 60,
          "duh": 85
        }
      },
      {
        "id": "rogach",
        "name": "Рогач",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 100,
          "sila": 130,
          "stoikost": 95,
          "pryt": 95,
          "duh": 70
        }
      },
      {
        "id": "zaychik",
        "name": "Побегайчик",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "vyunok",
        "name": "Вьюнок",
        "rarity": "common",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 95,
          "stoikost": 95,
          "pryt": 95,
          "duh": 95
        }
      },
      {
        "id": "belka",
        "name": "Златоорешница",
        "rarity": "uncommon",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 115,
          "sila": 130,
          "stoikost": 105,
          "pryt": 180,
          "duh": 115
        }
      },
      {
        "id": "mishka",
        "name": "Михайло Потапыч",
        "rarity": "uncommon",
        "elements": [
          "drevo",
          "zemlya"
        ],
        "base": {
          "zhivitsa": 170,
          "sila": 115,
          "stoikost": 165,
          "pryt": 75,
          "duh": 110
        }
      },
      {
        "id": "sokhatik",
        "name": "Сохатик",
        "rarity": "uncommon",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 170,
          "stoikost": 120,
          "pryt": 120,
          "duh": 90
        }
      },
      {
        "id": "paporotnik",
        "name": "Цвет папоротника",
        "rarity": "rare",
        "elements": [
          "drevo",
          "yav"
        ],
        "base": {
          "zhivitsa": 150,
          "sila": 130,
          "stoikost": 140,
          "pryt": 175,
          "duh": 230
        }
      },
      {
        "id": "drevlen",
        "name": "Древень",
        "rarity": "rare",
        "elements": [
          "drevo"
        ],
        "base": {
          "zhivitsa": 220,
          "sila": 145,
          "stoikost": 210,
          "pryt": 95,
          "duh": 135
        }
      },
      {
        "id": "tur",
        "name": "Тур Золотые рога",
        "rarity": "rare",
        "elements": [
          "drevo",
          "zemlya"
        ],
        "base": {
          "zhivitsa": 160,
          "sila": 215,
          "stoikost": 155,
          "pryt": 155,
          "duh": 115
        }
      },
      {
        "id": "zlatorog",
        "name": "Олень Златорог",
        "rarity": "legendary",
        "elements": [
          "drevo",
          "yav"
        ],
        "base": {
          "zhivitsa": 195,
          "sila": 175,
          "stoikost": 185,
          "pryt": 230,
          "duh": 305
        }
      },
      {
        "id": "golysh",
        "name": "Голыш",
        "rarity": "common",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 125,
          "sila": 85,
          "stoikost": 120,
          "pryt": 55,
          "duh": 80
        }
      },
      {
        "id": "krotenok",
        "name": "Землерой",
        "rarity": "common",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 85,
          "stoikost": 125,
          "pryt": 60,
          "duh": 80
        }
      },
      {
        "id": "svistulka",
        "name": "Свистулька",
        "rarity": "common",
        "elements": [
          "zemlya",
          "veter"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 100,
          "stoikost": 80,
          "pryt": 135,
          "duh": 90
        }
      },
      {
        "id": "barsuk",
        "name": "Норушник",
        "rarity": "common",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 85,
          "stoikost": 125,
          "pryt": 60,
          "duh": 80
        }
      },
      {
        "id": "norushka",
        "name": "Норушка",
        "rarity": "common",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 130,
          "duh": 85
        }
      },
      {
        "id": "bagan",
        "name": "Баган",
        "rarity": "common",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 95,
          "stoikost": 95,
          "pryt": 95,
          "duh": 95
        }
      },
      {
        "id": "ryaba",
        "name": "Курочка Ряба",
        "rarity": "uncommon",
        "elements": [
          "zemlya",
          "yav"
        ],
        "base": {
          "zhivitsa": 175,
          "sila": 115,
          "stoikost": 170,
          "pryt": 75,
          "duh": 110
        }
      },
      {
        "id": "yashcherka",
        "name": "Медная ящерка",
        "rarity": "uncommon",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 115,
          "sila": 100,
          "stoikost": 110,
          "pryt": 135,
          "duh": 175
        }
      },
      {
        "id": "polkan",
        "name": "Полкан",
        "rarity": "uncommon",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 125,
          "sila": 170,
          "stoikost": 120,
          "pryt": 120,
          "duh": 90
        }
      },
      {
        "id": "gorbunok",
        "name": "Конёк-Горбунок",
        "rarity": "rare",
        "elements": [
          "zemlya",
          "veter"
        ],
        "base": {
          "zhivitsa": 145,
          "sila": 160,
          "stoikost": 130,
          "pryt": 225,
          "duh": 145
        }
      },
      {
        "id": "poloz",
        "name": "Великий Полоз",
        "rarity": "rare",
        "elements": [
          "zemlya"
        ],
        "base": {
          "zhivitsa": 210,
          "sila": 140,
          "stoikost": 200,
          "pryt": 95,
          "duh": 130
        }
      },
      {
        "id": "kopytse",
        "name": "Серебряное копытце",
        "rarity": "rare",
        "elements": [
          "zemlya",
          "yav"
        ],
        "base": {
          "zhivitsa": 150,
          "sila": 135,
          "stoikost": 140,
          "pryt": 175,
          "duh": 235
        }
      },
      {
        "id": "skiper",
        "name": "Скипер",
        "rarity": "legendary",
        "elements": [
          "zemlya",
          "nav"
        ],
        "base": {
          "zhivitsa": 225,
          "sila": 300,
          "stoikost": 215,
          "pryt": 215,
          "duh": 160
        }
      },
      {
        "id": "vikhorek",
        "name": "Вихорёк",
        "rarity": "common",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 100,
          "stoikost": 80,
          "pryt": 135,
          "duh": 90
        }
      },
      {
        "id": "soroka",
        "name": "Белобока",
        "rarity": "common",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "vorobey",
        "name": "Чирик",
        "rarity": "common",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 130,
          "duh": 85
        }
      },
      {
        "id": "sinichka",
        "name": "Синичка",
        "rarity": "common",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 130,
          "duh": 85
        }
      },
      {
        "id": "lastochka",
        "name": "Касатка",
        "rarity": "common",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "zhuravl",
        "name": "Журавушка",
        "rarity": "uncommon",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 130,
          "stoikost": 130,
          "pryt": 130,
          "duh": 130
        }
      },
      {
        "id": "stribozhich",
        "name": "Стрибожич",
        "rarity": "uncommon",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 110,
          "sila": 120,
          "stoikost": 95,
          "pryt": 170,
          "duh": 110
        }
      },
      {
        "id": "voron",
        "name": "Ворон Воронович",
        "rarity": "uncommon",
        "elements": [
          "veter",
          "nav"
        ],
        "base": {
          "zhivitsa": 110,
          "sila": 100,
          "stoikost": 105,
          "pryt": 130,
          "duh": 175
        }
      },
      {
        "id": "filin",
        "name": "Пугач",
        "rarity": "uncommon",
        "elements": [
          "veter",
          "nav"
        ],
        "base": {
          "zhivitsa": 110,
          "sila": 95,
          "stoikost": 105,
          "pryt": 130,
          "duh": 170
        }
      },
      {
        "id": "gusi",
        "name": "Гуси-лебеди",
        "rarity": "uncommon",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 125,
          "sila": 165,
          "stoikost": 115,
          "pryt": 115,
          "duh": 90
        }
      },
      {
        "id": "purga",
        "name": "Пурга",
        "rarity": "uncommon",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 115,
          "sila": 130,
          "stoikost": 105,
          "pryt": 180,
          "duh": 115
        }
      },
      {
        "id": "finist",
        "name": "Финист",
        "rarity": "rare",
        "elements": [
          "veter",
          "yav"
        ],
        "base": {
          "zhivitsa": 170,
          "sila": 225,
          "stoikost": 160,
          "pryt": 160,
          "duh": 120
        }
      },
      {
        "id": "nagay",
        "name": "Нагай",
        "rarity": "rare",
        "elements": [
          "veter"
        ],
        "base": {
          "zhivitsa": 155,
          "sila": 210,
          "stoikost": 150,
          "pryt": 150,
          "duh": 110
        }
      },
      {
        "id": "stratim",
        "name": "Стратим",
        "rarity": "legendary",
        "elements": [
          "veter",
          "voda"
        ],
        "base": {
          "zhivitsa": 195,
          "sila": 175,
          "stoikost": 185,
          "pryt": 225,
          "duh": 300
        }
      },
      {
        "id": "zaychik_solnechny",
        "name": "Солнечный зайчик",
        "rarity": "common",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "svetlyachok",
        "name": "Купалец",
        "rarity": "common",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 75,
          "stoikost": 80,
          "pryt": 100,
          "duh": 135
        }
      },
      {
        "id": "perepelka",
        "name": "Житница",
        "rarity": "common",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 95,
          "stoikost": 95,
          "pryt": 95,
          "duh": 95
        }
      },
      {
        "id": "bozhya_korovka",
        "name": "Божья коровка",
        "rarity": "common",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 95,
          "stoikost": 95,
          "pryt": 95,
          "duh": 95
        }
      },
      {
        "id": "golub",
        "name": "Вестник",
        "rarity": "common",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 95,
          "sila": 95,
          "stoikost": 95,
          "pryt": 95,
          "duh": 95
        }
      },
      {
        "id": "kolobok",
        "name": "Колобок",
        "rarity": "common",
        "elements": [
          "yav",
          "zemlya"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 95,
          "stoikost": 75,
          "pryt": 135,
          "duh": 85
        }
      },
      {
        "id": "zoryanik",
        "name": "Зорянник",
        "rarity": "uncommon",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 120,
          "sila": 120,
          "stoikost": 120,
          "pryt": 120,
          "duh": 120
        }
      },
      {
        "id": "busel",
        "name": "Бусел",
        "rarity": "uncommon",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 125,
          "sila": 125,
          "stoikost": 125,
          "pryt": 125,
          "duh": 125
        }
      },
      {
        "id": "medunitsa",
        "name": "Медуница",
        "rarity": "uncommon",
        "elements": [
          "yav",
          "drevo"
        ],
        "base": {
          "zhivitsa": 110,
          "sila": 125,
          "stoikost": 100,
          "pryt": 170,
          "duh": 110
        }
      },
      {
        "id": "zlatogriv",
        "name": "Конь Златогрив",
        "rarity": "rare",
        "elements": [
          "yav"
        ],
        "base": {
          "zhivitsa": 145,
          "sila": 130,
          "stoikost": 140,
          "pryt": 170,
          "duh": 230
        }
      },
      {
        "id": "netopyr",
        "name": "Нетопырь",
        "rarity": "common",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 90,
          "sila": 100,
          "stoikost": 80,
          "pryt": 135,
          "duh": 90
        }
      },
      {
        "id": "korgorusha",
        "name": "Коргоруша",
        "rarity": "common",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 80,
          "sila": 70,
          "stoikost": 75,
          "pryt": 95,
          "duh": 125
        }
      },
      {
        "id": "zhaba",
        "name": "Бородавица",
        "rarity": "common",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 130,
          "sila": 90,
          "stoikost": 125,
          "pryt": 60,
          "duh": 85
        }
      },
      {
        "id": "tenetnik",
        "name": "Тенетник",
        "rarity": "common",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 75,
          "stoikost": 80,
          "pryt": 100,
          "duh": 135
        }
      },
      {
        "id": "sych",
        "name": "Полуночник",
        "rarity": "common",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 85,
          "sila": 75,
          "stoikost": 80,
          "pryt": 95,
          "duh": 130
        }
      },
      {
        "id": "mora",
        "name": "Мора",
        "rarity": "uncommon",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 115,
          "sila": 105,
          "stoikost": 110,
          "pryt": 135,
          "duh": 180
        }
      },
      {
        "id": "cherny_petukh",
        "name": "Чёрный петух",
        "rarity": "uncommon",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 120,
          "sila": 160,
          "stoikost": 115,
          "pryt": 115,
          "duh": 85
        }
      },
      {
        "id": "volkodlak",
        "name": "Волкодлак",
        "rarity": "rare",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 160,
          "sila": 215,
          "stoikost": 150,
          "pryt": 150,
          "duh": 115
        }
      },
      {
        "id": "aspid",
        "name": "Аспид",
        "rarity": "rare",
        "elements": [
          "nav",
          "zemlya"
        ],
        "base": {
          "zhivitsa": 155,
          "sila": 210,
          "stoikost": 150,
          "pryt": 150,
          "duh": 110
        }
      },
      {
        "id": "izbushka",
        "name": "Избушка на курьих ножках",
        "rarity": "rare",
        "elements": [
          "nav",
          "drevo"
        ],
        "base": {
          "zhivitsa": 215,
          "sila": 145,
          "stoikost": 205,
          "pryt": 95,
          "duh": 135
        }
      },
      {
        "id": "kashcheeva_utka",
        "name": "Кощеева утка",
        "rarity": "rare",
        "elements": [
          "nav",
          "veter"
        ],
        "base": {
          "zhivitsa": 145,
          "sila": 125,
          "stoikost": 135,
          "pryt": 165,
          "duh": 220
        }
      },
      {
        "id": "vasilisk",
        "name": "Василиск",
        "rarity": "rare",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 140,
          "sila": 125,
          "stoikost": 130,
          "pryt": 160,
          "duh": 215
        }
      },
      {
        "id": "kot_chernobog",
        "name": "Ночевик",
        "rarity": "legendary",
        "elements": [
          "nav"
        ],
        "base": {
          "zhivitsa": 200,
          "sila": 180,
          "stoikost": 190,
          "pryt": 235,
          "duh": 310
        }
      }
    ]
  },
  "bosses": [
    {
      "id": "volkodlak",
      "stars": 1,
      "level": 20,
      "hp": 2000
    },
    {
      "id": "ognenny_zmey",
      "stars": 1,
      "level": 20,
      "hp": 2000
    },
    {
      "id": "shchuka",
      "stars": 1,
      "level": 20,
      "hp": 2000
    },
    {
      "id": "nagay",
      "stars": 1,
      "level": 20,
      "hp": 2000
    },
    {
      "id": "drevlen",
      "stars": 2,
      "level": 25,
      "hp": 4000
    },
    {
      "id": "aspid",
      "stars": 2,
      "level": 25,
      "hp": 4000
    },
    {
      "id": "kashcheeva_utka",
      "stars": 2,
      "level": 25,
      "hp": 4000
    },
    {
      "id": "tur",
      "stars": 2,
      "level": 25,
      "hp": 4000
    },
    {
      "id": "poloz",
      "stars": 3,
      "level": 30,
      "hp": 7500
    },
    {
      "id": "vasilisk",
      "stars": 3,
      "level": 30,
      "hp": 7500
    },
    {
      "id": "rarog",
      "stars": 3,
      "level": 30,
      "hp": 7500
    },
    {
      "id": "finist",
      "stars": 3,
      "level": 30,
      "hp": 7500
    }
  ]
};if(typeof module!=='undefined'&&module.exports)module.exports=data;root.MifoRaidData=data;})(typeof globalThis!=='undefined'?globalThis:this);

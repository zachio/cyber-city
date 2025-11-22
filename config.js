// Game Configuration File
// Modify these values to customize the game

const CONFIG = {
    // Game Settings
    NUM_ENEMIES: 0, // Number of enemies to spawn at game start
    LOCATION_ENCOUNTER_CHANCE: 0.5, // Chance of random encounter (0.0 to 1.0)
    FADE_OUT_DURATION: 500, // Animation duration in milliseconds

    // Player Initial Stats
    PLAYER: {
        initialHp: 0,
        initialMaxHp: 100,
        initialStrength: 1,
        initialDefense: 1,
        initialRanged: 1,
        initialCredits: 0,
        initialTotalHpHealed: 0,
        initialNextLevelThreshold: 100
    },

    // Enemy Stats
    ENEMIES: {
        cyberPunk: {
            hp: 100,
            maxHp: 100
        },
        swordPunk: {
            hp: 120,
            maxHp: 120
        }
    },

    // Attack Damage Values
    ATTACK_DAMAGE: {
        melee: { min: 15, max: 25 },
        ranged: { min: 10, max: 20 }
    },

    // Enemy Attack Damage
    ENEMY_ATTACK_DAMAGE: {
        cyberPunk: { min: 8, max: 15 },
        swordPunk: { min: 10, max: 18 }
    },

    // Weapon Damage Bonuses
    WEAPON_DAMAGE_BONUS: {
        bat: 5,
        sword: 7
    },

    // Skill Improvement Rates
    SKILL_IMPROVEMENT: {
        melee: 0.1,      // Strength improves by 0.1 per melee attack
        ranged: 0.1,     // Ranged skill improves by 0.1 per ranged attack
        defense: 0.01    // Defense improves by 0.01 per point of damage taken
    },

    // Prices
    PRICES: {
        // Buying from merchant
        buyBat: 20,
        buySword: 25,
        buyStimPack: 15,
        
        // Selling to merchant
        sellBat: 10,
        sellSword: 15,
        
        // Services
        busFare: 10,
        healCost: 10
    },

    // Initial Inventories
    INITIAL_INVENTORY: {
        player: {
            bat: 0,
            sword: 0,
            stimPack: 0
        },
        merchant: {
            bat: 0,
            sword: 0,
            stimPack: 10
        }
    },

    // Location Display Names
    LOCATION_DISPLAY_NAMES: {
        hospital: 'Hospital',
        'cyber-market': 'Cyber Market',
        'main-street-market': 'Main Street Market',
        streets: 'Grove Street',
        'bus-stop': 'Bus Stop',
        'main-street': 'Downtown',
        battle: 'Battle'
    },

    // Street Locations
    STREET_LOCATIONS: [
        { id: 'streets', name: 'Grove Street', image: 'img/cyber-city-street.jpeg' },
        { id: 'main-street', name: 'Downtown', image: 'img/downtown.jpeg' }
    ],

    // Zone Card Rules (which location cards appear in which zones)
    ZONE_CARD_RULES: {
        streets: ['hospital', 'cyber-market', 'bus-stop'],
        hospital: ['doctor', 'streets'],
        'cyber-market': ['cyber-merchant', 'streets'],
        'bus-stop': [], // Dynamically populated based on STREET_LOCATIONS
        'main-street': ['bus-stop', 'main-street-market'],
        'main-street-market': ['cyber-merchant', 'main-street'],
        battle: [],
        travel: []
    }
};


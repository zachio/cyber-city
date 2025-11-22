// Use configuration values from config.js
const NUM_ENEMIES = CONFIG.NUM_ENEMIES;
const LOCATION_ENCOUNTER_CHANCE = CONFIG.LOCATION_ENCOUNTER_CHANCE;
const FADE_OUT_DURATION = CONFIG.FADE_OUT_DURATION;

// Game state - track HP for each card
let gameState = {
    player: {
        hp: CONFIG.PLAYER.initialHp,
        maxHp: CONFIG.PLAYER.initialMaxHp,
        strength: CONFIG.PLAYER.initialStrength,
        defense: CONFIG.PLAYER.initialDefense,
        ranged: CONFIG.PLAYER.initialRanged,
        credits: CONFIG.PLAYER.initialCredits,
        totalHpHealed: CONFIG.PLAYER.initialTotalHpHealed,
        nextLevelThreshold: CONFIG.PLAYER.initialNextLevelThreshold
    }
};
let currentBattleEnemyCount = 0;
let currentBattleSwordPunkCount = 0; // Track sword punks separately for sword drops
let pendingDestination = null;
let previousLocation = null; // Track where we came from for street encounters
let currentZone = 'hospital';
let currentStreet = null; // Track which street the player is currently on (streets, main-street, downtown, etc.)

const LOCATION_DISPLAY_NAMES = CONFIG.LOCATION_DISPLAY_NAMES;
const STREET_LOCATIONS = CONFIG.STREET_LOCATIONS;
const ZONE_CARD_RULES = CONFIG.ZONE_CARD_RULES;
const SKILL_IMPROVEMENT = CONFIG.SKILL_IMPROVEMENT;

// Update area name display
function updateAreaNameDisplay() {
    const areaNameDisplay = document.getElementById('area-name-display');
    if (areaNameDisplay) {
        const displayName = getLocationDisplayName(currentZone);
        areaNameDisplay.textContent = displayName;
    }
}

// Save game state to localStorage
function saveGameState() {
    try {
        const stateToSave = {
            gameState: gameState,
            playerInventory: playerInventory,
            merchantInventory: merchantInventory,
            equippedWeapons: equippedWeapons,
            currentZone: currentZone,
            currentStreet: currentStreet,
            previousLocation: previousLocation,
            currentBattleEnemyCount: currentBattleEnemyCount,
            currentBattleSwordPunkCount: currentBattleSwordPunkCount
        };
        localStorage.setItem('cardGameState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('Error saving game state:', error);
    }
}

// Load game state from localStorage
function loadGameState() {
    try {
        const savedState = localStorage.getItem('cardGameState');
        if (savedState) {
            const state = JSON.parse(savedState);

            // Restore game state
            if (state.gameState) {
                gameState = state.gameState;
            }
            if (state.playerInventory) {
                playerInventory = state.playerInventory;
            }
            if (state.merchantInventory) {
                merchantInventory = state.merchantInventory;
            }
            if (state.equippedWeapons) {
                equippedWeapons = state.equippedWeapons;
            }
            if (state.currentZone !== undefined) {
                currentZone = state.currentZone;
            }
            if (state.currentStreet !== undefined) {
                currentStreet = state.currentStreet;
            }
            if (state.previousLocation !== undefined) {
                previousLocation = state.previousLocation;
            }
            if (state.currentBattleEnemyCount !== undefined) {
                currentBattleEnemyCount = state.currentBattleEnemyCount;
            }
            if (state.currentBattleSwordPunkCount !== undefined) {
                currentBattleSwordPunkCount = state.currentBattleSwordPunkCount;
            }

            return true; // Indicates state was loaded
        }
    } catch (error) {
        console.error('Error loading game state:', error);
    }
    return false; // No state was loaded
}

// Initialize enemies in game state
function initializeEnemies() {
    for (let i = 1; i <= NUM_ENEMIES; i++) {
        const enemyId = `enemy${i}`;
        gameState[enemyId] = {
            hp: CONFIG.ENEMIES.cyberPunk.hp,
            maxHp: CONFIG.ENEMIES.cyberPunk.maxHp
        };
    }
}

// Create and append enemy card to the container
function createEnemyCard(enemyId, enemyNumber, enemyType = 'club') {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;

    // Determine enemy name, image, and HP based on type
    const enemyName = enemyType === 'sword' ? `Sword Punk ${enemyNumber}` : `Cyber Punk ${enemyNumber}`;
    const enemyImage = enemyType === 'sword' ? 'img/sword-lady.jpeg' : 'img/cyber-punk-1.jpeg';
    const enemyData = gameState[enemyId];
    const enemyConfig = enemyType === 'sword' ? CONFIG.ENEMIES.swordPunk : CONFIG.ENEMIES.cyberPunk;
    const enemyHp = enemyData ? enemyData.hp : enemyConfig.hp;
    const enemyMaxHp = enemyData ? enemyData.maxHp : enemyConfig.maxHp;
    const hpPercent = (enemyHp / enemyMaxHp) * 100;

    const wrapper = document.createElement('div');
    wrapper.className = 'enemy-card-wrapper';

    wrapper.innerHTML = `
                <div class="card bg-dark text-white border-dark" data-card-id="${enemyId}">
                    <img src="${enemyImage}" class="card-img-top" alt="${enemyName}">
                    <div class="card-body">
                        <h5 class="card-title">${enemyName}</h5>
                        <p class="card-text mb-1">HP: <span class="hp-value">${enemyHp}</span></p>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-success hp-bar" role="progressbar" style="width: ${hpPercent}%"
                                aria-valuenow="${enemyHp}" aria-valuemin="0" aria-valuemax="${enemyMaxHp}"></div>
                        </div>
                    </div>
                    <div class="list-group list-group-flush">
                        <button class="btn btn-primary w-100 rounded-0 mb-3 attack-btn" data-attack-type="melee"
                            data-target="${enemyId}">Melee Attack</button>
                    </div>
                </div>
            `;

    container.appendChild(wrapper);
    return wrapper;
}

// Create location card (hospital, shop, etc.)
function createLocationCard(locationId, locationName, imagePath) {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;
    const existing = container.querySelector(`[data-location-id="${locationId}"]`);
    if (existing) {
        existing.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'enemy-card-wrapper location-card';
    wrapper.setAttribute('data-location-id', locationId);

    wrapper.style.display = 'none';

    wrapper.innerHTML = `
        <div class="card bg-dark text-white border-dark" data-card-id="${locationId}">
            <img src="${imagePath}" class="card-img-top" alt="${locationName}">
            <div class="card-body">
                <h5 class="card-title">${locationName}</h5>
            </div>
            <div class="list-group list-group-flush">
                <button class="btn btn-primary w-100 rounded-0 mb-3 location-go-btn" data-location-id="${locationId}">Go</button>
            </div>
        </div>
    `;

    container.appendChild(wrapper);
    updateLocationCardsVisibility();
    return wrapper;
}

function getLocationDisplayName(locationId) {
    if (LOCATION_DISPLAY_NAMES[locationId]) {
        return LOCATION_DISPLAY_NAMES[locationId];
    }

    return locationId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Create separate bus stop cards for each street destination
// This function is called when you're at the bus-stop location
// It dynamically shows bus stop cards based on which street the player came from
function createBusStopCards() {
    // Determine which street the player came from (previousLocation or currentZone if it's a street)
    const originStreet = previousLocation && STREET_LOCATIONS.find(s => s.id === previousLocation)
        ? previousLocation
        : (STREET_LOCATIONS.find(s => s.id === currentZone) ? currentZone : 'streets');

    // Create bus stop cards for all streets
    STREET_LOCATIONS.forEach(street => {
        if (street.id === originStreet) {
            // Free return to the street you came from - use street image and "Back to [Street Name]"
            createBusStopLocationCard(street.id, street.name, street.image, true, true);
        } else {
            // Bus fare to go to other streets - use bus stop image and bus stop name
            const busStopName = `${street.name} Bus Stop`;
            createBusStopLocationCard(street.id, busStopName, 'img/cyber-bus-stop.jpeg', false, false);
        }
    });
}

// Create a bus stop location card (to go to a specific bus stop area)
function createBusStopLocationCard(streetId, cardName, imagePath, isFree, isReturn) {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;
    const existing = container.querySelector(`[data-location-id="bus-stop-to-${streetId}"]`);
    if (existing) {
        existing.remove();
    }

    // Get the street name for the button text
    const street = STREET_LOCATIONS.find(s => s.id === streetId);
    const streetName = street ? street.name : cardName;

    const costText = isFree && isReturn ? `Back to ${streetName}` : (isFree ? 'Go' : `Go (${CONFIG.PRICES.busFare} credits)`);
    const buttonClass = isFree ? 'location-go-btn' : 'bus-stop-travel-btn';

    const wrapper = document.createElement('div');
    wrapper.className = 'enemy-card-wrapper location-card';
    wrapper.setAttribute('data-location-id', `bus-stop-to-${streetId}`);

    const cardTitle = isReturn ? streetName : cardName;

    wrapper.style.display = 'none';
    wrapper.innerHTML = `
        <div class="card bg-dark text-white border-dark" data-card-id="bus-stop-to-${streetId}">
            <img src="${imagePath}" class="card-img-top" alt="${cardTitle}">
            <div class="card-body">
                <h5 class="card-title">${cardTitle}</h5>
            </div>
            <div class="list-group list-group-flush">
                <button class="btn btn-primary w-100 rounded-0 mb-3 ${buttonClass}" data-location-id="${streetId}" data-street-id="${streetId}" data-street-name="${streetName}" data-is-free="${isFree}">${costText}</button>
            </div>
        </div>
    `;

    container.appendChild(wrapper);
    updateLocationCardsVisibility();
    return wrapper;
}

// Create a single bus stop destination card
function createBusStopDestinationCard(streetId, streetName, imagePath) {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;
    const existing = container.querySelector(`[data-location-id="bus-stop-${streetId}"]`);
    if (existing) {
        existing.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'enemy-card-wrapper location-card';
    wrapper.setAttribute('data-location-id', `bus-stop-${streetId}`);

    wrapper.style.display = 'none';
    wrapper.innerHTML = `
        <div class="card bg-dark text-white border-dark" data-card-id="bus-stop-${streetId}">
            <img src="${imagePath}" class="card-img-top" alt="${streetName}">
            <div class="card-body">
                <h5 class="card-title">${streetName}</h5>
            </div>
            <div class="list-group list-group-flush">
                <button class="btn btn-primary w-100 rounded-0 mb-3 bus-stop-travel-btn" data-street-id="${streetId}" data-street-name="${streetName}">Go (${CONFIG.PRICES.busFare} credits)</button>
            </div>
        </div>
    `;

    container.appendChild(wrapper);
    updateLocationCardsVisibility();
    return wrapper;
}

function maybeTriggerEncounter(locationId) {
    // Check for random encounters (except when already in battle)
    if (currentZone === 'battle') {
        return false;
    }

    // Disable encounters when traveling TO bus-stop (safe zone)
    // But allow encounters when traveling to main-street (downtown) and other locations
    if (locationId === 'bus-stop') {
        return false;
    }

    // Streets can have encounters too - store previous location for return after flee/victory
    if (Math.random() < LOCATION_ENCOUNTER_CHANCE) {
        const locationName = getLocationDisplayName(locationId);
        const enemyCount = Math.floor(Math.random() * 3) + 1;

        if (locationId === 'streets') {
            addMessage(`Ambush on the streets! ${enemyCount} enemy${enemyCount > 1 ? 's' : ''} appear!`, 'danger');
            // Store where we came from for fleeing
            previousLocation = currentZone !== 'streets' && currentZone !== 'battle' ? currentZone : 'hospital';
            // After victory, we want to arrive at streets
            pendingDestination = 'streets';
        } else {
            addMessage(`Ambush on your way to the ${locationName}!`, 'danger');
            pendingDestination = locationId;
            previousLocation = currentZone;
        }

        spawnRandomEnemies(enemyCount);
        return true;
    }

    if (locationId !== 'streets') {
        pendingDestination = null;
    }
    return false;
}

function arriveAtLocation(locationId) {
    currentZone = locationId;
    // Update currentStreet if arriving at a street location, otherwise set to null
    const isStreet = STREET_LOCATIONS.find(s => s.id === locationId);
    currentStreet = isStreet ? locationId : null;
    updateAreaNameDisplay();
    saveGameState();

    // Determine which cards should be visible in the new location
    const allowedCards = ZONE_CARD_RULES[locationId] || [];

    // Collect all location cards to fade out (remove cards that shouldn't be in the new location)
    const allLocationCards = document.querySelectorAll('.location-card');
    const cardsToRemove = [];

    allLocationCards.forEach(card => {
        const cardLocationId = card.getAttribute('data-location-id');
        // Remove location cards that aren't allowed in the new location
        // Also remove any location navigation cards (hospital, cyber-market, main-street-market, bus-stop, bus-stop-*) as they'll be replaced
        if (cardLocationId === 'hospital' || cardLocationId === 'cyber-market' || cardLocationId === 'main-street-market' || cardLocationId === 'bus-stop' || cardLocationId.startsWith('bus-stop-')) {
            // Always remove navigation location cards when arriving at a new location
            cardsToRemove.push(card);
        } else if (!allowedCards.includes(cardLocationId)) {
            // Remove cards that aren't in the allowed list for this location
            cardsToRemove.push(card);
        }
    });

    // If there are cards to remove, fade them out first
    if (cardsToRemove.length > 0) {
        cardsToRemove.forEach(card => {
            fadeOutAndRemove(card);
        });

        // Wait for fade-out to complete before creating new cards
        setTimeout(() => {
            createLocationCards(locationId);
            // Update info card after location change
            updateCyberBatCard();
        }, FADE_OUT_DURATION);
    } else {
        // No cards to remove, create new cards immediately
        createLocationCards(locationId);
        // Update info card after location change
        updateCyberBatCard();
    }
}

// Helper function to create location-specific cards
function createLocationCards(locationId) {
    if (locationId === 'hospital') {
        addMessage('You enter the hospital...', 'info');
        changeBackground('img/cyber-city-hospital-street.jpeg');
        createDoctorCard();
        createStreetsCard();
        // Doctor talks to the player when arriving at hospital
        setTimeout(() => {
            doctorTalksToPlayer();
        }, 500);
    } else if (locationId === 'cyber-market') {
        addMessage('You enter the Cyber Market...', 'info');
        changeBackground('img/cyber-market.jpeg');
        createCyberMerchantCard();
        createStreetsCard();
    } else if (locationId === 'main-street-market') {
        addMessage('You enter the Main Street Market...', 'info');
        changeBackground('img/main-street-market.jpeg');
        createCyberMerchantCard();
        createLocationCard('main-street', 'Back to Downtown', 'img/downtown.jpeg');
    } else if (locationId === 'streets') {
        addMessage('You arrive at the streets...', 'info');
        changeBackground('img/cyber-city-street.jpeg');
        createLocationCard('hospital', 'Hospital', 'img/cyber-city-hospital-street.jpeg');
        createLocationCard('cyber-market', 'Cyber Market', 'img/cyber-market.jpeg');
        createLocationCard('bus-stop', 'Bus Stop', 'img/cyber-bus-stop.jpeg');
    } else if (locationId === 'bus-stop') {
        addMessage('You arrive at the Bus Stop...', 'info');
        changeBackground('img/cyber-bus-stop.jpeg');
        createBusStopCards();
    } else if (locationId === 'main-street') {
        addMessage('You arrive at Downtown...', 'info');
        changeBackground('img/downtown.jpeg');
        createLocationCard('bus-stop', 'Bus Stop', 'img/cyber-bus-stop.jpeg');
        createLocationCard('main-street-market', 'Main Street Market', 'img/main-street-market.jpeg');
    } else {
        addMessage(`You arrive at the ${getLocationDisplayName(locationId)}.`, 'info');
    }

    updateLocationCardsVisibility();

    // Update info card visibility based on location
    updateCyberBatCard();
}

// Show/hide location cards based on current zone and battle status
function updateLocationCardsVisibility() {
    const locationCards = document.querySelectorAll('.location-card');
    const hasActiveEnemies = checkForActiveEnemies();
    const allowedCards = ZONE_CARD_RULES[currentZone] || [];

    locationCards.forEach(card => {
        const locationId = card.getAttribute('data-location-id');
        // Special handling for bus-stop cards - show all bus-stop-to-* cards when at bus-stop
        const isBusStopCard = locationId && locationId.startsWith('bus-stop-to-');
        const shouldShow = !hasActiveEnemies && (
            allowedCards.includes(locationId) ||
            (isBusStopCard && currentZone === 'bus-stop')
        );

        if (shouldShow) {
            if (card.style.display !== 'flex') {
                card.style.display = 'flex';
                requestAnimationFrame(() => {
                    card.classList.add('show');
                });
            }
        } else {
            card.classList.remove('show');
            card.style.display = 'none';
        }
    });
}

// Check if there are any active enemies
function checkForActiveEnemies() {
    // Check all enemies in gameState dynamically (works with random encounters)
    for (const key in gameState) {
        if (key.startsWith('enemy') && gameState[key].hp > 0) {
            return true;
        }
    }
    return false;
}

// Update flee button visibility based on battle state
function updateFleeButtonVisibility() {
    const fleeBtn = document.getElementById('flee-btn');
    if (!fleeBtn) return;

    const hasActiveEnemies = checkForActiveEnemies();

    if (hasActiveEnemies) {
        // Show flee button when in battle
        fleeBtn.style.display = 'block';
        fleeBtn.disabled = false;
    } else {
        // Hide flee button when not in battle
        fleeBtn.style.display = 'none';
        fleeBtn.disabled = true;
    }
}

// Generic function to fade out and remove an element from the DOM
function fadeOutAndRemove(element, callback) {
    if (!element) {
        if (callback) callback();
        return;
    }

    // Add fade-out class to trigger animation
    element.classList.add('fade-out');

    // Remove from DOM after fade-out animation completes
    setTimeout(() => {
        element.remove();
        if (callback) callback();
    }, FADE_OUT_DURATION);
}

// Remove elements from DOM and call callback when complete
function removeElementsFromDOM(elements, callback) {
    elements.forEach(card => {
        card.remove();
    });

    // Wait for DOM to update before calling callback
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            callback();
        });
    });
}

// Show location cards with fade-in animation
function showLocationCards() {
    updateLocationCardsVisibility();
}

// Fade out and remove a single enemy card from the DOM
function fadeOutAndRemoveEnemy(enemyId) {
    const enemyCard = document.querySelector(`[data-card-id="${enemyId}"]`);
    if (!enemyCard) return;

    const enemyCardWrapper = enemyCard.closest('.enemy-card-wrapper');
    if (!enemyCardWrapper) return;

    // Use the generic fade-out function
    fadeOutAndRemove(enemyCardWrapper);
}

// Spawn all enemies
function spawnEnemies(skipDoctorDialogue = false) {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;

    // Clear container in case we're respawning
    container.innerHTML = '';

    currentBattleEnemyCount = NUM_ENEMIES;
    currentBattleSwordPunkCount = 0; // Only sword punks in downtown count for sword drops
    pendingDestination = null;
    currentZone = 'hospital';
    currentStreet = null; // Not on a street location
    updateAreaNameDisplay();

    // Initialize enemies in game state
    initializeEnemies();

    // Create enemy cards
    for (let i = 1; i <= NUM_ENEMIES; i++) {
        const enemyId = `enemy${i}`;
        createEnemyCard(enemyId, i);
    }

    // Start at the hospital
    changeBackground('img/cyber-city-hospital-street.jpeg');
    createDoctorCard();
    createStreetsCard();

    // Update location cards visibility based on battle status
    updateLocationCardsVisibility();

    // Welcome message at hospital
    if (NUM_ENEMIES > 0) {
        addMessage(`Battle begins! ${NUM_ENEMIES} enemy${NUM_ENEMIES > 1 ? 's' : ''} appear!`, 'info');
    } else {
        if (!skipDoctorDialogue) {
            addMessage('You arrive at the hospital...', 'info');
            // Doctor talks to the player
            setTimeout(() => {
                doctorTalksToPlayer();
            }, 500);
        }
    }

    // Update flee button visibility based on battle state
    updateFleeButtonVisibility();
}

// Message system functions
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString();
}

function addMessage(text, type = 'info') {
    const messageLog = document.getElementById('message-log');
    if (!messageLog) return;

    const messageItem = document.createElement('div');
    messageItem.className = `message-item message-${type}`;

    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = `[${getCurrentTime()}]`;

    const messageText = document.createElement('span');
    messageText.textContent = text;

    messageItem.appendChild(timestamp);
    messageItem.appendChild(messageText);

    // Prepend message at the top (newest messages first)
    messageLog.insertBefore(messageItem, messageLog.firstChild);

    // Auto-scroll to top to show newest message
    messageLog.scrollTop = 0;

    // Limit messages to prevent memory issues (keep first 50, remove oldest from bottom)
    const messages = messageLog.querySelectorAll('.message-item');
    if (messages.length > 50) {
        messages[messages.length - 1].remove();
    }
}

function clearMessages() {
    const messageLog = document.getElementById('message-log');
    if (messageLog) {
        messageLog.innerHTML = '';
    }
}

// Attack damage values
const attackDamage = CONFIG.ATTACK_DAMAGE;

// Player inventory and weapon bonuses
let playerInventory = { ...CONFIG.INITIAL_INVENTORY.player };

// Merchant inventory
let merchantInventory = { ...CONFIG.INITIAL_INVENTORY.merchant };

let equippedWeapons = {
    bat: false,
    sword: false
};

const weaponDamageBonus = CONFIG.WEAPON_DAMAGE_BONUS;
const enemyAttackDamage = CONFIG.ENEMY_ATTACK_DAMAGE.cyberPunk;
const swordPunkAttackDamage = CONFIG.ENEMY_ATTACK_DAMAGE.swordPunk;

// Calculate melee weapon bonus from inventory
function getMeleeWeaponBonus() {
    let bonus = 0;

    if (playerInventory.bat && playerInventory.bat > 0 && isWeaponEquipped('bat')) {
        bonus += weaponDamageBonus.bat;
    }

    if (playerInventory.sword && playerInventory.sword > 0 && isWeaponEquipped('sword')) {
        bonus += weaponDamageBonus.sword;
    }

    return bonus;
}

// Calculate random damage
function calculateDamage(attackType) {
    const damage = attackDamage[attackType];
    let baseDamage = Math.floor(Math.random() * (damage.max - damage.min + 1)) + damage.min;

    // Add player strength and weapon bonus to melee attacks
    if (attackType === 'melee') {
        baseDamage += gameState.player.strength + getMeleeWeaponBonus();
    }
    // Add player ranged skill to ranged attacks
    else if (attackType === 'ranged') {
        baseDamage += gameState.player.ranged;
    }

    return baseDamage;
}

function isWeaponEquipped(weapon) {
    return !!equippedWeapons[weapon];
}

function toggleWeaponEquip(weapon) {
    if (!playerInventory[weapon]) {
        return;
    }

    const wasEquipped = equippedWeapons[weapon];
    const isEquipping = !wasEquipped;

    // If equipping a weapon, unequip the other weapon first
    if (isEquipping && weapon === 'bat' && isWeaponEquipped('sword')) {
        equippedWeapons.sword = false;
        addMessage(`You unequipped the sword.`, 'info');
    } else if (isEquipping && weapon === 'sword' && isWeaponEquipped('bat')) {
        equippedWeapons.bat = false;
        addMessage(`You unequipped the bat.`, 'info');
    }

    equippedWeapons[weapon] = isEquipping;
    updateInventoryUI();
    updateCyberBatCard(); // Update weapon card display

    const action = isEquipping ? 'equipped' : 'unequipped';
    addMessage(`You ${action} the ${weapon}.`, 'info');
    saveGameState();
}

function updateInventoryUI() {
    const batItem = document.getElementById('inventory-bat');
    const batCount = document.getElementById('bat-count');
    const batCountValue = playerInventory.bat ?? 0;

    if (batCount) {
        batCount.textContent = batCountValue;
    }

    // Automatically unequip bat if count reaches 0
    if (batCountValue <= 0 && isWeaponEquipped('bat')) {
        equippedWeapons.bat = false;
        addMessage('You unequipped the bat.', 'info');
    }

    if (batItem) {
        const equipped = isWeaponEquipped('bat');
        batItem.classList.toggle('inventory-equipped', equipped);
        batItem.classList.toggle('inventory-unequipped', !equipped);

        // Hide the button if count is 0, show it if count is greater than 0
        if (batCountValue <= 0) {
            batItem.style.display = 'none';
        } else {
            batItem.style.display = 'block';
        }
    }

    const swordItem = document.getElementById('inventory-sword');
    const swordCount = document.getElementById('sword-count');
    const swordCountValue = playerInventory.sword ?? 0;

    if (swordCount) {
        swordCount.textContent = swordCountValue;
    }

    // Automatically unequip sword if count reaches 0
    if (swordCountValue <= 0 && isWeaponEquipped('sword')) {
        equippedWeapons.sword = false;
        addMessage('You unequipped the sword.', 'info');
    }

    if (swordItem) {
        const equipped = isWeaponEquipped('sword');
        swordItem.classList.toggle('inventory-equipped', equipped);
        swordItem.classList.toggle('inventory-unequipped', !equipped);

        // Hide the button if count is 0, show it if count is greater than 0
        if (swordCountValue <= 0) {
            swordItem.style.display = 'none';
        } else {
            swordItem.style.display = 'block';
        }
    }

    const stimPackItem = document.getElementById('inventory-stim-pack');
    const stimPackCount = document.getElementById('stim-pack-count');
    const stimPackCountValue = playerInventory.stimPack ?? 0;

    if (stimPackCount) {
        stimPackCount.textContent = stimPackCountValue;
    }

    if (stimPackItem) {
        // Hide the button if count is 0, show it if count is greater than 0
        if (stimPackCountValue <= 0) {
            stimPackItem.style.display = 'none';
        } else {
            stimPackItem.style.display = 'block';
        }
    }

    // Update Cyber Bat card visibility
    updateCyberBatCard();
    saveGameState();
}

// Update info card to show different items/characters (Cyber Doctor, Cyber Bat, etc.)
function updateCyberBatCard() {
    const infoCard = document.querySelector('[data-card-id="cyber-info-card"]');
    if (!infoCard) return;

    const batCount = playerInventory.bat ?? 0;
    const swordCount = playerInventory.sword ?? 0;
    const isBatEquipped = isWeaponEquipped('bat') && batCount > 0;
    const isSwordEquipped = isWeaponEquipped('sword') && swordCount > 0;
    const isAtHospital = currentZone === 'hospital';

    // Show equipped weapon (sword takes priority over bat)
    if (isSwordEquipped) {
        // Show Cyber Sword
        const img = document.getElementById('cyber-info-card-img');
        const title = document.getElementById('cyber-info-card-title');
        const statsList = document.getElementById('cyber-info-card-stats');

        if (img) {
            img.src = 'img/cyber-sword.jpeg';
            img.alt = 'Cyber Sword';
        }
        if (title) title.textContent = 'Cyber Sword';

        if (statsList) {
            statsList.innerHTML = `<li class="list-group-item bg-dark text-white border-secondary">Melee Damage: <span id="sword-damage-stat">+${weaponDamageBonus.sword}</span></li>`;
        }

        infoCard.style.display = 'block';
    } else if (isBatEquipped) {
        // Show Cyber Bat
        const img = document.getElementById('cyber-info-card-img');
        const title = document.getElementById('cyber-info-card-title');
        const statsList = document.getElementById('cyber-info-card-stats');

        if (img) {
            img.src = 'img/cyber-bat.jpeg';
            img.alt = 'Cyber Bat';
        }
        if (title) title.textContent = 'Cyber Bat';

        if (statsList) {
            statsList.innerHTML = `<li class="list-group-item bg-dark text-white border-secondary">Melee Damage: <span id="bat-damage-stat">+${weaponDamageBonus.bat}</span></li>`;
        }

        infoCard.style.display = 'block';
    } else if (isAtHospital) {
        // Show Cyber Doctor only when at hospital
        const img = document.getElementById('cyber-info-card-img');
        const title = document.getElementById('cyber-info-card-title');
        const statsList = document.getElementById('cyber-info-card-stats');

        if (img) {
            img.src = 'img/cyber-doctor.jpeg';
            img.alt = 'Cyber Doctor';
        }
        if (title) title.textContent = 'Cyber Doctor';

        if (statsList) {
            statsList.innerHTML = '<li class="list-group-item bg-dark text-white border-secondary">Healing: Automatic (Debt)</li>';
        }

        infoCard.style.display = 'block';
    } else {
        // Hide card when not at hospital and bat is not equipped
        infoCard.style.display = 'none';
    }
}

// Update player stats display
function updatePlayerStats() {
    const strStat = document.getElementById('str-stat');
    const defenseStat = document.getElementById('defense-stat');
    const rangedStat = document.getElementById('ranged-stat');

    if (strStat) {
        strStat.textContent = Math.round(gameState.player.strength);
    }

    if (defenseStat) {
        defenseStat.textContent = Math.round(gameState.player.defense);
    }

    if (rangedStat) {
        rangedStat.textContent = Math.round(gameState.player.ranged);
    }

    saveGameState();
}

// Improve player stat based on action
function improveStat(statName, improvement, actionDescription) {
    const oldValue = gameState.player[statName];
    gameState.player[statName] += improvement;
    updatePlayerStats();

    // Check if stat increased to the next whole number level
    const oldRounded = Math.round(oldValue);
    const newRounded = Math.round(gameState.player[statName]);

    if (newRounded > oldRounded) {
        const statDisplayName = statName.charAt(0).toUpperCase() + statName.slice(1);
        addMessage(`${statDisplayName} leveled up to ${newRounded}!`, 'success');
    }
}

// Update HP display and progress bar
function updateCardHP(cardId) {
    const card = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!card) return;

    const state = gameState[cardId];
    const hpValue = card.querySelector('.hp-value');
    const maxHpValue = card.querySelector('.max-hp-value');
    const hpBar = card.querySelector('.hp-bar');

    if (hpValue) {
        hpValue.textContent = Math.max(0, Math.round(state.hp));
    }

    if (maxHpValue) {
        maxHpValue.textContent = Math.round(state.maxHp);
    }

    if (hpBar) {
        const percentage = (state.hp / state.maxHp) * 100;
        hpBar.style.width = `${percentage}%`;
        hpBar.setAttribute('aria-valuenow', state.hp);
        hpBar.setAttribute('aria-valuemax', state.maxHp);

        // Change color based on HP level
        if (percentage > 60) {
            hpBar.className = 'progress-bar bg-success hp-bar';
        } else if (percentage > 30) {
            hpBar.className = 'progress-bar bg-warning hp-bar';
        } else {
            hpBar.className = 'progress-bar bg-danger hp-bar';
        }
    }

    // Check if card is defeated
    if (state.hp <= 0) {
        card.style.opacity = '0.5';
        const buttons = card.querySelectorAll('.attack-btn');
        buttons.forEach(btn => btn.disabled = true);
    } else {
        // Restore opacity if card is not defeated
        card.style.opacity = '1';
    }

    // If player dies, disable all attack buttons
    if (cardId === 'player' && state.hp <= 0) {
        const allAttackButtons = document.querySelectorAll('.attack-btn');
        allAttackButtons.forEach(btn => btn.disabled = true);
    }
}

// Enemy attacks player
function enemyAttackPlayer(attackerId) {
    const player = gameState.player;
    if (!player || player.hp <= 0) return;

    // Get enemy type and use appropriate damage values
    const enemy = gameState[attackerId];
    const isSwordPunk = enemy && enemy.type === 'sword';
    const damageRange = isSwordPunk ? swordPunkAttackDamage : enemyAttackDamage;

    let rawDamage = Math.floor(Math.random() * (damageRange.max - damageRange.min + 1)) + damageRange.min;

    // Factor in player defense (reduce damage, minimum 1 damage)
    const damage = Math.max(1, rawDamage - player.defense);
    const defenseReduction = rawDamage - damage;

    player.hp = Math.max(0, player.hp - damage);

    // Improve defense based on damage taken (learn from getting hit)
    if (damage > 0) {
        improveStat('defense', SKILL_IMPROVEMENT.defense * damage, 'taking damage');
    }

    // Visual feedback - flash the player card
    const playerCard = document.querySelector('[data-card-id="player"]');
    if (playerCard) {
        playerCard.style.transition = 'all 0.2s';
        playerCard.style.transform = 'scale(0.95)';
        playerCard.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            playerCard.style.transform = 'scale(1)';
            playerCard.style.filter = 'brightness(1)';
        }, 200);
    }

    updateCardHP('player');

    // Get enemy name
    const enemyCard = document.querySelector(`[data-card-id="${attackerId}"]`);
    const enemyName = enemyCard ? enemyCard.querySelector('.card-title').textContent : attackerId;

    if (defenseReduction > 0) {
        addMessage(`${enemyName} attacks! ${Math.round(rawDamage)} damage, ${Math.round(defenseReduction)} blocked by defense. You take ${Math.round(damage)} damage! (HP: ${Math.round(player.hp)}/${Math.round(player.maxHp)})`, 'danger');
    } else {
        addMessage(`${enemyName} attacks! You take ${Math.round(damage)} damage! (HP: ${player.hp}/${player.maxHp})`, 'danger');
    }

    // Check if player is defeated
    if (player.hp <= 0) {
        checkPlayerDefeat();
    }

    saveGameState();
}

// Perform attack
function performAttack(attackType, targetId) {
    // Check if player is dead - if so, no attacks allowed
    if (gameState.player.hp <= 0) {
        addMessage('You cannot attack - you are defeated!', 'warning');
        return;
    }

    const target = gameState[targetId];
    if (!target || target.hp <= 0) {
        addMessage('Target is already defeated!', 'warning');
        return;
    }

    const damage = calculateDamage(attackType);
    const previousHp = target.hp;
    target.hp = Math.max(0, target.hp - damage);

    // Improve stats based on action
    if (attackType === 'melee') {
        improveStat('strength', SKILL_IMPROVEMENT.melee, 'melee attack');
    } else if (attackType === 'ranged') {
        improveStat('ranged', SKILL_IMPROVEMENT.ranged, 'ranged attack');
    }

    // Visual feedback - flash the card
    const card = document.querySelector(`[data-card-id="${targetId}"]`);
    if (card) {
        card.style.transition = 'all 0.2s';
        card.style.transform = 'scale(0.95)';
        card.style.filter = 'brightness(1.5)';
        setTimeout(() => {
            card.style.transform = 'scale(1)';
            card.style.filter = 'brightness(1)';
        }, 200);
    }

    updateCardHP(targetId);

    // Get target name
    const targetCard = document.querySelector(`[data-card-id="${targetId}"]`);
    const targetName = targetCard ? targetCard.querySelector('.card-title').textContent : targetId;
    const attackTypeDisplay = attackType.charAt(0).toUpperCase() + attackType.slice(1);

    addMessage(`${attackTypeDisplay} attack on ${targetName}! ${Math.round(damage)} damage dealt! (${targetName} HP: ${Math.round(target.hp)}/${Math.round(target.maxHp)})`, 'success');

    // Check if enemy is defeated
    if (target.hp <= 0 && targetId.startsWith('enemy')) {
        setTimeout(() => {
            addMessage(`${targetName} has been defeated!`, 'success');
            // Fade out and remove the defeated enemy card
            fadeOutAndRemoveEnemy(targetId);
            // Check if all enemies are defeated
            if (checkBattleVictory()) {
                setTimeout(() => {
                    handleVictory();
                }, FADE_OUT_DURATION * 2);
            } else {
                // Update location cards visibility after each enemy defeat (but not on victory)
                updateLocationCardsVisibility();
            }
        }, 300);
    }

    // Enemy counterattack if they're still alive
    if (target.hp > 0 && targetId.startsWith('enemy')) {
        setTimeout(() => {
            enemyAttackPlayer(targetId);
        }, 400); // Small delay for better UX
    }

    saveGameState();
}

// Check if all enemies are defeated (victory condition)
// Returns true if all enemies are defeated, false otherwise
function checkBattleVictory() {
    // Check all enemies in gameState dynamically (works with random encounters)
    for (const key in gameState) {
        if (key.startsWith('enemy') && gameState[key].hp > 0) {
            return false;
        }
    }
    return true;
}

// Handle victory - disable buttons and show location cards
function handleVictory() {
    addMessage('VICTORY! All enemies defeated!', 'success');

    if (currentBattleEnemyCount > 0) {
        // Calculate club punk count (non-sword enemies drop bats)
        const clubPunkCount = currentBattleEnemyCount - currentBattleSwordPunkCount;

        // Give bats from club punks
        if (clubPunkCount > 0) {
            playerInventory.bat = (playerInventory.bat || 0) + clubPunkCount;
            const plural = clubPunkCount === 1 ? '' : 's';
            addMessage(`You recover ${clubPunkCount} bat${plural} from the defeated cyber punks.`, 'success');
        }

        // Give swords from sword punks
        if (currentBattleSwordPunkCount > 0) {
            playerInventory.sword = (playerInventory.sword || 0) + currentBattleSwordPunkCount;
            const plural = currentBattleSwordPunkCount === 1 ? '' : 's';
            addMessage(`You recover ${currentBattleSwordPunkCount} sword${plural} from the defeated sword punks.`, 'success');
        }

        updateInventoryUI();
        currentBattleEnemyCount = 0;
        currentBattleSwordPunkCount = 0;
    }

    // Disable all attack buttons
    const allAttackButtons = document.querySelectorAll('.attack-btn');
    allAttackButtons.forEach(btn => btn.disabled = true);

    // Disable flee button
    const fleeBtn = document.getElementById('flee-btn');
    if (fleeBtn) {
        fleeBtn.disabled = true;
    }

    // Wait for the last enemy card to finish fading out, then show location cards
    // (enemies are removed individually, so we wait for the fade-out duration)
    setTimeout(() => {
        // Update flee button visibility (hide it since battle is over)
        updateFleeButtonVisibility();

        if (pendingDestination) {
            const destination = pendingDestination;
            pendingDestination = null;

            if (destination === 'streets') {
                // Arrive at streets after victory
                currentZone = 'streets';
                currentStreet = 'streets';
                updateAreaNameDisplay();
                changeBackground('img/cyber-city-street.jpeg');
                createLocationCard('hospital', 'Hospital', 'img/cyber-city-hospital-street.jpeg');
                createLocationCard('cyber-market', 'Cyber Market', 'img/cyber-market.jpeg');
                createLocationCard('bus-stop', 'Bus Stop', 'img/cyber-bus-stop.jpeg');
                updateLocationCardsVisibility();
                updateCyberBatCard(); // Update info card visibility
                addMessage('You arrive at the streets after the battle.', 'info');
            } else {
                // Arrive at the destination location
                arriveAtLocation(destination);
            }
        } else if (currentZone === 'battle') {
            // Fallback: if no destination, return to streets
            currentZone = 'streets';
            currentStreet = 'streets';
            updateAreaNameDisplay();
            changeBackground('img/cyber-city-street.jpeg');
            createLocationCard('hospital', 'Hospital', 'img/cyber-city-hospital-street.jpeg');
            createLocationCard('cyber-market', 'Cyber Market', 'img/cyber-market.jpeg');
            createLocationCard('bus-stop', 'Bus Stop', 'img/cyber-bus-stop.jpeg');
            updateLocationCardsVisibility();
            updateCyberBatCard(); // Update info card visibility
            addMessage('You arrive at the streets after the battle.', 'info');
        } else {
            showLocationCards();
        }
        saveGameState();
    }, FADE_OUT_DURATION);
}

// Fade to black
function fadeToBlack(callback) {
    const battleBackground = document.getElementById('battle-background');
    if (!battleBackground) {
        if (callback) callback();
        return;
    }

    // Add blackout class to fade to black
    battleBackground.classList.add('blackout');

    // Wait for fade to complete, then call callback
    setTimeout(() => {
        if (callback) callback();
    }, 1000); // Match CSS transition duration
}

// Fade from black
function fadeFromBlack() {
    const battleBackground = document.getElementById('battle-background');
    if (!battleBackground) return;

    // Remove blackout class to fade from black
    battleBackground.classList.remove('blackout');
}

// Check if player is defeated (defeat condition)
function checkPlayerDefeat() {
    if (gameState.player.hp <= 0) {
        setTimeout(() => {
            addMessage('DEFEAT! You have been defeated...', 'danger');

            // Disable all attack buttons immediately
            const allAttackButtons = document.querySelectorAll('.attack-btn');
            allAttackButtons.forEach(btn => btn.disabled = true);

            // Disable flee button
            const fleeBtn = document.getElementById('flee-btn');
            if (fleeBtn) {
                fleeBtn.disabled = true;
            }

            // Update flee button visibility (hide it since battle is over)
            updateFleeButtonVisibility();

            // Cyber punks steal player's bats and money when defeated (before fade to black)
            const player = gameState.player;
            const lostBats = playerInventory.bat || 0;
            const lostSwords = playerInventory.sword || 0;
            const lostStimPacks = playerInventory.stimPack || 0;
            const stolenCredits = player.credits > 0 ? player.credits : 0; // Only steal positive credits, keep debt

            // Store stolen items message to show after fade from black
            let stolenMessage = null;
            const stolenItems = [];
            if (lostBats > 0) {
                stolenItems.push(`${lostBats} bat${lostBats > 1 ? 's' : ''}`);
            }
            if (lostSwords > 0) {
                stolenItems.push(`${lostSwords} sword${lostSwords > 1 ? 's' : ''}`);
            }
            if (lostStimPacks > 0) {
                stolenItems.push(`${lostStimPacks} stim pack${lostStimPacks > 1 ? 's' : ''}`);
            }
            if (stolenCredits > 0) {
                stolenItems.push(`${Math.round(stolenCredits)} credits`);
            }

            if (stolenItems.length > 0) {
                stolenMessage = `The cyber punks stole your ${stolenItems.join(', ')}.`;
            }

            // Steal the money (set credits to 0 if positive, keep debt if negative)
            if (stolenCredits > 0) {
                player.credits = 0;
                updateCreditsDisplay();
            }

            // Fade to black
            fadeToBlack(() => {
                // Clear all enemies after fade to black
                const container = document.getElementById('enemy-cards-container');
                if (container) {
                    container.innerHTML = '';
                }

                // Remove enemies from game state
                for (const key in gameState) {
                    if (key.startsWith('enemy')) {
                        delete gameState[key];
                    }
                }

                // Clear all inventory
                playerInventory.bat = 0;
                playerInventory.sword = 0;
                playerInventory.stimPack = 0;

                // Unequip all weapons
                equippedWeapons.bat = false;
                equippedWeapons.sword = false;

                // Update inventory UI (this will hide the Cyber Bat card and inventory items)
                updateInventoryUI();

                // Reset player card opacity
                const playerCard = document.querySelector('[data-card-id="player"]');
                if (playerCard) {
                    playerCard.style.opacity = '1';
                }

                // Change background to hospital (while blacked out)
                const battleBackground = document.getElementById('battle-background');
                if (battleBackground) {
                    battleBackground.style.backgroundImage = 'url(\'img/cyber-city-hospital-street.jpeg\')';
                }

                // Bring player to hospital
                currentZone = 'hospital';
                currentStreet = null; // Not on a street location
                updateAreaNameDisplay();
                previousLocation = null;
                pendingDestination = null;

                // Create hospital location cards (will be shown after fade from black)
                createDoctorCard();
                createStreetsCard();
                // Hide location cards during blackout
                updateLocationCardsVisibility();
                const locationCards = document.querySelectorAll('.location-card');
                locationCards.forEach(card => {
                    card.style.opacity = '0';
                });

                // Wait a few seconds in black, then fade from black
                setTimeout(() => {
                    fadeFromBlack();

                    // Show location cards after fade from black completes
                    setTimeout(() => {
                        // Restore location cards visibility
                        updateLocationCardsVisibility();
                        locationCards.forEach(card => {
                            card.style.opacity = '';
                        });

                        addMessage('You wake up in the hospital. Your health has been restored.', 'success');
                        // Automatically heal and add to debt (charge for revival healing)
                        const player = gameState.player;
                        const healCost = CONFIG.PRICES.healCost;
                        player.credits -= healCost;

                        // Calculate HP restored (from 0 to maxHp)
                        const hpRestored = player.maxHp;

                        // Track total HP healed for progressive max HP increases (need to heal current maxHp to level, but only gain 1 HP)
                        player.totalHpHealed = (player.totalHpHealed || 0) + hpRestored;
                        player.nextLevelThreshold = player.nextLevelThreshold || player.maxHp;

                        // Check if we've healed enough to level up
                        while (player.totalHpHealed >= player.nextLevelThreshold) {
                            const oldMaxHp = player.maxHp;
                            player.maxHp += 1; // Only increase by 1 HP per level
                            player.hp = player.maxHp; // Increase current HP to match new max HP
                            player.totalHpHealed -= player.nextLevelThreshold; // Subtract the threshold
                            player.nextLevelThreshold = player.maxHp; // Next level requires healing the new max HP

                            // Log max HP increase
                            addMessage(`Your maximum HP increased by 1! (${Math.round(oldMaxHp)} â†’ ${Math.round(player.maxHp)})`, 'success');
                        }

                        // If no level up, just restore HP
                        if (player.hp < player.maxHp) {
                            player.hp = player.maxHp;
                        }

                        updateCardHP('player');
                        updateCreditsDisplay();
                        const debt = Math.abs(player.credits);
                        addMessage(`The hospital revives you and restores your health. You now owe ${debt} credits to the hospital.`, 'info');

                        // Doctor says the same thing as opening
                        setTimeout(() => {
                            addMessage('Doctor: "So do us both a favorâ€¦ try not to die before you can settle the tab."', 'info');
                        }, 500);

                        // Show stolen items message if anything was stolen
                        if (stolenMessage) {
                            setTimeout(() => {
                                addMessage(stolenMessage, 'warning');
                            }, 300);
                        }

                        // Doctor talks to the player after revival
                        setTimeout(() => {
                            doctorTalksToPlayer();
                        }, 800);

                        saveGameState();
                    }, 1000); // Wait for fade from black transition to complete
                }, 2000); // Wait 2 seconds in black before fading back
            });
        }, 300);
    }
}

// Change background image with fade effect
function changeBackground(newImageUrl) {
    const battleBackground = document.getElementById('battle-background');
    if (!battleBackground) return;

    // Set the new background on the ::before pseudo-element via CSS variable
    battleBackground.style.setProperty('--new-background', `url('${newImageUrl}')`);
    battleBackground.classList.add('fading');

    // Wait for fade to complete, then update actual background
    setTimeout(() => {
        battleBackground.style.backgroundImage = `url('${newImageUrl}')`;
        battleBackground.style.setProperty('--new-background', 'none');
        battleBackground.classList.remove('fading');
    }, 1000); // Match CSS transition duration
}

// Create doctor card
function createDoctorCard() {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;

    // Check if doctor card already exists
    const existing = container.querySelector('[data-location-id="doctor"]');
    if (existing) return existing;

    const wrapper = document.createElement('div');
    wrapper.className = 'enemy-card-wrapper location-card';
    wrapper.setAttribute('data-location-id', 'doctor');

    wrapper.innerHTML = `
        <div class="card bg-dark text-white border-dark" data-card-id="doctor">
            <img src="img/cyber-doctor.jpeg" class="card-img-top" alt="Cyber Doctor">
            <div class="card-body">
                <h5 class="card-title">Cyber Doctor</h5>
            </div>
            <div class="list-group list-group-flush">
                <button class="btn btn-primary w-100 rounded-0 mb-3 heal-btn" data-location-id="doctor">Heal (${CONFIG.PRICES.healCost} credits)</button>
            </div>
        </div>
    `;

    // Initially hidden, will fade in
    wrapper.style.display = 'flex';
    container.appendChild(wrapper);

    // Fade in the doctor card after DOM update
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            wrapper.classList.add('show');
        });
    });

    return wrapper;
}

// Create Cyber Merchant card
function createCyberMerchantCard() {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;

    // Check if merchant card already exists
    const existing = container.querySelector('[data-location-id="cyber-merchant"]');
    if (existing) return existing;

    const wrapper = document.createElement('div');
    wrapper.className = 'enemy-card-wrapper location-card';
    wrapper.setAttribute('data-location-id', 'cyber-merchant');

    wrapper.innerHTML = `
        <div class="card bg-dark text-white border-dark" data-card-id="cyber-merchant">
            <img src="img/cyber-merchant.jpeg" class="card-img-top" alt="Cyber Merchant">
            <div class="card-body">
                <h5 class="card-title">Cyber Merchant</h5>
            </div>
            <div class="list-group list-group-flush">
                <button class="btn btn-primary w-100 rounded-0 mb-3 talk-merchant-btn" data-location-id="cyber-merchant" id="merchant-talk-btn">Talk</button>
                <button class="btn btn-primary w-100 rounded-0 mb-3 sell-bat-btn" data-location-id="cyber-merchant" id="merchant-sell-bat-btn">Sell Bat (${CONFIG.PRICES.sellBat})</button>
                <button class="btn btn-primary w-100 rounded-0 mb-3 sell-sword-btn" data-location-id="cyber-merchant" id="merchant-sell-sword-btn">Sell Sword (${CONFIG.PRICES.sellSword})</button>
                <button class="btn btn-primary w-100 rounded-0 mb-3 buy-bat-btn" data-location-id="cyber-merchant" id="merchant-buy-bat-btn">Buy Bat (${CONFIG.PRICES.buyBat}) <span class="merchant-count" id="merchant-bat-count">10</span></button>
                <button class="btn btn-primary w-100 rounded-0 mb-3 buy-sword-btn" data-location-id="cyber-merchant" id="merchant-buy-sword-btn">Buy Sword (${CONFIG.PRICES.buySword}) <span class="merchant-count" id="merchant-sword-count">0</span></button>
                <button class="btn btn-primary w-100 rounded-0 mb-3 buy-stim-pack-btn" data-location-id="cyber-merchant" id="merchant-buy-stim-pack-btn">Buy Stim Pack (${CONFIG.PRICES.buyStimPack}) <span class="merchant-count" id="merchant-stim-pack-count">10</span></button>
            </div>
        </div>
    `;

    // Initially hidden, will fade in
    wrapper.style.display = 'flex';
    container.appendChild(wrapper);

    // Fade in the merchant card after DOM update
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            wrapper.classList.add('show');
            updateMerchantUI();
        });
    });

    return wrapper;
}

// Create "The Streets" card
function createStreetsCard() {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;
    const existing = container.querySelector('[data-location-id="streets"]');
    if (existing) {
        existing.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'enemy-card-wrapper location-card';
    wrapper.setAttribute('data-location-id', 'streets');

    wrapper.innerHTML = `
        <div class="card bg-dark text-white border-dark" data-card-id="streets">
            <img src="img/cyber-city-street.jpeg" class="card-img-top" alt="Grove Street">
            <div class="card-body">
                <h5 class="card-title">Grove Street</h5>
            </div>
            <div class="list-group list-group-flush">
                <button class="btn btn-primary w-100 rounded-0 mb-3 location-go-btn" data-location-id="streets">Go</button>
            </div>
        </div>
    `;

    // Initially hidden, will fade in
    wrapper.style.display = 'flex';
    container.appendChild(wrapper);

    // Fade in the streets card after DOM update
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            wrapper.classList.add('show');
        });
    });

    return wrapper;
}

// Handle healing at the hospital (adds to debt)
function healAtHospital() {
    const player = gameState.player;
    const hpRestored = player.maxHp - player.hp;

    if (hpRestored <= 0) {
        addMessage('You are already at full health!', 'info');
        return;
    }

    const healCost = CONFIG.PRICES.healCost;

    // Do the healing first
    player.hp = player.maxHp;

    // Track total HP healed for progressive max HP increases (need to heal current maxHp to level, but only gain 1 HP)
    player.totalHpHealed = (player.totalHpHealed || 0) + hpRestored;
    player.nextLevelThreshold = player.nextLevelThreshold || player.maxHp;

    // Check if we've healed enough to level up
    while (player.totalHpHealed >= player.nextLevelThreshold) {
        const oldMaxHp = player.maxHp;
        player.maxHp += 1; // Only increase by 1 HP per level
        player.hp = player.maxHp; // Increase current HP to match new max HP
        player.totalHpHealed -= player.nextLevelThreshold; // Subtract the threshold
        player.nextLevelThreshold = player.maxHp; // Next level requires healing the new max HP

        // Log max HP increase
        addMessage(`Your maximum HP increased by 1! (${Math.round(oldMaxHp)} â†’ ${Math.round(player.maxHp)})`, 'success');
    }

    // Charge 10 credits per heal
    player.credits -= healCost;
    updateCardHP('player');
    updateCreditsDisplay();

    // Show healing message
    addMessage(`The doctor heals you, restoring ${Math.round(hpRestored)} HP.`, 'success');

    // Then add the bill log message immediately after
    const debt = Math.abs(player.credits);
    addMessage(`Hospital bill: ${debt} credits owed.`, 'info');
    saveGameState();
}

// Doctor talks to the player
function doctorTalksToPlayer(isOpening = false) {
    if (isOpening) {
        addMessage('Doctor: "So do us both a favorâ€¦ try not to die before you can settle the tab."', 'info');
    } else {
        const player = gameState.player;
        const debt = Math.abs(player.credits);
        const messages = [
            "Welcome to the hospital. I'll heal you automatically when you arrive injured.",
            "Stay safe out there in the streets. Come back if you need healing.",
            "I'll restore your health whenever you need it. The cost will be added to your hospital debt.",
            "The city can be dangerous. Make sure to keep your health up.",
            "If you get injured, remember to come back here for treatment.",
            debt > 0 ? `Don't forget you owe ${debt} credits to the hospital.` : "You're all paid up with the hospital."
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        addMessage(`Doctor: "${randomMessage}"`, 'info');
    }
}

// Handle selling bat at the cyber market
function sellBat() {
    const player = gameState.player;
    const batPrice = CONFIG.PRICES.sellBat;

    if (!playerInventory.bat || playerInventory.bat <= 0) {
        addMessage('You don\'t have any bats to sell!', 'warning');
        return;
    }

    // Remove one bat from player inventory
    playerInventory.bat -= 1;

    // If the bat is equipped and we now have 0, unequip it
    if (isWeaponEquipped('bat') && playerInventory.bat <= 0) {
        equippedWeapons.bat = false;
        addMessage('You unequipped the bat.', 'info');
    }

    // Add bat to merchant inventory
    merchantInventory.bat = (merchantInventory.bat || 0) + 1;

    // Add credits
    player.credits += batPrice;

    // Show Cyber Bat card when selling (visual feedback)
    // This will update the card to show the bat if equipped
    updateCyberBatCard();

    // Update UI
    updateInventoryUI();
    updateCreditsDisplay();
    updateMerchantUI();

    addMessage(`You sold a bat for ${batPrice} credits! (Credits: ${player.credits})`, 'success');
    saveGameState();
}

// Sell sword to merchant
function sellSwordToMerchant() {
    const player = gameState.player;
    const swordPrice = CONFIG.PRICES.sellSword;

    if (!playerInventory.sword || playerInventory.sword <= 0) {
        addMessage('You don\'t have any swords to sell!', 'warning');
        return;
    }

    // Remove one sword from player inventory
    playerInventory.sword -= 1;

    // If the sword is equipped and we now have 0, unequip it
    if (isWeaponEquipped('sword') && playerInventory.sword <= 0) {
        equippedWeapons.sword = false;
        addMessage('You unequipped the sword.', 'info');
    }

    // Add sword to merchant inventory
    merchantInventory.sword = (merchantInventory.sword || 0) + 1;

    // Add credits
    player.credits += swordPrice;

    // Show weapon card when selling (visual feedback)
    updateCyberBatCard();

    // Update UI
    updateInventoryUI();
    updateCreditsDisplay();
    updateMerchantUI();

    addMessage(`You sold a sword for ${swordPrice} credits! (Credits: ${player.credits})`, 'success');
    saveGameState();
}

// Update credits display (shows debt when negative)
function updateCreditsDisplay() {
    const creditsElement = document.querySelector('.credits');
    if (creditsElement) {
        const credits = gameState.player.credits;
        const symbol = ' Â¥';
        if (credits < 0) {
            creditsElement.textContent = Math.round(credits) + ' (Owed: ' + Math.abs(Math.round(credits)) + ')' + symbol;
        } else {
            creditsElement.textContent = Math.round(credits) + symbol;
        }
    }
    saveGameState();
}

// Update merchant UI to show inventory counts
function updateMerchantUI() {
    const batCountElement = document.getElementById('merchant-bat-count');
    const swordCountElement = document.getElementById('merchant-sword-count');
    const stimPackCountElement = document.getElementById('merchant-stim-pack-count');
    const buyBatBtn = document.getElementById('merchant-buy-bat-btn');
    const buySwordBtn = document.getElementById('merchant-buy-sword-btn');
    const buyStimPackBtn = document.getElementById('merchant-buy-stim-pack-btn');
    const sellBatBtn = document.getElementById('merchant-sell-bat-btn');

    // Update merchant inventory counts immediately
    if (batCountElement) {
        const count = merchantInventory.bat ?? 0;
        batCountElement.textContent = count;
    }
    if (swordCountElement) {
        const count = merchantInventory.sword ?? 0;
        swordCountElement.textContent = count;
    }
    if (stimPackCountElement) {
        const count = merchantInventory.stimPack ?? 0;
        stimPackCountElement.textContent = count;
    }

    // Hide/show sell bat button based on player inventory and update count
    if (sellBatBtn) {
        const playerBatCount = playerInventory.bat ?? 0;
        if (playerBatCount <= 0) {
            sellBatBtn.style.display = 'none';
        } else {
            sellBatBtn.style.display = 'block';
            // Update button text to show available bats
            sellBatBtn.textContent = `Sell Bat (${CONFIG.PRICES.sellBat}) ${playerBatCount}`;
        }
    }

    // Hide/show sell sword button based on player inventory and update count
    const sellSwordBtn = document.getElementById('merchant-sell-sword-btn');
    if (sellSwordBtn) {
        const playerSwordCount = playerInventory.sword ?? 0;
        if (playerSwordCount <= 0) {
            sellSwordBtn.style.display = 'none';
        } else {
            sellSwordBtn.style.display = 'block';
            // Update button text to show available swords
            sellSwordBtn.textContent = `Sell Sword (${CONFIG.PRICES.sellSword}) ${playerSwordCount}`;
        }
    }

    // Hide/show buy buttons based on merchant inventory
    if (buyBatBtn) {
        const merchantBatCount = merchantInventory.bat ?? 0;
        if (merchantBatCount <= 0) {
            buyBatBtn.style.display = 'none';
        } else {
            buyBatBtn.style.display = 'block';
            buyBatBtn.disabled = false;
            buyBatBtn.style.opacity = '1';
            buyBatBtn.style.cursor = 'pointer';
        }
    }
    if (buySwordBtn) {
        const merchantSwordCount = merchantInventory.sword ?? 0;
        if (merchantSwordCount <= 0) {
            buySwordBtn.style.display = 'none';
        } else {
            buySwordBtn.style.display = 'block';
            buySwordBtn.disabled = false;
            buySwordBtn.style.opacity = '1';
            buySwordBtn.style.cursor = 'pointer';
        }
    }
    if (buyStimPackBtn) {
        const merchantStimPackCount = merchantInventory.stimPack ?? 0;
        if (merchantStimPackCount <= 0) {
            buyStimPackBtn.style.display = 'none';
        } else {
            buyStimPackBtn.style.display = 'block';
            buyStimPackBtn.disabled = false;
            buyStimPackBtn.style.opacity = '1';
            buyStimPackBtn.style.cursor = 'pointer';
        }
    }
}

// Handle buying bat at the cyber market
function buyBat() {
    const player = gameState.player;
    const batPrice = CONFIG.PRICES.buyBat;

    if (player.credits < batPrice) {
        addMessage(`You don't have enough credits! Need ${batPrice} credits, but you only have ${Math.round(player.credits)}.`, 'warning');
        return;
    }

    if (!merchantInventory.bat || merchantInventory.bat <= 0) {
        addMessage('The merchant is out of bats!', 'warning');
        return;
    }

    // Deduct credits
    player.credits -= batPrice;

    // Remove bat from merchant inventory
    merchantInventory.bat -= 1;

    // Add bat to player inventory
    playerInventory.bat = (playerInventory.bat || 0) + 1;

    // Update UI
    updateInventoryUI();
    updateCreditsDisplay();
    updateMerchantUI();

    addMessage(`You bought a bat for ${batPrice} credits! (Credits: ${Math.round(player.credits)})`, 'success');
    saveGameState();
}

// Handle talking to merchant
function talkToMerchant() {
    // Check if merchant is out of bats
    if (merchantInventory.bat <= 0) {
        addMessage(`Merchant: "I'm in the market for Cyber Bats. If you ever get any I'll pay ${CONFIG.PRICES.sellBat} credits per bat."`, 'info');
        return;
    }

    const messages = [
        "Welcome to my shop! I deal in the finest cyber goods.",
        "Looking for weapons? I've got your bat.",
        "Need some healing? Try my stim packs!",
        "Business is good these days. Lots of travelers.",
        "Remember, you can always sell items back to me for credits.",
        "Stay safe out there in the streets, friend."
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    addMessage(`Merchant: "${randomMessage}"`, 'info');
}

// Handle buying sword at the cyber market
function buySword() {
    const player = gameState.player;
    const swordPrice = CONFIG.PRICES.buySword;

    if (player.credits < swordPrice) {
        addMessage(`You don't have enough credits! Need ${swordPrice} credits, but you only have ${Math.round(player.credits)}.`, 'warning');
        return;
    }

    if (!merchantInventory.sword || merchantInventory.sword <= 0) {
        addMessage('The merchant is out of swords!', 'warning');
        return;
    }

    // Deduct credits
    player.credits -= swordPrice;

    // Remove sword from merchant inventory
    merchantInventory.sword -= 1;

    // Add sword to player inventory
    playerInventory.sword = (playerInventory.sword || 0) + 1;

    // Update UI
    updateInventoryUI();
    updateCreditsDisplay();
    updateMerchantUI();

    addMessage(`You bought a sword for ${swordPrice} credits! (Credits: ${Math.round(player.credits)})`, 'success');
    saveGameState();
}

// Handle buying stim pack at the cyber market
function buyStimPack() {
    const player = gameState.player;
    const stimPackPrice = CONFIG.PRICES.buyStimPack;

    if (player.credits < stimPackPrice) {
        addMessage(`You don't have enough credits! Need ${stimPackPrice} credits, but you only have ${Math.round(player.credits)}.`, 'warning');
        return;
    }

    if (!merchantInventory.stimPack || merchantInventory.stimPack <= 0) {
        addMessage('The merchant is out of stim packs!', 'warning');
        return;
    }

    // Deduct credits
    player.credits -= stimPackPrice;

    // Remove stim pack from merchant inventory
    merchantInventory.stimPack -= 1;

    // Add stim pack to player inventory
    playerInventory.stimPack = (playerInventory.stimPack || 0) + 1;

    // Update UI
    updateInventoryUI();
    updateCreditsDisplay();
    updateMerchantUI();

    addMessage(`You bought a stim pack for ${stimPackPrice} credits! (Credits: ${Math.round(player.credits)})`, 'success');
    saveGameState();
}

// Handle using stim pack
function useStimPack() {
    const player = gameState.player;

    if (!playerInventory.stimPack || playerInventory.stimPack <= 0) {
        addMessage('You don\'t have any stim packs!', 'warning');
        return;
    }

    if (player.hp >= player.maxHp) {
        addMessage('You are already at full health!', 'info');
        return;
    }

    // Use one stim pack
    playerInventory.stimPack -= 1;

    // Restore HP to full (full heal)
    const healAmount = player.maxHp - player.hp;
    player.hp = player.maxHp; // Full heal to max HP

    // Track total HP healed for progressive max HP increases (same as hospital healing)
    player.totalHpHealed = (player.totalHpHealed || 0) + healAmount;
    player.nextLevelThreshold = player.nextLevelThreshold || player.maxHp;

    // Check if we've healed enough to level up
    while (player.totalHpHealed >= player.nextLevelThreshold) {
        const oldMaxHp = player.maxHp;
        player.maxHp += 1; // Only increase by 1 HP per level
        player.hp = player.maxHp; // Increase current HP to match new max HP
        player.totalHpHealed -= player.nextLevelThreshold; // Subtract the threshold
        player.nextLevelThreshold = player.maxHp; // Next level requires healing the new max HP

        // Log max HP increase
        addMessage(`Your maximum HP increased by 1! (${Math.round(oldMaxHp)} â†’ ${Math.round(player.maxHp)})`, 'success');
    }

    // Update UI
    updateInventoryUI();
    updateCardHP('player');

    addMessage(`You used a stim pack and restored ${Math.round(healAmount)} HP! (Full heal: ${Math.round(player.hp)}/${Math.round(player.maxHp)})`, 'success');
    saveGameState();
}

// Spawn a specific number of enemies (for random encounters)
function spawnRandomEnemies(count) {
    const container = document.getElementById('enemy-cards-container');
    if (!container) return;

    // Determine enemy type based on current street or destination (sword punks only in downtown)
    // Check pendingDestination first (when traveling to a location), then currentStreet
    const streetBeforeBattle = pendingDestination === 'main-street' ? 'main-street' : currentStreet;
    const enemyType = streetBeforeBattle === 'main-street' ? 'sword' : 'club';
    const enemyHp = enemyType === 'sword' ? 120 : 100;

    // Clear container
    container.innerHTML = '';
    currentBattleEnemyCount = count;
    // Track sword punks separately for sword drops
    currentBattleSwordPunkCount = enemyType === 'sword' ? count : 0;
    currentZone = 'battle';
    currentStreet = null; // Not on a street location during battle
    updateAreaNameDisplay();
    updateCyberBatCard(); // Hide Cyber Doctor card when entering battle

    // Change background based on current street or destination
    if (streetBeforeBattle === 'main-street' || pendingDestination === 'main-street') {
        changeBackground('img/downtown.jpeg');
    } else if (pendingDestination === null || pendingDestination === 'streets') {
        changeBackground('img/cyber-city-street.jpeg');
    }

    // Initialize enemies in game state
    for (let i = 1; i <= count; i++) {
        const enemyId = `enemy${i}`;
        gameState[enemyId] = { hp: enemyHp, maxHp: enemyHp, type: enemyType };
    }

    // Create enemy cards
    for (let i = 1; i <= count; i++) {
        const enemyId = `enemy${i}`;
        createEnemyCard(enemyId, i, enemyType);
    }

    // Initialize HP displays
    for (let i = 1; i <= count; i++) {
        updateCardHP(`enemy${i}`);
    }

    // Update location cards visibility
    updateLocationCardsVisibility();

    // Update flee button visibility based on battle state
    updateFleeButtonVisibility();
    saveGameState();
}

// Visit location
function visitLocation(locationId) {
    if (locationId === 'streets') {
        const locationName = getLocationDisplayName(locationId);
        addMessage(`You head towards the ${locationName}...`, 'info');

        // Check for random encounter when going to streets
        const encountered = maybeTriggerEncounter(locationId);

        if (!encountered) {
            // No encounter, proceed to streets
            addMessage('You arrive at the streets...', 'info');
            currentZone = 'streets';
            currentStreet = 'streets';
            updateAreaNameDisplay();

            // Fade out doctor card, merchant card, and streets card
            const doctorCard = document.querySelector('[data-location-id="doctor"]');
            const merchantCard = document.querySelector('[data-location-id="cyber-merchant"]');
            const streetsCard = document.querySelector('[data-location-id="streets"]');

            // Collect cards to fade out
            const cardsToRemove = [];
            if (doctorCard) cardsToRemove.push(doctorCard);
            if (merchantCard) cardsToRemove.push(merchantCard);
            if (streetsCard) cardsToRemove.push(streetsCard);

            // Remove cards and then change background
            const goToStreets = () => {
                changeBackground('img/cyber-city-street.jpeg');
                createLocationCard('hospital', 'Hospital', 'img/cyber-city-hospital-street.jpeg');
                createLocationCard('cyber-market', 'Cyber Market', 'img/cyber-market.jpeg');
                createLocationCard('bus-stop', 'Bus Stop', 'img/cyber-bus-stop.jpeg');
                updateLocationCardsVisibility();
                updateCyberBatCard(); // Hide Cyber Doctor card when leaving hospital
            };

            if (cardsToRemove.length > 0) {
                cardsToRemove.forEach(card => {
                    fadeOutAndRemove(card);
                });

                // After fade-out completes, change background and show location cards
                setTimeout(() => {
                    goToStreets();
                }, FADE_OUT_DURATION);
            } else {
                // Cards already removed, just change background
                goToStreets();
            }
        }
        saveGameState();
        // If encounter happened, spawnRandomEnemies already handled it
        return;
    }

    // Bus stop travel is handled by bus-stop-travel-btn event listener

    // Bus stop travel charges are handled by bus-stop-travel-btn event listener
    // Free returns are handled by location-go-btn with data-is-free="true"

    // Set previousLocation before traveling (important for bus stop to know which street you came from)
    if (locationId === 'bus-stop') {
        // Store the current zone as previousLocation if it's a street location
        if (STREET_LOCATIONS.find(s => s.id === currentZone)) {
            previousLocation = currentZone;
        }
    } else {
        previousLocation = currentZone;
    }
    saveGameState();

    const locationName = getLocationDisplayName(locationId);
    addMessage(`You head towards the ${locationName}...`, 'info');

    const locationCard = document.querySelector(`[data-location-id="${locationId}"]`);

    const travel = () => {
        const encountered = maybeTriggerEncounter(locationId);
        if (!encountered) {
            arriveAtLocation(locationId);
        }
    };

    if (locationCard) {
        fadeOutAndRemove(locationCard, travel);
    } else {
        travel();
    }
}

// Flee function - ends the battle
function fleeBattle() {
    // Disable all attack buttons
    const allAttackButtons = document.querySelectorAll('.attack-btn');
    allAttackButtons.forEach(btn => btn.disabled = true);

    // Disable flee button
    const fleeBtn = document.getElementById('flee-btn');
    if (fleeBtn) {
        fleeBtn.disabled = true;
    }

    addMessage('You fled from battle!', 'warning');

    // Get the destination before clearing pendingDestination
    const destination = pendingDestination || 'hospital';

    // Clear current enemies
    const container = document.getElementById('enemy-cards-container');
    if (container) {
        container.innerHTML = '';
    }

    // Remove enemies from game state
    for (const key in gameState) {
        if (key.startsWith('enemy')) {
            delete gameState[key];
        }
    }

    // Update flee button visibility AFTER clearing enemies (hide it since battle is over)
    updateFleeButtonVisibility();

    // Reset pending destination
    pendingDestination = null;

    // Return to the previous location (where we came from) if it exists
    // Otherwise, fall back to destination or hospital
    const returnLocation = previousLocation || destination || 'hospital';

    // Always return to where we came from (previousLocation takes priority)
    arriveAtLocation(returnLocation);
    addMessage('You flee back to safety.', 'info');
    saveGameState();

    // Ensure flee button is hidden after arriving at location
    // Use a small delay to ensure arriveAtLocation has completed
    setTimeout(() => {
        updateFleeButtonVisibility();
    }, 100);

    previousLocation = null;
}

// Add event listeners to all attack buttons (using event delegation for dynamic content)
document.addEventListener('DOMContentLoaded', function () {
    // Load saved game state
    const stateLoaded = loadGameState();

    // Clear any previous messages
    clearMessages();

    // Initialize HP display to show 0 HP
    updateCardHP('player');

    // Story introduction (only if no saved state was loaded)
    if (!stateLoaded) {
        addMessage('You wake up in a hospital bed, your vision slowly coming into focus. The sterile smell of antiseptic fills the air.', 'info');

        setTimeout(() => {
            addMessage('A cyber-doctor approaches, their mechanical limbs whirring softly. They check your vitals and adjust some monitors.', 'info');
            healAtHospital();
            setTimeout(() => {
                addMessage('Doctor: "You\'re lucky to be alive. That was a nasty encounter out there."', 'info');

                setTimeout(() => {
                    addMessage(`You notice a medical bill on the table next to you. The balance shows -${CONFIG.PRICES.healCost} credits.`, 'warning');

                    setTimeout(() => {
                        // Spawn enemies (skip the default doctor dialogue since we're handling it)
                        spawnEnemies(true);
                        // Automatically heal the player
                        setTimeout(() => {
                            // Doctor says the opening line after healing
                            setTimeout(() => {
                                doctorTalksToPlayer(true);
                            }, 800);
                        }, 500);
                    }, 1500);
                }, 1500);
            }, 1500);
        }, 1500);
    } else {
        // State was loaded, restore UI to match saved state
        // Don't call spawnEnemies() as it resets the zone and creates duplicate cards
        updateAreaNameDisplay();
        updateCardHP('player');
        updateInventoryUI();
        updateCreditsDisplay();
        updatePlayerStats();
        updateCyberBatCard();

        // Restore location cards based on current zone
        createLocationCards(currentZone);
        updateLocationCardsVisibility();
    }

    // Initialize player stats display
    updatePlayerStats();
    updateInventoryUI();
    updateCreditsDisplay();
    updateCardHP('player'); // Initialize HP display to show 0 HP

    // Initialize info card (shows Cyber Doctor at game start)
    updateCyberBatCard();
    updateAreaNameDisplay();

    // Initialize HP displays for all enemies
    for (let i = 1; i <= NUM_ENEMIES; i++) {
        updateCardHP(`enemy${i}`);
    }

    // Use event delegation for attack buttons (works with dynamically created elements)
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('attack-btn')) {
            const attackType = event.target.getAttribute('data-attack-type');
            const targetId = event.target.getAttribute('data-target');

            performAttack(attackType, targetId);
        }

        // Handle location "Go" buttons
        if (event.target.classList.contains('location-go-btn')) {
            const locationId = event.target.getAttribute('data-location-id');
            const isFree = event.target.getAttribute('data-is-free') === 'true';
            // If it's free (Grove Street Bus Stop), go directly without charging
            if (isFree) {
                addMessage(`You walk back to ${getLocationDisplayName(locationId)}...`, 'info');
                previousLocation = currentZone;
                const locationCard = event.target.closest('[data-location-id]');
                const travel = () => {
                    const encountered = maybeTriggerEncounter(locationId);
                    if (!encountered) {
                        arriveAtLocation(locationId);
                    }
                };
                if (locationCard) {
                    fadeOutAndRemove(locationCard, travel);
                } else {
                    travel();
                }
            } else {
                visitLocation(locationId);
            }
        }

        // Handle bus stop travel buttons
        if (event.target.classList.contains('bus-stop-travel-btn')) {
            const streetId = event.target.getAttribute('data-street-id');
            const streetName = event.target.getAttribute('data-street-name');
            const player = gameState.player;
            const busFare = CONFIG.PRICES.busFare;

            if (player.credits < busFare) {
                const debt = Math.abs(player.credits);
                addMessage(`You need ${busFare} credits for the bus fare, but you only have ${Math.round(player.credits)} credits (owe ${debt}).`, 'warning');
                return;
            }

            // Charge the bus fare
            player.credits -= busFare;
            updateCreditsDisplay();
            addMessage(`You pay ${busFare} credits for the bus fare.`, 'info');

            // Travel to the street location
            addMessage(`You board the bus to ${streetName}...`, 'info');
            previousLocation = currentZone;

            // Find the card that was clicked (the bus stop destination card)
            const locationCard = event.target.closest('[data-location-id]');
            const travel = () => {
                const encountered = maybeTriggerEncounter(streetId);
                if (!encountered) {
                    arriveAtLocation(streetId);
                }
            };

            if (locationCard) {
                fadeOutAndRemove(locationCard, travel);
            } else {
                travel();
            }
        }

        // Handle "Heal" button (now automatic, but keep for compatibility)
        if (event.target.classList.contains('heal-btn')) {
            healAtHospital();
        }

        // Handle "Sell Bat" button
        if (event.target.classList.contains('sell-bat-btn')) {
            sellBat();
        }

        // Handle "Sell Sword" button
        if (event.target.classList.contains('sell-sword-btn')) {
            sellSwordToMerchant();
        }

        // Handle "Buy Bat" button
        if (event.target.classList.contains('buy-bat-btn')) {
            buyBat();
        }

        // Handle "Buy Sword" button
        if (event.target.classList.contains('buy-sword-btn')) {
            buySword();
        }

        // Handle "Buy Stim Pack" button
        if (event.target.classList.contains('buy-stim-pack-btn')) {
            buyStimPack();
        }

        // Handle "Talk" button on merchant
        if (event.target.classList.contains('talk-merchant-btn')) {
            talkToMerchant();
        }

        // Handle inventory equip toggles and item usage
        const inventoryItem = event.target.closest ? event.target.closest('.inventory-item') : null;
        if (inventoryItem) {
            const itemId = inventoryItem.getAttribute('data-item');

            // Handle stim pack usage
            if (itemId === 'stimPack') {
                useStimPack();
            } else {
                // Handle weapon equip toggles
                toggleWeaponEquip(itemId);
            }
        }
    });

    // Add event listener to flee button
    const fleeBtn = document.getElementById('flee-btn');
    if (fleeBtn) {
        fleeBtn.addEventListener('click', function () {
            fleeBattle();
        });
    }
});

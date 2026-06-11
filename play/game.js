(function () {
  const SLOT_COUNT = 12;
  const SLOT_CENTER_X = 50;
  const SLOT_CENTER_Y = 51;
  const SLOT_RING_RADIUS = 31.5;
  const MAX_OVERLOAD = 100;
  const OVERLOAD_BALANCE = {
    basePressure: 0.9,
    weightPressure: 0.44,
    occupiedSlotPressure: 0.18,
    trashPressure: 1.05,
    emptySlotRelief: 0.08,
    noTrashRelief: 0.15,
    foodRelief: 2.2,
    comboRelief: 4.5,
    premiumRelief: 6.5,
    crusherRelief: 9,
  };
  const REFRESH_COSTS = [1, 2, 3, 6, 10, 20, 40];
  const ASSET = "../newasset/";
  const SPRITES = {
    rice: `${ASSET}sushi_rice_32ca8538-70c7-46c0-9fc1-68d7e024a1a0.webp`,
    fish: `${ASSET}salmon_slice_238af822-be4a-44fc-a8ee-4cf5942b6f63.webp`,
    bone: `${ASSET}fish_bone_577ac624-8cea-4a59-96d5-b79c0ca70b74.webp`,
    crusher: `${ASSET}trash_crusher_01b0bd02-5a22-4a82-b85a-c219d7897254.webp`,
    wasabi: `${ASSET}wasabi_ba977015-66a8-4b6d-a9d4-1d81d82071f5.webp`,
    sushi: `${ASSET}salmon_sushi_984516f2-205e-4a0f-a0a8-c964119c2a9a.webp`,
    nori: "../assets/generated/nori_generated.png",
    onigiri: "../assets/generated/onigiri.png",
    salmonRoll: "../assets/generated/salmon_roll.png",
    plate: `${ASSET}empty_plate_b4bc111e-7407-489e-b26f-fc4d57964175.webp`,
    goldenPlate: "../assets/generated/golden_plate.png",
    smoke: `${ASSET}elimination_smoke_6b788849-65b4-44a5-927f-f48002a7c763.webp`,
    merge: `${ASSET}merge_effect_0cd01ceb-9705-483e-b0ee-5d79be781176.webp`,
    coin: `${ASSET}gold_coin_f75a03fe-f4b0-49e5-ad8c-a309fe82376e.webp`,
    warning: `${ASSET}overload_warning_icon_a4114af1-d62f-4b2b-b682-6ba81a83549b.webp`,
    consumerHappy: "../assets/generated/consumer-happy.png",
    consumerCombo: "../assets/generated/consumer-combo.png",
    consumerAngry: "../assets/generated/consumer-angry.png",
  };
  const RELIC_ASSET = "../assets/generated/relics/";
  const MASTER_VOLUME = 0.18;
  const MUSIC_VOLUME = 0.055;
  const TUTORIAL_STORAGE_KEY = "crazySushiActionTutorialSeen";
  const DESIGN_WIDTH = 1600;
  const DESIGN_HEIGHT = 1000;
  let audioContext = null;
  let musicTimer = null;
  let musicStarted = false;
  let musicStep = 0;

  const itemPool = [
    { id: "rice", name: "醋饭", tags: ["Raw"], score: 3, weight: 1, cost: 2, sprite: SPRITES.rice },
    { id: "fish", name: "鱼片", tags: ["Raw"], score: 4, weight: 1.2, cost: 2, sprite: SPRITES.fish },
    { id: "nori", name: "海苔", tags: ["Raw"], score: 2, weight: 0.6, cost: 1, sprite: SPRITES.nori },
    { id: "bone", name: "鱼刺", tags: ["Trash"], score: 0, weight: 2.5, cost: 1, sprite: SPRITES.bone },
    { id: "crusher", name: "厨余粉碎机", tags: ["Module"], score: 0, weight: 3, cost: 4, sprite: SPRITES.crusher },
    { id: "wasabi", name: "魔鬼芥末", tags: ["Flux"], score: 8, weight: 0.8, cost: 3, sprite: SPRITES.wasabi },
  ];

  const COMBINE_RECIPES = {
    "fish+rice": {
      id: "sushi",
      name: "三文鱼寿司",
      scoreBonus: 5,
      weightScale: 0.65,
      sprite: SPRITES.sushi,
      tags: ["Food", "Flux", "Combo"],
    },
    "nori+rice": {
      id: "onigiri",
      name: "饭团",
      scoreBonus: 4,
      weightScale: 0.58,
      sprite: SPRITES.onigiri,
      tags: ["Food", "Flux", "Combo", "Intermediate"],
    },
    "fish+onigiri": {
      id: "salmon_roll",
      name: "鱼片寿司卷",
      scoreBonus: 8,
      weightScale: 0.62,
      sprite: SPRITES.salmonRoll,
      tags: ["Food", "Flux", "Combo", "Premium"],
    },
  };

  const TRIPLE_COMBINE_RECIPES = {
    "fish+nori+rice": {
      id: "salmon_roll",
      name: "鱼片寿司卷",
      scoreBonus: 12,
      weightScale: 0.48,
      sprite: SPRITES.salmonRoll,
      tags: ["Food", "Flux", "Combo", "Premium"],
    },
  };

  const EFFECT_RECIPES = {
    "bone+crusher": {
      name: "粉碎鱼刺",
      previewLabel: "可清 鱼刺",
      tags: ["Clean"],
    },
  };

  const RELIC_POOL = [
    {
      id: "tweezers",
      name: "镊子",
      rarity: "Common",
      type: "Active",
      icon: `${RELIC_ASSET}tweezers.png`,
      description: "一次性道具。准备阶段使用后，点击 1 个鱼骨将其移除。",
    },
    {
      id: "cleaning_coupon",
      name: "清洁券",
      rarity: "Common",
      type: "Active",
      icon: `${RELIC_ASSET}cleaning_coupon.png`,
      description: "一次性道具。准备阶段使用，清除盘面所有鱼骨。",
    },
    {
      id: "golden_plate_upgrade",
      name: "金色餐盘券",
      rarity: "Rare",
      type: "Active",
      icon: SPRITES.goldenPlate,
      description: "一次性道具。准备阶段点击 1 个餐盘升级为金色餐盘，该餐盘上的食物投喂金币翻倍。",
    },
    {
      id: "premium_nori",
      name: "高级海苔",
      rarity: "Common",
      type: "Passive",
      icon: `${RELIC_ASSET}premium_nori.png`,
      description: "海苔参与 Combo 时，最终食物分数额外提高。",
    },
    {
      id: "compressed_sushi",
      name: "压缩寿司技法",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}compressed_sushi.png`,
      description: "Combo 产物重量降低，传送带压力更小。",
    },
    {
      id: "combo_chain",
      name: "连锁奖励",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}combo_chain.png`,
      description: "同一天内每次合成 Combo，后续 Combo 分数提高。可重复叠加。",
    },
    {
      id: "double_plating",
      name: "双层摆盘",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}double_plating.png`,
      description: "三件食材合成的高级 Combo 额外提高分数。可重复叠加。",
    },
    {
      id: "artisan_hand",
      name: "匠人手法",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}artisan_hand.png`,
      description: "合成腾出空格时，按腾出数量额外降低过载。可重复叠加。",
    },
    {
      id: "happy_sticker",
      name: "开心贴纸",
      rarity: "Common",
      type: "Passive",
      icon: `${RELIC_ASSET}happy_sticker.png`,
      description: "吃到 Combo 时，额外降低 Overload。",
    },
    {
      id: "vip_tip",
      name: "VIP 小费",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}vip_tip.png`,
      description: "投喂食物时，有概率获得额外金币。",
    },
    {
      id: "crusher_upgrade",
      name: "粉碎机升级",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}crusher_upgrade.png`,
      description: "粉碎机清理鱼骨时获得更多金币。",
    },
    {
      id: "crusher_range",
      name: "扩展粉碎器",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}crusher_range.png`,
      description: "厨余粉碎机的鱼骨清理范围 +1。可重复叠加。",
    },
    {
      id: "free_bone",
      name: "免费鱼骨",
      rarity: "Common",
      type: "Passive",
      icon: `${RELIC_ASSET}free_bone.png`,
      description: "商店里的鱼骨购买价格变为 0。",
    },
    {
      id: "bone_growth",
      name: "鱼骨增殖",
      rarity: "Common",
      type: "Passive",
      icon: `${RELIC_ASSET}bone_growth.png`,
      description: "每天营业前准备额外生成 1 个鱼骨，并提高商店鱼骨出现概率。可重复叠加。",
    },
    {
      id: "bone_gold",
      name: "骨粉金币",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}bone_gold.png`,
      description: "每粉碎 1 个鱼骨，额外获得 2 金币。可重复叠加。",
    },
    {
      id: "bone_relief",
      name: "骨粉降压",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}bone_relief.png`,
      description: "每粉碎 1 个鱼骨，额外降低 4 过载。可重复叠加。",
    },
    {
      id: "bone_recycle",
      name: "鱼骨回收",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}bone_recycle.png`,
      description: "鱼骨被粉碎后，有概率回到备料区。重复选择会提高概率。",
    },
    {
      id: "free_refresh",
      name: "免费刷新券",
      rarity: "Common",
      type: "Passive",
      icon: `${RELIC_ASSET}free_refresh.png`,
      description: "每天首次手动刷新商店免费。",
    },
    {
      id: "piggy_bank",
      name: "存钱罐",
      rarity: "Rare",
      type: "Passive",
      icon: `${RELIC_ASSET}piggy_bank.png`,
      description: "每次营业成功后存入 2 金币；若因金币不足失败，自动打碎并返还存款 5 倍。",
    },
  ];

  // Daily balance table. targetGold is cumulative current Gold, not daily revenue.
  const MIN_DAY_TICKS = SLOT_COUNT;
  const DAY_CONFIGS = {
    1: { ticks: 12, targetGold: 24, startingTrash: 0 },
    2: { ticks: 12, targetGold: 40, startingTrash: 0 },
    3: { ticks: 12, targetGold: 60, startingTrash: 0 },
    4: { ticks: 12, targetGold: 84, startingTrash: 0 },
    5: { ticks: 12, targetGold: 112, startingTrash: 0 },
  };

  const state = {
    phase: "Finished",
    currentDay: 0,
    currentTick: 0,
    totalTicks: 0,
    targetGold: DAY_CONFIGS[1].targetGold,
    gold: 22,
    goldAtBusinessStart: 0,
    piggyBankGold: 0,
    lastPiggyRescue: 0,
    dailyComboCount: 0,
    overload: 0,
    saturation: 50,
    penaltyTicks: 0,
    refreshCost: 1,
    refreshCount: 0,
    freeRefreshUsed: 0,
    slots: Array(SLOT_COUNT).fill(null),
    plateMultipliers: Array(SLOT_COUNT).fill(1),
    inventory: [],
    shop: [],
    playerRelics: [],
    pendingRewardChoices: [],
    rewardResolved: true,
    lastResult: null,
    selectedInventory: null,
    selectedSlot: null,
    activeRelicId: null,
    dragState: null,
    suppressShopClick: false,
    suppressInventoryClick: false,
    suppressSlotClick: false,
    runningTimer: null,
    consumerMood: "happy",
    consumerMoodTimer: null,
    lastDisplayedGold: null,
    nextId: 1,
  };

  const els = {
    belt: document.getElementById("belt"),
    gameShell: document.querySelector(".game-shell"),
    stage: document.getElementById("stage"),
    dayText: document.getElementById("dayText"),
    goldText: document.getElementById("goldText"),
    targetText: document.getElementById("targetText"),
    overloadText: document.getElementById("overloadText"),
    saturationText: document.getElementById("saturationText"),
    phaseText: document.getElementById("phaseText"),
    phaseBanner: document.getElementById("phaseBanner"),
    phaseBannerTitle: document.getElementById("phaseBannerTitle"),
    phaseBannerSub: document.getElementById("phaseBannerSub"),
    consumerFace: document.getElementById("consumerFace"),
    consumerPortrait: document.getElementById("consumerPortrait"),
    controls: document.querySelector(".controls"),
    shopPanel: document.getElementById("shopPanel"),
    shopList: document.getElementById("shopList"),
    inventoryList: document.getElementById("inventoryList"),
    refreshBtn: document.getElementById("refreshBtn"),
    startDayBtn: document.getElementById("startDayBtn"),
    confirmBtn: document.getElementById("confirmBtn"),
    quickRetryBtn: document.getElementById("quickRetryBtn"),
    actionHint: document.getElementById("actionHint"),
    log: document.getElementById("log"),
    conveyorBase: document.getElementById("conveyorBase"),
    effectLayer: document.getElementById("effectLayer"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultCard: document.getElementById("resultCard"),
    resultTitle: document.getElementById("resultTitle"),
    resultDetail: document.getElementById("resultDetail"),
    rewardChoices: document.getElementById("rewardChoices"),
    skipRewardBtn: document.getElementById("skipRewardBtn"),
    resultNextDayBtn: document.getElementById("resultNextDayBtn"),
    retryBtn: document.getElementById("retryBtn"),
    tutorialCoach: document.getElementById("tutorialCoach"),
    tutorialBtn: document.getElementById("tutorialBtn"),
    tutorialCoachTitle: document.getElementById("tutorialCoachTitle"),
    tutorialCoachText: document.getElementById("tutorialCoachText"),
    tutorialDoneBtn: document.getElementById("tutorialDoneBtn"),
    relicList: document.getElementById("relicList"),
    itemTooltip: document.getElementById("itemTooltip"),
    comboGuide: document.querySelector(".combo-guide"),
  };

  function cloneItem(template) {
    return { ...template, tags: [...template.tags], uid: `${template.id}_${state.nextId++}` };
  }

  let tutorialActive = false;
  let tutorialAutoCloseTimer = null;

  function hasTag(item, tag) {
    return item.tags.includes(tag);
  }

  function isFood(item) {
    return hasTag(item, "Raw") || hasTag(item, "Flux") || hasTag(item, "Food");
  }

  function isTrash(item) {
    return hasTag(item, "Trash");
  }

  function isCrusher(item) {
    return item?.id === "crusher";
  }

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function playTone(frequency, duration, type = "sine", gain = 0.35, delay = 0) {
    const context = getAudioContext();
    if (!context) return;

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * MASTER_VOLUME), start + 0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playMusicTone(frequency, duration, delay = 0, gain = 1, type = "sine") {
    const context = getAudioContext();
    if (!context) return;

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * MUSIC_VOLUME), start + 0.08);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter);
    filter.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  function startBackgroundMusic() {
    if (musicStarted) return;
    const context = getAudioContext();
    if (!context) return;
    musicStarted = true;
    scheduleMusicLoop();
  }

  function scheduleMusicLoop() {
    if (!musicStarted) return;

    const melody = [
      392, 440, 523.25, 587.33,
      523.25, 440, 392, 329.63,
      392, 493.88, 587.33, 659.25,
      587.33, 523.25, 440, 392,
    ];
    const bass = [196, 196, 220, 220, 261.63, 261.63, 220, 220];
    const stepDuration = 0.48;
    const note = melody[musicStep % melody.length];
    const barStep = musicStep % 4;

    playMusicTone(note, barStep === 3 ? 0.72 : 0.42, 0, barStep === 0 ? 0.9 : 0.72, "triangle");
    if (musicStep % 2 === 0) {
      playMusicTone(bass[Math.floor(musicStep / 2) % bass.length], 0.86, 0, 0.42, "sine");
    }

    musicStep = (musicStep + 1) % melody.length;
    musicTimer = window.setTimeout(scheduleMusicLoop, stepDuration * 1000);
  }

  function playNoise(duration, gain = 0.25, delay = 0, frequency = 900) {
    const context = getAudioContext();
    if (!context) return;

    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const volume = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.setValueAtTime(0.8, start);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * MASTER_VOLUME), start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(volume);
    volume.connect(context.destination);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function playSound(name) {
    switch (name) {
      case "buy":
        playTone(660, 0.08, "triangle", 0.28);
        playTone(990, 0.1, "triangle", 0.22, 0.055);
        break;
      case "place":
        playTone(380, 0.09, "sine", 0.26);
        playTone(520, 0.08, "sine", 0.2, 0.055);
        break;
      case "swap":
        playTone(430, 0.06, "square", 0.14);
        playTone(360, 0.06, "square", 0.12, 0.055);
        break;
      case "refresh":
        playTone(520, 0.05, "triangle", 0.16);
        playTone(700, 0.05, "triangle", 0.16, 0.04);
        playTone(880, 0.07, "triangle", 0.14, 0.08);
        break;
      case "start":
        playTone(300, 0.12, "sawtooth", 0.12);
        playTone(450, 0.16, "sawtooth", 0.11, 0.08);
        break;
      case "tick":
        playTone(210, 0.035, "triangle", 0.08);
        break;
      case "merge":
        playTone(523, 0.08, "triangle", 0.22);
        playTone(784, 0.1, "triangle", 0.2, 0.055);
        playTone(1046, 0.14, "triangle", 0.16, 0.11);
        break;
      case "premium":
        playTone(659, 0.09, "triangle", 0.22);
        playTone(988, 0.11, "triangle", 0.21, 0.06);
        playTone(1318, 0.18, "triangle", 0.18, 0.13);
        break;
      case "crush":
        playNoise(0.16, 0.28, 0, 520);
        playTone(150, 0.1, "sawtooth", 0.1, 0.04);
        break;
      case "feed":
        playTone(720, 0.08, "sine", 0.2);
        playTone(1080, 0.12, "sine", 0.16, 0.06);
        break;
      case "bad":
        playTone(180, 0.16, "sawtooth", 0.22);
        playNoise(0.18, 0.18, 0.03, 240);
        break;
      case "coin":
        playTone(880, 0.06, "triangle", 0.2);
        playTone(1320, 0.08, "triangle", 0.16, 0.05);
        break;
      case "success":
        playTone(523, 0.1, "triangle", 0.2);
        playTone(659, 0.1, "triangle", 0.2, 0.08);
        playTone(784, 0.18, "triangle", 0.18, 0.16);
        break;
      case "fail":
        playTone(330, 0.14, "sawtooth", 0.18);
        playTone(247, 0.18, "sawtooth", 0.16, 0.12);
        break;
      case "error":
        playTone(160, 0.09, "square", 0.16);
        playTone(140, 0.11, "square", 0.14, 0.08);
        break;
      default:
        break;
    }
  }

  function wrapSlotIndex(index) {
    return (index + SLOT_COUNT) % SLOT_COUNT;
  }

  function adjacentSlotIndices(index) {
    return [wrapSlotIndex(index - 1), wrapSlotIndex(index + 1)];
  }

  function rangedAdjacentSlotIndices(index, range) {
    const indices = [];
    for (let distance = 1; distance <= range; distance += 1) {
      indices.push(wrapSlotIndex(index - distance), wrapSlotIndex(index + distance));
    }
    return [...new Set(indices)];
  }

  function setOverload(value) {
    state.overload = Math.max(0, Math.min(MAX_OVERLOAD, value));
  }

  function hasRelic(relicId) {
    return state.playerRelics.some((relic) => relic.id === relicId);
  }

  function relicCount(relicId) {
    return state.playerRelics.filter((relic) => relic.id === relicId).length;
  }

  function currentRefreshCost() {
    if (relicCount("free_refresh") > state.freeRefreshUsed) return 0;
    return REFRESH_COSTS[Math.min(state.refreshCount, REFRESH_COSTS.length - 1)];
  }

  function itemCost(item) {
    if (item.id === "bone" && hasRelic("free_bone")) return 0;
    return item.cost;
  }

  function shopWeight(item) {
    if (item.id === "bone") {
      const growth = relicCount("bone_growth");
      if (growth > 0) return 1 + growth * 3;
      if (hasRelic("free_bone")) return 2;
      return state.currentDay < 3 ? 0 : 1;
    }
    if (item.id === "crusher") return state.currentDay < 3 ? 1 : 3;
    if (item.id === "wasabi") return 3;
    if (["rice", "fish", "nori"].includes(item.id)) return 5;
    return 1;
  }

  function drawWeightedShop(count) {
    const candidates = itemPool
      .map((item) => ({ item, weight: shopWeight(item) }))
      .filter((candidate) => candidate.weight > 0);
    const shop = [];

    while (shop.length < count && candidates.length > 0) {
      const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
      let roll = Math.random() * totalWeight;
      const index = candidates.findIndex((candidate) => {
        roll -= candidate.weight;
        return roll <= 0;
      });
      const pickedIndex = index >= 0 ? index : candidates.length - 1;
      shop.push(candidates.splice(pickedIndex, 1)[0].item);
    }

    return shop;
  }

  function recipeKey(...items) {
    return items.map((item) => item.id).sort().join("+");
  }

  function findPairRecipe(itemA, itemB) {
    if (!itemA || !itemB) return null;
    return COMBINE_RECIPES[recipeKey(itemA, itemB)] ?? null;
  }

  function findEffectRecipe(itemA, itemB) {
    if (!itemA || !itemB) return null;
    return EFFECT_RECIPES[recipeKey(itemA, itemB)] ?? null;
  }

  function findTripleRecipe(itemA, itemB, itemC) {
    if (!itemA || !itemB || !itemC) return null;
    return TRIPLE_COMBINE_RECIPES[recipeKey(itemA, itemB, itemC)] ?? null;
  }

  function previewRecipeForPlacement(item, slotIndex) {
    if (!item || state.slots[slotIndex]) return null;

    const left = state.slots[wrapSlotIndex(slotIndex - 1)] ?? null;
    const right = state.slots[wrapSlotIndex(slotIndex + 1)] ?? null;
    const twoLeft = state.slots[wrapSlotIndex(slotIndex - 2)] ?? null;
    const twoRight = state.slots[wrapSlotIndex(slotIndex + 2)] ?? null;

    return (
      findTripleRecipe(twoLeft, left, item) ||
      findTripleRecipe(left, item, right) ||
      findTripleRecipe(item, right, twoRight) ||
      findEffectRecipe(left, item) ||
      findEffectRecipe(item, right) ||
      findPairRecipe(left, item) ||
      findPairRecipe(item, right)
    );
  }

  function selectedPlacementPreview(slotIndex) {
    if (state.phase !== "Preparation") return null;
    if (state.selectedInventory === null) return null;
    return previewRecipeForPlacement(state.inventory[state.selectedInventory], slotIndex);
  }

  function createRecipeItem(recipe, sourceItems) {
    const noriBonus = sourceItems.some((item) => item.id === "nori") ? 3 * relicCount("premium_nori") : 0;
    const chainBonus = state.dailyComboCount * relicCount("combo_chain");
    const tripleBonus = sourceItems.length >= 3 ? 5 * relicCount("double_plating") : 0;
    const totalScore = sourceItems.reduce((sum, item) => sum + item.score, 0) + noriBonus + chainBonus + tripleBonus;
    const totalWeight = sourceItems.reduce((sum, item) => sum + item.weight, 0);
    const weightScale = recipe.weightScale * Math.pow(0.8, relicCount("compressed_sushi"));

    return {
      id: recipe.id,
      uid: `${recipe.id}_${state.nextId++}`,
      name: recipe.name,
      tags: [...recipe.tags],
      score: totalScore + recipe.scoreBonus,
      weight: Math.max(0.1, totalWeight * weightScale),
      cost: 0,
      sprite: recipe.sprite,
    };
  }

  function dayGoal(day) {
    const configuredDay = DAY_CONFIGS[day];

    if (configuredDay) {
      return normalizeDayGoal(configuredDay);
    }

    const growth = Math.max(0, day - 5);
    const targetGold = targetGoldForDay(day);
    return normalizeDayGoal({
      targetGold,
      ticks: DAY_CONFIGS[5].ticks,
      startingTrash: 0,
    });
  }

  function targetGoldForDay(day) {
    const day5Target = DAY_CONFIGS[5].targetGold;
    if (day <= 10) {
      const midWave = day - 5;
      return day5Target + midWave * 28 + midWave * midWave * 2;
    }

    const day10Wave = 5;
    const day10Target = day5Target + day10Wave * 28 + day10Wave * day10Wave * 2;
    const lateWave = day - 10;
    const baseLateGrowth = lateWave * 48;
    const acceleratingGrowth = lateWave * lateWave * 4;
    return day10Target + baseLateGrowth + acceleratingGrowth;
  }

  function normalizeDayGoal(goal) {
    return {
      ...goal,
      ticks: normalizeTickCount(goal.ticks),
    };
  }

  function normalizeTickCount(ticks) {
    return Math.max(MIN_DAY_TICKS, Math.ceil(ticks / SLOT_COUNT) * SLOT_COUNT);
  }

  function log(message, tone) {
    const line = document.createElement("div");
    if (tone) line.className = tone;
    line.textContent = message;
    els.log.prepend(line);
  }

  function renderGoldText() {
    const previousGold = state.lastDisplayedGold;
    els.goldText.textContent = String(state.gold);

    if (previousGold !== null && previousGold !== state.gold) {
      spawnHudGoldChange(state.gold - previousGold);
    }

    state.lastDisplayedGold = state.gold;
  }

  function updateGameScale() {
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    document.documentElement.style.setProperty("--game-scale", String(Math.max(0.1, scale)));
    renderTutorialCoach();
  }

  function showTutorial(force = false) {
    if (!force && window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1") return;
    tutorialActive = true;
    if (tutorialAutoCloseTimer) {
      window.clearTimeout(tutorialAutoCloseTimer);
      tutorialAutoCloseTimer = null;
    }
    renderTutorialCoach();
  }

  function closeTutorial() {
    tutorialActive = false;
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
    clearTutorialTargets();
    els.tutorialCoach.classList.add("hidden");
  }

  function clearTutorialTargets() {
    document.querySelectorAll(".tutorial-target").forEach((element) => element.classList.remove("tutorial-target"));
  }

  function getTutorialCoachStep() {
    if (state.phase === "Running") {
      return {
        selector: "#phaseBanner",
        title: "营业开始了",
        text: "现在不用操作，观察餐盘旋转、合成、粉碎和投喂。第一轮营业开始后，引导会自动结束。",
        autoComplete: true,
      };
    }

    if (state.phase === "Finished") {
      if (state.lastResult?.advanced && !state.rewardResolved) {
        return {
          selector: "#rewardChoices",
          title: "选择一个道具",
          text: "过关后会二选一获得道具。道具会改变后续构筑方向。",
        };
      }

      return {
        selector: state.lastResult?.advanced ? "#resultNextDayBtn" : "#retryBtn",
        title: state.lastResult?.advanced ? "进入下一天" : "重新开始",
        text: state.lastResult?.advanced ? "点击新一天继续挑战更高目标。" : "这局失败了，点击重新开始再试一次。",
      };
    }

    const filledSlots = state.slots.filter(Boolean).length;
    if (filledSlots > 0) {
      return {
        selector: "#confirmBtn",
        title: "确认摆盘",
        text: "餐盘上已有物品。你可以继续调整顺序，或点击确认摆盘开始营业。",
      };
    }

    if (state.inventory.length > 0) {
      return {
        selector: "#inventoryPanel",
        title: "拖到餐盘",
        text: "把备料区里的物品直接拖到左侧空餐盘上松手。相邻食材会在营业前自动合成 Combo。",
      };
    }

    return {
      selector: "#shopPanel",
      title: "先买食材",
      text: "点击商店里的食材购买。购买后会进入备料区，再拖到餐盘上。",
    };
  }

  function renderTutorialCoach() {
    clearTutorialTargets();
    if (!tutorialActive) {
      els.tutorialCoach.classList.add("hidden");
      return;
    }

    const step = getTutorialCoachStep();
    const target = document.querySelector(step.selector);
    if (!target) {
      els.tutorialCoach.classList.add("hidden");
      return;
    }

    target.classList.add("tutorial-target");
    els.tutorialCoachTitle.textContent = step.title;
    els.tutorialCoachText.textContent = step.text;
    els.tutorialCoach.classList.remove("hidden");
    positionTutorialCoach(target);

    if (step.autoComplete && !tutorialAutoCloseTimer) {
      tutorialAutoCloseTimer = window.setTimeout(closeTutorial, 3200);
    }
  }

  function positionTutorialCoach(target) {
    const rect = target.getBoundingClientRect();
    const shellRect = els.gameShell.getBoundingClientRect();
    const coach = els.tutorialCoach;
    const coachWidth = 270;
    const coachHeight = 150;
    const gap = 14;
    const scale = shellRect.width / DESIGN_WIDTH || 1;
    const targetLeft = (rect.left - shellRect.left) / scale;
    const targetRight = (rect.right - shellRect.left) / scale;
    const targetTop = (rect.top - shellRect.top) / scale;
    const targetHeight = rect.height / scale;
    const spaceRight = DESIGN_WIDTH - targetRight;
    const left =
      spaceRight >= coachWidth + gap
        ? targetRight + gap
        : Math.max(12, targetLeft - coachWidth - gap);
    const top = Math.max(12, Math.min(DESIGN_HEIGHT - coachHeight - 12, targetTop + targetHeight * 0.2));
    coach.style.left = `${left}px`;
    coach.style.top = `${top}px`;
  }

  function render() {
    if (els.itemTooltip && !els.itemTooltip.classList.contains("hidden")) {
      hideItemTooltip();
    }
    els.dayText.textContent = String(state.currentDay);
    renderGoldText();
    els.targetText.textContent = String(state.targetGold);
    els.overloadText.textContent = `${state.overload.toFixed(1)}%`;
    els.saturationText.textContent = `${state.saturation.toFixed(1)}%`;
    els.phaseText.textContent =
      state.phase === "Preparation" ? "整备阶段" : state.phase === "Running" ? "营业中" : "营业结束";
    renderPhaseBanner();
    renderResultOverlay();
    renderConsumerState();

    renderBelt();
    renderShop();
    renderInventory();
    renderRelics();
    updateControlPanelSizing();

    const canPrepare = state.phase === "Preparation";
    const hasAffordableShopItem = canPrepare && state.shop.some((item) => state.gold >= itemCost(item));
    els.shopPanel.classList.toggle("shop-affordable", hasAffordableShopItem);
    const refreshCost = currentRefreshCost();
    els.refreshBtn.textContent = refreshCost > 0 ? `刷新 ${priceText(refreshCost)}` : "刷新 免费";
    els.refreshBtn.disabled = !canPrepare;
    els.confirmBtn.disabled = !canPrepare;
    els.quickRetryBtn.disabled = state.phase === "Running";
    const canStartNextDay = state.phase === "Finished" && state.lastResult?.advanced && state.rewardResolved;
    els.startDayBtn.disabled = !canStartNextDay;
    els.startDayBtn.classList.toggle("next-day-prompt", canStartNextDay);
    updateActionHint();
    renderTutorialCoach();
  }

  function updateControlPanelSizing() {
    const minPanel = 190;
    const shopWeight = Math.max(0.65, Math.min(4, state.shop.length || 0.65));
    const inventoryWeight = Math.max(0.65, Math.min(6, state.inventory.length || 0.65));

    els.controls.style.setProperty("--shop-row-min", `${minPanel}px`);
    els.controls.style.setProperty("--inventory-row-min", `${minPanel}px`);
    els.controls.style.setProperty("--shop-row-flex", `${shopWeight}fr`);
    els.controls.style.setProperty("--inventory-row-flex", `${inventoryWeight}fr`);
  }

  function renderPhaseBanner() {
    const phaseInfo = {
      Preparation: {
        className: "phase-banner phase-prep",
        title: "营业前准备",
        sub: "购买食材，拖到空餐盘；点击两个餐盘可交换顺序",
      },
      Running: {
        className: "phase-banner phase-running",
        title: `营业中 ${state.currentTick} / ${state.totalTicks} 轮`,
        sub: "传送带自动旋转，观察合成、粉碎和投喂结果",
      },
      Finished: {
        className: `phase-banner ${state.lastResult?.advanced ? "phase-success" : "phase-failed"}`,
        title: state.lastResult?.advanced ? "营业成功" : "营业失败",
        sub: state.lastResult
          ? state.lastResult.advanced
            ? `金币 ${state.gold}/${state.targetGold} · 本日 +${state.lastResult.produced} · 过载 ${state.overload.toFixed(1)}%`
            : `原因：${state.lastResult.failureReason}`
          : "查看日志总结；达标后点击新一天继续",
      },
    }[state.phase];

    els.phaseBanner.className = phaseInfo.className;
    els.phaseBannerTitle.textContent = phaseInfo.title;
    els.phaseBannerSub.textContent = phaseInfo.sub;
  }

  function renderResultOverlay() {
    if (state.phase !== "Finished" || state.lastResult === null) {
      els.resultOverlay.classList.add("hidden");
      return;
    }

    els.resultOverlay.classList.remove("hidden");
    els.resultCard.className = `result-card ${state.lastResult.advanced ? "result-success" : "result-failed"}`;
    els.resultTitle.textContent = state.lastResult.advanced ? "营业成功" : "营业失败";
    const nextTargetGold = dayGoal(state.currentDay + 1).targetGold;
    const lines = state.lastResult.advanced
      ? [
          `达成目标：金币 ${state.gold}/${state.targetGold}`,
          `本日收入：+${state.lastResult.produced} 金币`,
          `剩余过载：${state.overload.toFixed(1)}%`,
          ...(state.lastResult.piggyRescue > 0 ? [`存钱罐救援：+${state.lastResult.piggyRescue} 金币`] : []),
          `下一天目标营业额：${nextTargetGold} 金币`,
          state.rewardResolved ? "点击“新一天”继续" : "选择 1 个道具，或跳过",
        ]
      : [
          `失败原因：${state.lastResult.failureReason}`,
          `目标金币：${state.gold}/${state.targetGold}`,
          `本日收入：+${state.lastResult.produced} 金币`,
          `剩余过载：${state.overload.toFixed(1)}%`,
          "餐厅倒闭",
        ];
    if (state.lastResult.advanced && !state.rewardResolved) {
      els.resultDetail.innerHTML = resultLinesHtml(lines);
    } else {
      els.resultDetail.innerHTML = resultLinesHtml(lines);
    }
    renderRewardChoices();
    els.resultNextDayBtn.hidden = !(state.lastResult.advanced && state.rewardResolved);
    els.retryBtn.hidden = state.lastResult.advanced;
  }

  function resultLinesHtml(lines) {
    return lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  }

  function renderRewardChoices() {
    els.rewardChoices.innerHTML = "";
    const shouldShowRewards = state.phase === "Finished" && state.lastResult?.advanced && !state.rewardResolved;
    els.rewardChoices.hidden = !shouldShowRewards;
    els.skipRewardBtn.hidden = !shouldShowRewards;

    if (!shouldShowRewards) return;

    state.pendingRewardChoices.forEach((relic) => {
      const card = document.createElement("button");
      card.className = `reward-card rarity-${relic.rarity.toLowerCase()}`;
      card.innerHTML = `
        <img class="reward-icon" src="${relic.icon}" alt="${relic.name}" />
        <span class="reward-copy">
          <strong>${relic.name}</strong>
          <span class="reward-rarity">${relic.rarity}</span>
          <span>${relic.description}</span>
        </span>
      `;
      card.addEventListener("click", () => chooseRelic(relic.id));
      els.rewardChoices.appendChild(card);
    });
  }

  function renderRelics() {
    els.relicList.innerHTML = "";
    if (state.playerRelics.length === 0) {
      els.relicList.textContent = "暂无道具";
      return;
    }

    const groupedRelics = RELIC_POOL
      .map((relic) => ({ ...relic, count: relicCount(relic.id) }))
      .filter((relic) => relic.count > 0);

    groupedRelics.forEach((relic) => {
      const relicEl = document.createElement(relic.type === "Active" ? "button" : "div");
      const description = relicDescription(relic);
      relicEl.className = `owned-relic${relic.type === "Active" ? " active-relic" : ""}${state.activeRelicId === relic.id ? " selected" : ""}`;
      relicEl.title = description;
      relicEl.innerHTML = `
        <img src="${relic.icon}" alt="${relic.name}" />
        <span>
          <strong>${relic.name}${relic.count > 1 ? ` x${relic.count}` : ""}</strong>
          <small>${description}</small>
        </span>
      `;
      if (relic.type === "Active") {
        relicEl.addEventListener("click", () => useActiveRelic(relic.id));
      }
      els.relicList.appendChild(relicEl);
    });
  }

  function relicDescription(relic) {
    if (relic.id === "piggy_bank") {
      return `${relic.description} 当前存款：${state.piggyBankGold} 金币。`;
    }
    return relic.description;
  }

  function renderConsumerState() {
    const overloadMood = state.overload >= 85 && state.consumerMood !== "combo" ? "angry" : state.consumerMood;
    const portraitByMood = {
      happy: SPRITES.consumerHappy,
      combo: SPRITES.consumerCombo,
      angry: SPRITES.consumerAngry,
    };
    const faceByMood = {
      happy: state.saturation > 70 ? "^o^" : "^_^",
      combo: "XD",
      angry: state.overload >= 95 ? "!!!" : ">_<",
    };

    els.consumerPortrait.src = portraitByMood[overloadMood] ?? SPRITES.consumerHappy;
    els.consumerPortrait.className = `consumer-portrait mood-${overloadMood}`;
    els.consumerFace.textContent = faceByMood[overloadMood] ?? "^_^";
    els.consumerFace.className = `consumer-face mood-${overloadMood}`;
    document.querySelector(".consumer").className =
      `consumer${state.overload >= 85 ? " overload-danger" : state.overload >= 65 ? " overload-warning" : ""}`;
  }

  function setConsumerMood(mood, durationMs) {
    state.consumerMood = mood;
    if (state.consumerMoodTimer !== null) {
      window.clearTimeout(state.consumerMoodTimer);
    }
    state.consumerMoodTimer = window.setTimeout(() => {
      state.consumerMood = "happy";
      state.consumerMoodTimer = null;
      render();
    }, durationMs);
  }

  function setHint(message) {
    els.actionHint.textContent = message;
    els.actionHint.classList.remove("hint-pop");
    void els.actionHint.offsetWidth;
    els.actionHint.classList.add("hint-pop");
  }

  function updateActionHint() {
    if (state.phase === "Running") {
      els.actionHint.textContent = "营业中：观察合成、粉碎、投喂和过载变化。";
      return;
    }

    if (state.selectedInventory !== null && state.inventory[state.selectedInventory]) {
      els.actionHint.textContent = `已选中 ${state.inventory[state.selectedInventory].name}：拖到或点击空餐盘固定。`;
      return;
    }

    if (state.selectedSlot !== null) {
      els.actionHint.textContent = `已选中 Slot[${state.selectedSlot}]：点击另一个餐盘交换位置。`;
      return;
    }

    if (state.inventory.length > 0) {
      els.actionHint.textContent = "拖拽备料区物品到空餐盘；或点击两个餐盘交换顺序。";
      return;
    }

    els.actionHint.textContent = "点击商店物品购买。配方：醋饭+鱼片、海苔+醋饭，或海苔+醋饭+鱼片。";
  }

  function renderBelt() {
    state.slots.forEach((item, index) => {
      const comboPreview = selectedPlacementPreview(index);
      const plateMultiplier = state.plateMultipliers[index] ?? 1;
      const plateSprite = plateMultiplier > 1 ? SPRITES.goldenPlate : SPRITES.plate;
      const angle = -90 + (index * 360) / SLOT_COUNT;
      const rad = (angle * Math.PI) / 180;
      const x = SLOT_CENTER_X + Math.cos(rad) * SLOT_RING_RADIUS;
      const y = SLOT_CENTER_Y + Math.sin(rad) * SLOT_RING_RADIUS;
      const slot = getOrCreateSlotElement(index);
      slot.className = `slot${item ? " occupied" : ""}${plateMultiplier > 1 ? " upgraded-plate" : ""}${index === 0 ? " feed" : ""}${state.selectedSlot === index ? " selected" : ""}${comboPreview ? " combo-target" : ""}`;
      slot.style.left = `${x}%`;
      slot.style.top = `${y}%`;
      slot.title = comboPreview ? `Slot ${index}：可生成 ${comboPreview.name}` : `Slot ${index}`;

      const plateImg = slot.querySelector(".plate-img");
      if (plateImg.getAttribute("src") !== plateSprite) plateImg.src = plateSprite;

      const itemImg = slot.querySelector(".slot-item-img");
      const emptyDot = slot.querySelector(".slot-empty-dot");
      const slotName = slot.querySelector(".slot-name");
      const plateBonus = slot.querySelector(".plate-bonus");
      const comboPreviewEl = slot.querySelector(".combo-preview");

      if (item) {
        itemImg.hidden = false;
        emptyDot.hidden = true;
        if (itemImg.getAttribute("src") !== item.sprite) itemImg.src = item.sprite;
        itemImg.alt = item.name;
        slotName.hidden = false;
        slotName.textContent = item.name;
        slot.dataset.tooltipHtml = itemDetailHtml(item);
      } else {
        itemImg.hidden = true;
        emptyDot.hidden = false;
        slotName.hidden = true;
        delete slot.dataset.tooltipHtml;
      }

      plateBonus.hidden = plateMultiplier <= 1;
      plateBonus.textContent = `x${plateMultiplier}`;
      comboPreviewEl.hidden = !comboPreview;
      comboPreviewEl.textContent = comboPreview ? (comboPreview.previewLabel ?? `可出 ${comboPreview.name}`) : "";
    });
  }

  function getOrCreateSlotElement(index) {
    let slot = els.belt.querySelector(`.slot[data-slot-index="${index}"]`);
    if (slot) return slot;

    slot = document.createElement("button");
    slot.dataset.slotIndex = String(index);
    slot.innerHTML = `
      <img class="plate-img" alt="" draggable="false" />
      <img class="slot-item-img" alt="" draggable="false" hidden />
      <div class="slot-empty-dot">·</div>
      <div class="slot-name" hidden></div>
      <div class="plate-bonus" hidden></div>
      <div class="combo-preview" hidden></div>
    `;
    slot.addEventListener("click", (event) => {
      const slotIndex = Number(slot.dataset.slotIndex);
      if (state.suppressSlotClick) {
        event.preventDefault();
        event.stopPropagation();
        state.suppressSlotClick = false;
        return;
      }
      onSlotClick(slotIndex);
    });
    slot.addEventListener("pointerdown", (event) => onSlotPointerDown(event, Number(slot.dataset.slotIndex)));
    slot.addEventListener("dragstart", (event) => event.preventDefault());
    slot.addEventListener("dragover", (event) => onSlotDragOver(event, Number(slot.dataset.slotIndex)));
    slot.addEventListener("dragleave", () => slot.classList.remove("drop-target"));
    slot.addEventListener("drop", (event) => onSlotDrop(event, Number(slot.dataset.slotIndex)));
    slot.addEventListener("mouseenter", (event) => {
      if (slot.dataset.tooltipHtml) showItemTooltip(slot.dataset.tooltipHtml, event);
    });
    slot.addEventListener("mousemove", (event) => {
      if (slot.dataset.tooltipHtml) moveItemTooltip(event);
    });
    slot.addEventListener("mouseleave", hideItemTooltip);
    slot.addEventListener("focus", (event) => {
      if (slot.dataset.tooltipHtml) showItemTooltip(slot.dataset.tooltipHtml, event);
    });
    slot.addEventListener("blur", hideItemTooltip);
    els.belt.appendChild(slot);
    return slot;
  }

  function renderShop() {
    els.shopList.innerHTML = "";
    state.shop.forEach((item, index) => {
      const card = createItemCard(item, priceText(itemCost(item)), (event) => buyItem(index, event));
      card.draggable = false;
      card.dataset.shopIndex = String(index);
      card.addEventListener("click", (event) => {
        if (state.suppressShopClick) {
          event.preventDefault();
          event.stopPropagation();
          state.suppressShopClick = false;
        }
      }, true);
      card.addEventListener("pointerdown", (event) => onShopPointerDown(event, item));
      card.addEventListener("dragstart", (event) => event.preventDefault());
      els.shopList.appendChild(card);
    });
    if (state.shop.length === 0) {
      els.shopList.textContent = "商店已售空";
    }
  }

  function renderInventory() {
    els.inventoryList.innerHTML = "";
    state.inventory.forEach((item, index) => {
      const card = createItemCard(item, `Score ${item.score} / Weight ${item.weight}`, () => {
        state.selectedInventory = index;
        state.selectedSlot = null;
        const previewCount = state.slots.filter((_, slotIndex) => previewRecipeForPlacement(item, slotIndex)).length;
        setHint(
          previewCount > 0
            ? `已选中 ${item.name}：金色高亮空餐盘可触发 Combo。`
            : `已选中 ${item.name}：拖到或点击一个空餐盘。`
        );
        render();
        log(`选中备料：${item.name}，点击空槽位摆放。`);
      });
      card.draggable = false;
      card.dataset.inventoryIndex = String(index);
      card.addEventListener("pointerdown", (event) => onInventoryPointerDown(event, index));
      card.addEventListener("dragstart", (event) => onInventoryDragStart(event, index));
      card.addEventListener("dragend", () => {
        document.querySelectorAll(".slot.drop-target").forEach((slot) => slot.classList.remove("drop-target"));
      });
      if (state.selectedInventory === index) card.classList.add("selected");
      els.inventoryList.appendChild(card);
    });
    if (state.inventory.length === 0) {
      els.inventoryList.textContent = "备料区为空";
    }
  }

  function createItemCard(item, meta, onClick) {
    const card = document.createElement("button");
    card.className = "item-card";
    card.dataset.tooltipHtml = itemDetailHtml(item);
    card.innerHTML = `
      <span class="card-plate"><img class="card-plate-img" src="${SPRITES.plate}" alt="" /><img class="card-item-img" src="${item.sprite}" alt="${item.name}" /></span>
      <span class="item-main"><strong>${item.name}</strong><span class="meta">${item.tags.join(" / ")}</span></span>
      <span class="meta item-meta-value">${meta}</span>
    `;
    card.addEventListener("click", onClick);
    card.addEventListener("click", (event) => {
      if (state.suppressInventoryClick) {
        event.preventDefault();
        event.stopPropagation();
        state.suppressInventoryClick = false;
      }
    }, true);
    card.addEventListener("mouseenter", (event) => showItemTooltip(card.dataset.tooltipHtml, event));
    card.addEventListener("mousemove", (event) => moveItemTooltip(event));
    card.addEventListener("mouseleave", hideItemTooltip);
    card.addEventListener("focus", (event) => showItemTooltip(card.dataset.tooltipHtml, event));
    card.addEventListener("blur", hideItemTooltip);
    return card;
  }

  function onShopPointerDown(event, item) {
    if (state.phase !== "Preparation" || event.button !== 0) return;

    const startX = event.clientX;
    const startY = event.clientY;
    let warned = false;

    const onPointerMove = (moveEvent) => {
      const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (warned || distance < 8) return;

      warned = true;
      state.suppressShopClick = true;
      hideItemTooltip();
      spawnPointerFloatingText(moveEvent, "请先点击购买", "bad");
      setHint(`商店里的 ${item.name} 需要先点击购买，进入备料区后才能拖到餐盘。`);
      log(`提示：${item.name} 需要先购买，再从备料区拖到餐盘。`, "bad");
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.setTimeout(() => {
        state.suppressShopClick = false;
      }, 0);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerUp, { once: true });
  }

  function showItemTooltip(html, event) {
    if (!html) return;
    els.itemTooltip.innerHTML = html;
    els.itemTooltip.classList.remove("hidden");
    moveItemTooltip(event);
  }

  function moveItemTooltip(event) {
    if (!event || els.itemTooltip.classList.contains("hidden")) return;
    if (event.currentTarget && !document.body.contains(event.currentTarget)) {
      hideItemTooltip();
      return;
    }
    const offset = 16;
    const tooltipRect = els.itemTooltip.getBoundingClientRect();
    const maxX = window.innerWidth - tooltipRect.width - 10;
    const maxY = window.innerHeight - tooltipRect.height - 10;
    const fallbackRect = event.currentTarget?.getBoundingClientRect?.();
    const clientX = typeof event.clientX === "number" ? event.clientX : (fallbackRect?.right ?? 0);
    const clientY = typeof event.clientY === "number" ? event.clientY : (fallbackRect?.top ?? 0);
    els.itemTooltip.style.left = `${Math.max(10, Math.min(clientX + offset, maxX))}px`;
    els.itemTooltip.style.top = `${Math.max(10, Math.min(clientY + offset, maxY))}px`;
  }

  function hideItemTooltip() {
    els.itemTooltip.classList.add("hidden");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function tooltipHtml({ title, purchase, score, overload, description, meta }) {
    return `
      <div class="tooltip-title">${escapeHtml(title)}</div>
      ${purchase ? `<div class="tooltip-row"><span>购买</span><strong>${escapeHtml(purchase)}</strong></div>` : ""}
      <div class="tooltip-row"><span>得分</span><strong>${escapeHtml(score)}</strong></div>
      <div class="tooltip-row"><span>过载</span><strong>${escapeHtml(overload)}</strong></div>
      ${meta ? `<div class="tooltip-meta">${escapeHtml(meta)}</div>` : ""}
      <div class="tooltip-desc">${escapeHtml(description)}</div>
    `;
  }

  function itemDetailHtml(item) {
    const roleById = {
      rice: "基础食材。可与鱼片合成三文鱼寿司，也可与海苔合成饭团。",
      fish: "基础食材。可与醋饭合成三文鱼寿司，也可参与海苔+醋饭+鱼片的大 Combo。",
      nori: "基础食材。可与醋饭合成饭团，或参与鱼片寿司卷。",
      bone: "垃圾。留在传送带上会显著增加过载，被吃到会触发惩罚。",
      crusher: "组件。与相邻鱼骨触发粉碎，获得金币并降低过载。",
      wasabi: "高分食物。可直接投喂获得金币，但也会占据传送带压力。",
      sushi: "Combo 食物。分数较高，投喂时比普通食物降低更多过载。",
      onigiri: "Combo 食物。也可继续与鱼片合成鱼片寿司卷。",
      salmon_roll: "Premium Combo。高分、低重量，投喂时大幅降低过载。",
    };

    return tooltipHtml({
      title: item.name,
      purchase: itemPurchaseText(item),
      score: itemScoreText(item),
      overload: itemOverloadText(item),
      meta: `标签：${item.tags.join(" / ")}｜重量：${item.weight.toFixed(1)}`,
      description: roleById[item.id] ?? "特殊物品。",
    });
  }

  function itemPurchaseText(item) {
    return item.cost ? `${itemCost(item)} 金币` : "";
  }

  function priceText(amount) {
    return `${amount} 金币`;
  }

  function itemScoreText(item) {
    const crushGold = 2 + relicCount("crusher_upgrade") * 2 + relicCount("bone_gold") * 2;
    if (isTrash(item)) return `投喂 0G；粉碎 +${crushGold}G`;
    if (isCrusher(item)) return `范围 ${1 + relicCount("crusher_range")}；粉碎鱼骨 +${crushGold}G`;
    return `投喂 +${item.score}G`;
  }

  function itemOverloadText(item) {
    if (isTrash(item)) return "盘面高压；被吃到触发惩罚";
    if (isCrusher(item)) return `自身有重量压力；粉碎鱼骨 -${OVERLOAD_BALANCE.crusherRelief + relicCount("bone_relief") * 4}`;
    const relief = hasTag(item, "Premium")
      ? OVERLOAD_BALANCE.premiumRelief
      : hasTag(item, "Combo")
        ? OVERLOAD_BALANCE.comboRelief
        : OVERLOAD_BALANCE.foodRelief;
    return `盘面按重量加压；投喂 -${relief}`;
  }

  function comboTooltipHtml(line) {
    return tooltipHtml({
      title: line.dataset.tooltipTitle,
      purchase: line.dataset.tooltipPurchase,
      score: line.dataset.tooltipScore,
      overload: line.dataset.tooltipOverload,
      description: line.dataset.tooltipDesc,
    });
  }

  function onInventoryPointerDown(event, inventoryIndex) {
    if (state.phase !== "Preparation" || event.button !== 0) return;
    const item = state.inventory[inventoryIndex];
    if (!item) return;
    event.preventDefault();

    state.dragState = {
      currentSlot: null,
      ghost: null,
      inventoryIndex,
      item,
      source: "inventory",
      startX: event.clientX,
      startY: event.clientY,
      started: false,
      suppressClick: false,
    };

    window.addEventListener("pointermove", onInventoryPointerMove);
    window.addEventListener("pointerup", onInventoryPointerUp, { once: true });
    window.addEventListener("pointercancel", cancelInventoryPointerDrag, { once: true });
  }

  function onSlotPointerDown(event, slotIndex) {
    if (state.phase !== "Preparation" || event.button !== 0) return;
    const item = state.slots[slotIndex];
    if (!item) return;
    event.preventDefault();

    state.dragState = {
      currentSlot: null,
      ghost: null,
      item,
      source: "slot",
      sourceSlot: slotIndex,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };

    window.addEventListener("pointermove", onInventoryPointerMove);
    window.addEventListener("pointerup", onInventoryPointerUp, { once: true });
    window.addEventListener("pointercancel", cancelInventoryPointerDrag, { once: true });
  }

  function onInventoryPointerMove(event) {
    const drag = state.dragState;
    if (!drag) return;

    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.started && distance < 5) return;

    if (!drag.started) {
      startInventoryDrag(event, drag);
    }

    event.preventDefault();
    moveDragGhost(event.clientX, event.clientY);
    updateDragTarget(event.clientX, event.clientY);
  }

  function startInventoryDrag(event, drag) {
    drag.started = true;
    drag.suppressClick = true;
    hideItemTooltip();
    state.selectedInventory = drag.source === "inventory" ? drag.inventoryIndex : null;
    state.selectedSlot = drag.source === "slot" ? drag.sourceSlot : null;
    drag.ghost = createDragGhost(drag.item);
    document.body.appendChild(drag.ghost);
    moveDragGhost(event.clientX, event.clientY);
    renderBelt();
    setHint(
      drag.source === "slot"
        ? `拖动 ${drag.item.name} 到其它餐盘，松开后移动或交换。`
        : `拖动 ${drag.item.name} 到空餐盘，松开鼠标即可固定。`
    );
  }

  function createDragGhost(item) {
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = `
      <img src="${item.sprite}" alt="${item.name}" />
      <span>${item.name}</span>
    `;
    return ghost;
  }

  function moveDragGhost(clientX, clientY) {
    if (!state.dragState?.ghost) return;
    state.dragState.ghost.style.left = `${clientX}px`;
    state.dragState.ghost.style.top = `${clientY}px`;
  }

  function updateDragTarget(clientX, clientY) {
    document.querySelectorAll(".slot.drop-target").forEach((slot) => slot.classList.remove("drop-target"));

    const slotIndex = slotIndexFromPoint(clientX, clientY);
    state.dragState.currentSlot = slotIndex;
    if (slotIndex === null) return;
    if (state.dragState?.source === "inventory" && state.slots[slotIndex] !== null) return;
    if (state.dragState?.source === "slot" && slotIndex === state.dragState.sourceSlot) return;

    const slot = els.belt.querySelector(`.slot[data-slot-index="${slotIndex}"]`);
    slot?.classList.add("drop-target");
  }

  function slotIndexFromPoint(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);
    const slot = element?.closest?.(".slot");
    if (!slot || !els.belt.contains(slot)) return null;

    const slotIndex = Number(slot.dataset.slotIndex);
    return Number.isInteger(slotIndex) ? slotIndex : null;
  }

  function onInventoryPointerUp(event) {
    window.removeEventListener("pointermove", onInventoryPointerMove);
    window.removeEventListener("pointercancel", cancelInventoryPointerDrag);
    const drag = state.dragState;
    if (!drag) return;

    if (!drag.started) {
      state.dragState = null;
      return;
    }

    event.preventDefault();
    const slotIndex = slotIndexFromPoint(event.clientX, event.clientY);
    const inventoryIndex = drag.inventoryIndex;
    const source = drag.source;
    const sourceSlot = drag.sourceSlot;
    state.suppressInventoryClick = source === "inventory";
    state.suppressSlotClick = source === "slot";
    window.setTimeout(() => {
      state.suppressInventoryClick = false;
      state.suppressSlotClick = false;
    }, 0);
    cleanupInventoryDrag();

    if (source === "inventory" && slotIndex !== null && state.slots[slotIndex] === null) {
      placeInventoryItem(inventoryIndex, slotIndex);
      return;
    }

    if (source === "slot" && slotIndex !== null && slotIndex !== sourceSlot) {
      swapSlots(sourceSlot, slotIndex);
      setHint(`已将 Slot[${sourceSlot}] 的物品移动/交换到 Slot[${slotIndex}]。`);
      render();
      return;
    }

    state.selectedInventory = null;
    state.selectedSlot = null;
    setHint(source === "slot" ? "没有放到其它餐盘上，已取消拖动。" : "没有放到空餐盘上，已取消拖动。");
    render();
  }

  function cancelInventoryPointerDrag() {
    window.removeEventListener("pointermove", onInventoryPointerMove);
    state.selectedInventory = null;
    state.selectedSlot = null;
    cleanupInventoryDrag();
    render();
  }

  function cleanupInventoryDrag() {
    document.querySelectorAll(".slot.drop-target").forEach((slot) => slot.classList.remove("drop-target"));
    state.dragState?.ghost?.remove();
    state.dragState = null;
  }

  function onInventoryDragStart(event, inventoryIndex) {
    if (state.phase !== "Preparation") {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(inventoryIndex));
    state.selectedInventory = inventoryIndex;
    state.selectedSlot = null;
    const previewCount = state.slots.filter((_, slotIndex) => previewRecipeForPlacement(state.inventory[inventoryIndex], slotIndex)).length;
    setHint(
      previewCount > 0
        ? `正在拖拽 ${state.inventory[inventoryIndex].name}：金色高亮位置可触发 Combo。`
        : `正在拖拽 ${state.inventory[inventoryIndex].name}：松手放到空餐盘。`
    );
    log(`拖拽备料：${state.inventory[inventoryIndex].name}，放到空餐盘固定。`);
    render();
  }

  function onSlotDragOver(event, slotIndex) {
    if (state.phase !== "Preparation" || state.slots[slotIndex] !== null) {
      return;
    }

    event.preventDefault();
    event.currentTarget.classList.add("drop-target");
    event.dataTransfer.dropEffect = "move";
  }

  function onSlotDrop(event, slotIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove("drop-target");

    const rawIndex = event.dataTransfer.getData("text/plain");
    const inventoryIndex = Number(rawIndex);

    if (!Number.isInteger(inventoryIndex)) {
      return;
    }

    placeInventoryItem(inventoryIndex, slotIndex);
  }

  function startNewDay() {
    if (state.runningTimer) return;
    if (state.phase === "Finished" && state.lastResult?.advanced && !state.rewardResolved) return;
    if (state.phase === "Preparation" && state.currentDay > 0) return;
    state.currentDay += 1;
    state.currentTick = 0;
    state.totalTicks = 0;
    const goal = dayGoal(state.currentDay);
    state.targetGold = goal.targetGold;
    state.refreshCount = 0;
    state.freeRefreshUsed = 0;
    state.phase = "Preparation";
    state.lastResult = null;
    state.pendingRewardChoices = [];
    state.rewardResolved = true;
    state.selectedInventory = null;
    state.selectedSlot = null;
    state.activeRelicId = null;
    log(`第 ${state.currentDay} 天开始整备。目标金币 ${state.targetGold}。`, "good");
    const trashInjection = injectTrashForPreparation(state.currentDay);
    refreshShop(true);
    showTrashInjectionFeedback(state.currentDay, trashInjection);
  }

  function restartGame() {
    if (state.phase === "Running") return;

    state.currentDay = 0;
    state.currentTick = 0;
    state.totalTicks = 0;
    state.targetGold = dayGoal(1).targetGold;
    state.gold = 22;
    state.goldAtBusinessStart = 0;
    state.piggyBankGold = 0;
    state.lastPiggyRescue = 0;
    state.dailyComboCount = 0;
    state.phase = "Preparation";
    state.lastResult = null;
    state.overload = 0;
    state.saturation = 50;
    state.penaltyTicks = 0;
    state.consumerMood = "happy";
    state.slots = Array(SLOT_COUNT).fill(null);
    state.plateMultipliers = Array(SLOT_COUNT).fill(1);
    state.inventory = [];
    state.shop = [];
    state.playerRelics = [];
    state.pendingRewardChoices = [];
    state.rewardResolved = true;
    state.selectedInventory = null;
    state.selectedSlot = null;
    state.activeRelicId = null;
    state.refreshCount = 0;
    state.freeRefreshUsed = 0;

    log("重新开始游戏。回到第 1 天营业前准备。", "good");
    playSound("start");
    startNewDay();
  }

  function refreshShop(isFree, event) {
    if (state.phase !== "Preparation") return;
    if (!isFree) {
      const cost = currentRefreshCost();
      if (state.gold < cost) {
        playSound("error");
        spawnPointerFloatingText(event, `金币不足：需要 ${cost} 金币`, "bad");
        setHint(`金币不足，刷新需要 ${cost} 金币。`);
        log("金币不足，不能刷新。", "bad");
        return;
      }
      state.gold -= cost;
      if (cost === 0) {
        state.freeRefreshUsed += 1;
      } else {
        state.refreshCount += 1;
      }
    }
    state.shop = drawWeightedShop(3);
    if (!isFree) playSound("refresh");
    log(`商店刷新：${state.shop.map((item) => item.name).join("、")}`);
    render();
  }

  function buyItem(shopIndex, event) {
    if (state.phase !== "Preparation") return;
    const item = state.shop[shopIndex];
    if (!item) return;
    const cost = itemCost(item);
    if (state.gold < cost) {
      playSound("error");
      spawnPointerFloatingText(event, `金币不足：差 ${cost - state.gold} 金币`, "bad");
      setHint(`金币不足，购买 ${item.name} 需要 ${cost} 金币。`);
      log(`金币不足，买不起 ${item.name}。`, "bad");
      return;
    }
    state.gold -= cost;
    state.shop.splice(shopIndex, 1);
    state.inventory.push(cloneItem(item));
    playSound("buy");
    setHint(`已购买 ${item.name}。现在可以把它从备料区拖到空餐盘。`);
    log(`购买 ${item.name}。`);
    render();
  }

  function onSlotClick(slotIndex) {
    if (state.phase !== "Preparation") return;

    if (state.activeRelicId) {
      useActiveRelicOnSlot(state.activeRelicId, slotIndex);
      return;
    }

    if (state.selectedInventory !== null) {
      placeInventoryItem(state.selectedInventory, slotIndex);
      return;
    }

    if (state.selectedSlot === null) {
      state.selectedSlot = slotIndex;
      setHint(`已选中 Slot[${slotIndex}]。再点击另一个 Slot 交换。`);
      log(`选中 Slot[${slotIndex}]，再点另一个槽位交换。`);
      render();
      return;
    }

    swapSlots(state.selectedSlot, slotIndex);
    state.selectedSlot = null;
    render();
  }

  function placeInventoryItem(inventoryIndex, slotIndex) {
    if (state.phase !== "Preparation") return false;

    const item = state.inventory[inventoryIndex];
    if (!item) return false;

    if (state.slots[slotIndex]) {
      playSound("error");
      log(`Slot[${slotIndex}] 已被占用。`, "bad");
      return false;
    }

    const [placedItem] = state.inventory.splice(inventoryIndex, 1);
    state.slots[slotIndex] = placedItem;
    state.selectedInventory = null;
    state.selectedSlot = null;
    playSound("place");
    spawnSlotEffect(slotIndex, SPRITES.merge, "place-pop");
    setHint(`${placedItem.name} 已固定到 Slot[${slotIndex}]。继续摆盘或点击确认摆盘。`);
    log(`将 ${placedItem.name} 固定到 Slot[${slotIndex}]。`);
    render();
    return true;
  }

  function swapSlots(indexA, indexB) {
    const temp = state.slots[indexA];
    state.slots[indexA] = state.slots[indexB];
    state.slots[indexB] = temp;
    playSound("swap");
    setHint(`已交换 Slot[${indexA}] 和 Slot[${indexB}]。相邻顺序会影响合成/粉碎。`);
    log(`交换 Slot[${indexA}] 与 Slot[${indexB}]。`);
  }

  function confirmLayout() {
    if (state.phase !== "Preparation") return;
    const goal = dayGoal(state.currentDay);
    state.phase = "Running";
    state.currentTick = 0;
    state.totalTicks = goal.ticks;
    state.goldAtBusinessStart = state.gold;
    state.dailyComboCount = 0;
    playSound("start");
    setHint(`营业开始：传送带自动转动，等待 ${goal.ticks} 轮结算。`);
    log(`开始营业：自动运行 ${goal.ticks} 轮。`, "good");
    hideItemTooltip();
    checkCombine();
    let tick = 0;
    const runNextTick = () => {
      if (state.phase !== "Running") {
        state.runningTimer = null;
        return;
      }

      tick += 1;
      state.currentTick = tick;
      rotateBelt();

      if (tick >= goal.ticks || state.overload >= MAX_OVERLOAD) {
        state.runningTimer = null;
        state.phase = "Finished";
        printSummary();
        render();
        return;
      }

      render();
      state.runningTimer = window.setTimeout(runNextTick, 650);
    };

    state.runningTimer = window.setTimeout(runNextTick, 1000);
    render();
  }

  function rotateBelt() {
    hideItemTooltip();
    playSound("tick");
    pulseBelt();
    const last = state.slots[SLOT_COUNT - 1];
    const lastPlateMultiplier = state.plateMultipliers[SLOT_COUNT - 1];
    for (let i = SLOT_COUNT - 1; i > 0; i -= 1) {
      state.slots[i] = state.slots[i - 1];
      state.plateMultipliers[i] = state.plateMultipliers[i - 1];
    }
    state.slots[0] = last;
    state.plateMultipliers[0] = lastPlateMultiplier;
    checkCombine();
    applyPressure();
    feedCenter();
  }

  function checkCombine() {
    let changed = true;
    let guard = 0;
    while (changed && guard < SLOT_COUNT * 2) {
      changed = false;
      guard += 1;
      for (let i = 0; i < SLOT_COUNT; i += 1) {
        const crusher = state.slots[i];
        if (!isCrusher(crusher)) continue;

        const crusherRange = 1 + relicCount("crusher_range");
        const trashSlots = rangedAdjacentSlotIndices(i, crusherRange).filter((slotIndex) => {
          const neighbor = state.slots[slotIndex];
          return neighbor && isTrash(neighbor);
        });

        if (trashSlots.length === 0) continue;

        const crushGold = 2 + relicCount("crusher_upgrade") * 2 + relicCount("bone_gold") * 2;
        const crushRelief = OVERLOAD_BALANCE.crusherRelief + relicCount("bone_relief") * 4;
        const recycleChance = Math.min(0.9, relicCount("bone_recycle") * 0.25);
        let recycled = 0;
        trashSlots.forEach((slotIndex) => {
          const trash = state.slots[slotIndex];
          state.slots[slotIndex] = null;
          spawnSlotEffect(slotIndex, SPRITES.smoke, "smoke-pop");
          if (recycleChance > 0 && Math.random() < recycleChance) {
            state.inventory.push(cloneItem(trash));
            recycled += 1;
          }
          log(`连锁：厨余粉碎机粉碎了相邻的 ${trash.name}。`, "good");
        });

        const totalCrushGold = trashSlots.length * crushGold;
        state.gold += totalCrushGold;
        playSound("crush");
        playSound("coin");
        spawnGoldRewardText(totalCrushGold, i, trashSlots.length > 1 ? `粉碎 x${trashSlots.length}` : "粉碎");
        setOverload(state.overload - crushRelief * trashSlots.length);
        log(
          `连锁：粉碎机清理 ${trashSlots.length} 个鱼骨，金币 +${totalCrushGold}，过载 -${crushRelief * trashSlots.length}${recycled > 0 ? `，回收 ${recycled} 个鱼骨` : ""}。`,
          "good"
        );
        changed = true;
        break;
      }

      if (changed) continue;

      for (let i = 0; i < SLOT_COUNT; i += 1) {
        const indexA = i;
        const indexB = wrapSlotIndex(i + 1);
        const indexC = wrapSlotIndex(i + 2);
        const a = state.slots[indexA];
        const b = state.slots[indexB];
        const c = state.slots[indexC];
        const tripleRecipe = findTripleRecipe(a, b, c);

        if (tripleRecipe) {
          const combined = createRecipeItem(tripleRecipe, [a, b, c]);
          state.slots[indexA] = null;
          state.slots[indexB] = null;
          state.slots[indexC] = combined;
          playSound("premium");
          spawnSlotEffect(indexC, SPRITES.merge, "merge-burst");
          spawnFloatingText("PREMIUM", indexC, "good");
          setConsumerMood("combo", 1900);
          onComboCreated(2);
          log(`连锁：${a.name}、${b.name}、${c.name}合体成${combined.name}，腾出了 2 个空格！`, "good");
          changed = true;
          break;
        }

        const pairRecipe = findPairRecipe(a, b);
        if (pairRecipe) {
          const combined = createRecipeItem(pairRecipe, [a, b]);
          state.slots[indexA] = null;
          state.slots[indexB] = combined;
          playSound(hasTag(combined, "Premium") ? "premium" : "merge");
          spawnSlotEffect(indexB, SPRITES.merge, "merge-burst");
          spawnFloatingText(hasTag(combined, "Premium") ? "PREMIUM" : "COMBO", indexB, "good");
          setConsumerMood("combo", hasTag(combined, "Premium") ? 1900 : 1700);
          onComboCreated(1);
          log(`连锁：${a.name}与${b.name}合体成${combined.name}，腾出了 1 个空格！`, "good");
          changed = true;
          break;
        }
      }
    }
  }

  function onComboCreated(freedSlots) {
    const relief = freedSlots * relicCount("artisan_hand");
    if (relief > 0) {
      setOverload(state.overload - relief);
      spawnStageFloatingText(`匠人手法 -${relief} 过载`, "good");
    }
    state.dailyComboCount += 1;
  }

  function applyPressure() {
    const totalWeight = state.slots.reduce((sum, item) => sum + (item ? item.weight : 0), 0);
    const trashWeight = state.slots.reduce((sum, item) => sum + (item && isTrash(item) ? item.weight : 0), 0);
    const occupiedSlots = state.slots.filter((item) => item !== null).length;
    const emptySlots = state.slots.filter((item) => item === null).length;
    const pressure =
      OVERLOAD_BALANCE.basePressure +
      totalWeight * OVERLOAD_BALANCE.weightPressure +
      occupiedSlots * OVERLOAD_BALANCE.occupiedSlotPressure +
      trashWeight * OVERLOAD_BALANCE.trashPressure;
    const relief =
      emptySlots * OVERLOAD_BALANCE.emptySlotRelief + (trashWeight === 0 ? OVERLOAD_BALANCE.noTrashRelief : 0);
    const netPressure = Math.max(0, pressure - relief);

    setOverload(state.overload + netPressure);
  }

  function feedCenter() {
    const item = state.slots[0];
    if (!item) return;

    if (isTrash(item)) {
      playSound("bad");
      spawnFeedAnimation(item, "bad");
      state.slots[0] = null;
      state.saturation = Math.max(0, state.saturation - 20);
      state.penaltyTicks = 3;
      setConsumerMood("angry", 1900);
      spawnSlotEffect(0, SPRITES.warning, "warning-pop");
      spawnFloatingText("卡住", 0, "bad");
      shakeStage();
      log(`大胃王被 ${item.name} 卡到了，后续 3 次食物分数减半。过载不额外累加。`, "bad");
      return;
    }

    if (isFood(item)) {
      spawnFeedAnimation(item, hasTag(item, "Combo") ? "combo" : "good");
      const plateMultiplier = state.plateMultipliers[0] ?? 1;
      state.slots[0] = null;
      let earned = item.score * plateMultiplier;
      if (state.penaltyTicks > 0) {
        earned = Math.floor(earned * 0.5);
        state.penaltyTicks -= 1;
      }
      state.gold += earned;
      playSound(hasTag(item, "Combo") ? "premium" : "feed");
      playSound("coin");
      state.saturation = Math.min(100, state.saturation + 12);
      const relief = hasTag(item, "Premium")
        ? OVERLOAD_BALANCE.premiumRelief
        : hasTag(item, "Combo")
          ? OVERLOAD_BALANCE.comboRelief
          : OVERLOAD_BALANCE.foodRelief;
      const happyStickerRelief = hasTag(item, "Combo") ? 3 * relicCount("happy_sticker") : 0;
      setOverload(state.overload - relief - happyStickerRelief);
      setConsumerMood(hasTag(item, "Combo") ? "combo" : "happy", hasTag(item, "Combo") ? 1700 : 1100);
      spawnSlotEffect(0, SPRITES.coin, "coin-pop");
      const vipTipCount = relicCount("vip_tip");
      const vipTipChance = Math.min(0.9, 0.3 + Math.max(0, vipTipCount - 1) * 0.15);
      const vipTipBonus = vipTipCount * 2;
      if (vipTipCount > 0 && Math.random() < vipTipChance) {
        state.gold += vipTipBonus;
        earned += vipTipBonus;
      log(`VIP 小费触发：额外金币 +${vipTipBonus}。`, "good");
    }
      spawnGoldRewardText(earned, 0, vipTipBonus > 0 ? `含小费 +${vipTipBonus}` : null);
      log(`大胃王吞下 ${item.name}，金币 +${earned}${plateMultiplier > 1 ? `（金色餐盘 x${plateMultiplier}）` : ""}，过载 -${relief + happyStickerRelief}。`, "good");
    }
  }

  function injectTrashForPreparation(day) {
    const baseCount = day > 5 ? 2 + Math.floor(Math.random() * 4) : 0;
    const count = Math.min(5, baseCount + relicCount("bone_growth"));
    const injectedSlots = [];
    for (let i = 0; i < count; i += 1) {
      const slotIndex = injectTrash();
      if (slotIndex !== null) injectedSlots.push(slotIndex);
    }

    return { count, injectedSlots };
  }

  function showTrashInjectionFeedback(day, injection) {
    const { count, injectedSlots } = injection;
    const injected = injectedSlots.length;
    if (count > 0) {
      if (injected > 0) {
        setHint(`警告：第 ${day} 天生成了 ${injected} 个鱼刺，请在整备阶段处理。`);
        spawnTrashInjectionNotice(injected, day);
        injectedSlots.forEach((slotIndex) => spawnTrashWarning(slotIndex));
      }
      log(`营业前准备：第 ${day} 天生成 ${injected}/${count} 个鱼骨。`, injected > 0 ? "bad" : undefined);
    }
  }

  function injectTrash() {
    const empty = state.slots.map((item, index) => (item ? -1 : index)).filter((index) => index >= 0);
    if (empty.length === 0) return null;
    const slot = empty[Math.floor(Math.random() * empty.length)];
    const trash = itemPool.find((item) => isTrash(item));
    state.slots[slot] = cloneItem(trash);
    return slot;
  }

  function slotPosition(slotIndex) {
    const angle = -90 + (slotIndex * 360) / SLOT_COUNT;
    const rad = (angle * Math.PI) / 180;
    return {
      x: SLOT_CENTER_X + Math.cos(rad) * SLOT_RING_RADIUS,
      y: SLOT_CENTER_Y + Math.sin(rad) * SLOT_RING_RADIUS,
    };
  }

  function spawnSlotEffect(slotIndex, src, className) {
    const pos = slotPosition(slotIndex);
    const effect = document.createElement("img");
    effect.className = `slot-effect ${className}`;
    effect.src = src;
    effect.alt = "";
    effect.style.left = `${pos.x}%`;
    effect.style.top = `${pos.y}%`;
    els.effectLayer.appendChild(effect);
    window.setTimeout(() => effect.remove(), 720);
  }

  function spawnFloatingText(text, slotIndex, tone) {
    const pos = slotPosition(slotIndex);
    const label = document.createElement("div");
    label.className = `floating-text ${tone === "bad" ? "bad-float" : "good-float"}`;
    label.textContent = text;
    label.style.left = `${pos.x}%`;
    label.style.top = `${pos.y}%`;
    els.effectLayer.appendChild(label);
    window.setTimeout(() => label.remove(), 900);
  }

  function spawnGoldRewardText(amount, slotIndex, caption) {
    const pos = slotPosition(slotIndex);
    const label = document.createElement("div");
    label.className = "gold-reward-text";
    label.innerHTML = `
      <span class="gold-reward-main">+${amount} 金币</span>
      ${caption ? `<span class="gold-reward-caption">${caption}</span>` : ""}
    `;
    label.style.left = `${pos.x}%`;
    label.style.top = `${pos.y}%`;
    els.effectLayer.appendChild(label);
    window.setTimeout(() => label.remove(), 1150);
  }

  function spawnTrashWarning(slotIndex) {
    const pos = slotPosition(slotIndex);
    const warning = document.createElement("div");
    warning.className = "trash-warning-marker";
    warning.innerHTML = `
      <img src="${SPRITES.warning}" alt="" />
      <span>鱼刺</span>
    `;
    warning.style.left = `${pos.x}%`;
    warning.style.top = `${pos.y}%`;
    els.effectLayer.appendChild(warning);
    window.setTimeout(() => warning.remove(), 3000);
  }

  function spawnTrashInjectionNotice(count, nextDay) {
    const notice = document.createElement("div");
    notice.className = "trash-injection-notice";
    notice.textContent = `警告：第 ${nextDay} 天新增 ${count} 个鱼刺`;
    els.effectLayer.appendChild(notice);
    window.setTimeout(() => notice.remove(), 3000);
  }

  function spawnFeedAnimation(item, tone) {
    const start = pointFromSlot(0);
    const end = consumerPointInEffectLayer();
    const flyer = document.createElement("img");
    flyer.className = `feed-flight feed-${tone}`;
    flyer.src = item.sprite;
    flyer.alt = "";
    flyer.style.left = `${start.x}px`;
    flyer.style.top = `${start.y}px`;
    flyer.style.setProperty("--feed-x", `${end.x - start.x}px`);
    flyer.style.setProperty("--feed-y", `${end.y - start.y}px`);
    flyer.style.setProperty("--feed-mid-x", `${(end.x - start.x) * 0.72}px`);
    flyer.style.setProperty("--feed-mid-y", `${(end.y - start.y) * 0.72}px`);
    els.effectLayer.appendChild(flyer);
    window.setTimeout(() => spawnBiteBurst(tone), 360);
    window.setTimeout(() => flyer.remove(), 620);
  }

  function pointFromSlot(slotIndex) {
    const pos = slotPosition(slotIndex);
    return {
      x: (pos.x / 100) * els.effectLayer.clientWidth,
      y: (pos.y / 100) * els.effectLayer.clientHeight,
    };
  }

  function consumerPointInEffectLayer() {
    const layerRect = els.effectLayer.getBoundingClientRect();
    const consumerRect = els.consumerPortrait.getBoundingClientRect();
    const scale = layerRect.width / els.effectLayer.clientWidth || 1;
    return {
      x: (consumerRect.left + consumerRect.width / 2 - layerRect.left) / scale,
      y: (consumerRect.top + consumerRect.height * 0.58 - layerRect.top) / scale,
    };
  }

  function spawnBiteBurst(tone) {
    const pos = consumerPointInEffectLayer();
    const burst = document.createElement("div");
    burst.className = `bite-burst bite-${tone === "bad" ? "bad" : "good"}`;
    burst.style.left = `${pos.x}px`;
    burst.style.top = `${pos.y}px`;
    els.effectLayer.appendChild(burst);
    window.setTimeout(() => burst.remove(), 420);
  }

  function spawnStageFloatingText(text, tone) {
    const label = document.createElement("div");
    label.className = `stage-floating-text ${tone === "bad" ? "bad-float" : "good-float"}`;
    label.textContent = text;
    els.effectLayer.appendChild(label);
    window.setTimeout(() => label.remove(), 1100);
  }

  function spawnPointerFloatingText(event, text, tone) {
    if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      spawnStageFloatingText(text, tone);
      return;
    }

    const label = document.createElement("div");
    label.className = `pointer-floating-text ${tone === "bad" ? "bad-float" : "good-float"}`;
    label.textContent = text;
    label.style.left = `${event.clientX}px`;
    label.style.top = `${event.clientY}px`;
    document.body.appendChild(label);
    window.setTimeout(() => label.remove(), 1100);
  }

  function spawnHudGoldChange(delta) {
    if (delta === 0) return;

    const rect = els.goldText.getBoundingClientRect();
    const label = document.createElement("div");
    const isGain = delta > 0;
    label.className = `hud-gold-change ${isGain ? "gold-gain" : "gold-loss"}`;
    label.textContent = `${isGain ? "+" : ""}${delta} 金币`;
    label.style.left = `${rect.left + rect.width / 2}px`;
    label.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(label);
    pulseHudGold();
    window.setTimeout(() => label.remove(), 1100);
  }

  function pulseHudGold() {
    const target = els.goldText.parentElement;
    target.classList.remove("hud-gold-pulse");
    void target.offsetWidth;
    target.classList.add("hud-gold-pulse");
  }

  function pulseBelt() {
    els.belt.classList.remove("orbit-step");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        els.belt.classList.add("orbit-step");
      });
    });
  }

  function shakeStage() {
    els.stage.classList.remove("stage-shake");
    void els.stage.offsetWidth;
    els.stage.classList.add("stage-shake");
  }

  function printSummary() {
    state.lastPiggyRescue = 0;
    const produced = state.gold - state.goldAtBusinessStart;
    let advanced = state.gold >= state.targetGold && state.overload < MAX_OVERLOAD;
    if (!advanced) {
      advanced = tryBreakPiggyBank();
    }
    const failureReason = advanced ? "" : getFailureReason();
    state.lastResult = { advanced, produced, piggyRescue: state.lastPiggyRescue ?? 0, failureReason };
    log(`营业总结：当前金币 ${state.gold}/${state.targetGold}，本日 +${produced}，过载 ${state.overload.toFixed(1)}%。`);
    if (advanced) {
      playSound("success");
      depositPiggyBank();
      state.pendingRewardChoices = drawRelicChoices(2);
      state.rewardResolved = state.pendingRewardChoices.length === 0;
      log(
        state.rewardResolved ? "达标晋级！道具已全部收集，点击新一天继续。" : "达标晋级！请选择 1 个道具奖励。",
        "good"
      );
    } else {
      playSound("fail");
      state.pendingRewardChoices = [];
      state.rewardResolved = true;
      log(`餐厅倒闭：${failureReason}。最终坚持到第 ${state.currentDay} 天。`, "bad");
    }
  }

  function getFailureReason() {
    const goldShortfall = Math.max(0, state.targetGold - state.gold);
    const isGoldFailed = goldShortfall > 0;
    const isOverloaded = state.overload >= MAX_OVERLOAD;

    if (isGoldFailed && isOverloaded) {
      return `金币不足 ${goldShortfall}，且传送带过载`;
    }

    if (isGoldFailed) {
      return `金币不足 ${goldShortfall}`;
    }

    if (isOverloaded) {
      return "传送带过载";
    }

    return "未达成营业条件";
  }

  function depositPiggyBank() {
    const count = relicCount("piggy_bank");
    if (count === 0) return;

    const deposit = 2 * count;
    state.piggyBankGold += deposit;
    log(`存钱罐存入 ${deposit} 金币，当前存款 ${state.piggyBankGold}。`, "good");
  }

  function tryBreakPiggyBank() {
    const canRescue =
      hasRelic("piggy_bank") &&
      state.piggyBankGold > 0 &&
      state.gold < state.targetGold &&
      state.overload < MAX_OVERLOAD;
    if (!canRescue) return false;

    const payout = state.piggyBankGold * 5;
    state.gold += payout;
    state.lastPiggyRescue = payout;
    log(`存钱罐打碎：返还 ${payout} 金币。`, "good");
    spawnHudGoldChange(payout);
    state.piggyBankGold = 0;
    return state.gold >= state.targetGold && state.overload < MAX_OVERLOAD;
  }

  function drawRelicChoices(count) {
    const candidates = [...RELIC_POOL];
    const choices = [];

    while (choices.length < count && candidates.length > 0) {
      const index = Math.floor(Math.random() * candidates.length);
      choices.push(candidates.splice(index, 1)[0]);
    }

    return choices;
  }

  function chooseRelic(relicId) {
    if (state.phase !== "Finished" || !state.lastResult?.advanced || state.rewardResolved) return;
    const relic = state.pendingRewardChoices.find((candidate) => candidate.id === relicId);
    if (!relic) return;

    state.playerRelics.push(relic);
    state.pendingRewardChoices = [];
    state.rewardResolved = true;
    playSound("premium");
    const count = relicCount(relic.id);
    log(`获得道具：${relic.name}${count > 1 ? ` x${count}` : ""}。${relic.description}`, "good");
    setHint(`获得道具：${relic.name}${count > 1 ? ` x${count}` : ""}。现在可以点击“新一天”。`);
    render();
  }

  function useActiveRelic(relicId) {
    if (state.phase !== "Preparation") {
      setHint("主动道具只能在营业前准备阶段使用。");
      return;
    }

    if (relicId === "cleaning_coupon") {
      const cleared = clearTrashSlots();
      if (cleared === 0) {
        setHint("当前盘面没有鱼骨，清洁券暂时不用。");
        return;
      }
      consumeRelic(relicId);
      playSound("crush");
      setHint(`清洁券清除了 ${cleared} 个鱼骨。`);
      log(`使用清洁券：清除 ${cleared} 个鱼骨。`, "good");
      render();
      return;
    }

    if (relicId === "tweezers") {
      state.activeRelicId = state.activeRelicId === relicId ? null : relicId;
      state.selectedInventory = null;
      state.selectedSlot = null;
      setHint(state.activeRelicId ? "镊子已准备：点击一个鱼骨将其移除。" : "已取消使用镊子。");
      render();
      return;
    }

    if (relicId === "golden_plate_upgrade") {
      state.activeRelicId = state.activeRelicId === relicId ? null : relicId;
      state.selectedInventory = null;
      state.selectedSlot = null;
      setHint(state.activeRelicId ? "金色餐盘券已准备：点击一个餐盘升级，食物投喂金币翻倍。" : "已取消使用金色餐盘券。");
      render();
    }
  }

  function useActiveRelicOnSlot(relicId, slotIndex) {
    const item = state.slots[slotIndex];
    if (relicId === "golden_plate_upgrade") {
      if ((state.plateMultipliers[slotIndex] ?? 1) > 1) {
        setHint("这个餐盘已经是金色餐盘。");
        return;
      }

      state.plateMultipliers[slotIndex] = 2;
      state.activeRelicId = null;
      consumeRelic(relicId);
      playSound("premium");
      spawnSlotEffect(slotIndex, SPRITES.goldenPlate, "place-pop");
      setHint(`Slot[${slotIndex}] 已升级为金色餐盘：上面的食物投喂金币 x2。`);
      log(`使用金色餐盘券：Slot[${slotIndex}] 升级为金色餐盘。`, "good");
      render();
      return;
    }

    if (relicId !== "tweezers") return;

    if (!item || !isTrash(item)) {
      setHint("镊子只能移除鱼骨。");
      return;
    }

    state.slots[slotIndex] = null;
    state.activeRelicId = null;
    consumeRelic(relicId);
    playSound("crush");
    spawnSlotEffect(slotIndex, SPRITES.smoke, "smoke-pop");
    setHint(`镊子移除了 Slot[${slotIndex}] 的鱼骨。`);
    log(`使用镊子：移除 Slot[${slotIndex}] 的 ${item.name}。`, "good");
    render();
  }

  function clearTrashSlots() {
    let cleared = 0;
    state.slots = state.slots.map((item, index) => {
      if (item && isTrash(item)) {
        cleared += 1;
        spawnSlotEffect(index, SPRITES.smoke, "smoke-pop");
        return null;
      }
      return item;
    });
    return cleared;
  }

  function consumeRelic(relicId) {
    const index = state.playerRelics.findIndex((relic) => relic.id === relicId);
    if (index >= 0) {
      state.playerRelics.splice(index, 1);
    }
  }

  function skipRelicReward() {
    if (state.phase !== "Finished" || !state.lastResult?.advanced || state.rewardResolved) return;
    state.pendingRewardChoices = [];
    state.rewardResolved = true;
    playSound("place");
    log("跳过本次道具奖励。");
    setHint("已跳过奖励。现在可以点击“新一天”。");
    render();
  }

  els.refreshBtn.addEventListener("click", (event) => refreshShop(false, event));
  els.startDayBtn.addEventListener("click", () => {
    playSound("start");
    startNewDay();
  });
  els.confirmBtn.addEventListener("click", confirmLayout);
  els.quickRetryBtn.addEventListener("click", restartGame);
  els.resultNextDayBtn.addEventListener("click", () => {
    playSound("start");
    startNewDay();
  });
  els.retryBtn.addEventListener("click", restartGame);
  els.skipRewardBtn.addEventListener("click", skipRelicReward);
  els.tutorialBtn.addEventListener("click", () => showTutorial(true));
  els.tutorialDoneBtn.addEventListener("click", () => {
    playSound("place");
    closeTutorial();
  });
  window.addEventListener("resize", updateGameScale);
  window.visualViewport?.addEventListener("resize", updateGameScale);
  els.comboGuide.addEventListener("mouseover", (event) => {
    const line = event.target.closest(".combo-line[data-tooltip-title]");
    if (!line || !els.comboGuide.contains(line)) return;
    showItemTooltip(comboTooltipHtml(line), event);
  });
  els.comboGuide.addEventListener("mousemove", (event) => {
    const line = event.target.closest(".combo-line[data-tooltip-title]");
    if (!line || !els.comboGuide.contains(line)) return;
    moveItemTooltip(event);
  });
  els.comboGuide.addEventListener("mouseout", (event) => {
    const line = event.target.closest(".combo-line[data-tooltip-title]");
    if (!line || line.contains(event.relatedTarget)) return;
    hideItemTooltip();
  });
  els.comboGuide.addEventListener("focusin", (event) => {
    const line = event.target.closest(".combo-line[data-tooltip-title]");
    if (!line) return;
    showItemTooltip(comboTooltipHtml(line), event);
  });
  els.comboGuide.addEventListener("focusout", hideItemTooltip);
  document.addEventListener("pointerdown", startBackgroundMusic, { once: true });
  document.addEventListener("keydown", startBackgroundMusic, { once: true });

  updateGameScale();
  startNewDay();
  showTutorial();
})();

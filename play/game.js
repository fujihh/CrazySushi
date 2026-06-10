(function () {
  const SLOT_COUNT = 12;
  const MAX_OVERLOAD = 100;
  const OVERLOAD_BALANCE = {
    basePressure: 0.75,
    weightPressure: 0.38,
    occupiedSlotPressure: 0.15,
    trashPressure: 0.9,
    emptySlotRelief: 0.08,
    noTrashRelief: 0.2,
    foodRelief: 2.5,
    comboRelief: 5,
    premiumRelief: 7,
    crusherRelief: 10,
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
    smoke: `${ASSET}elimination_smoke_6b788849-65b4-44a5-927f-f48002a7c763.webp`,
    merge: `${ASSET}merge_effect_0cd01ceb-9705-483e-b0ee-5d79be781176.webp`,
    coin: `${ASSET}gold_coin_f75a03fe-f4b0-49e5-ad8c-a309fe82376e.webp`,
    warning: `${ASSET}overload_warning_icon_a4114af1-d62f-4b2b-b682-6ba81a83549b.webp`,
    consumerHappy: "../assets/generated/consumer-happy.png",
    consumerCombo: "../assets/generated/consumer-combo.png",
    consumerAngry: "../assets/generated/consumer-angry.png",
  };
  const RELIC_ASSET = "../assets/generated/relics/";

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
      id: "free_refresh",
      name: "免费刷新券",
      rarity: "Common",
      type: "Passive",
      icon: `${RELIC_ASSET}free_refresh.png`,
      description: "每天首次手动刷新商店免费。",
    },
  ];

  // Daily balance table. targetGold is cumulative current Gold, not daily revenue.
  const MIN_DAY_TICKS = SLOT_COUNT;
  const DAY_CONFIGS = {
    1: { ticks: 12, targetGold: 22, startingTrash: 0 },
    2: { ticks: 12, targetGold: 34, startingTrash: 0 },
    3: { ticks: 12, targetGold: 50, startingTrash: 1 },
    4: { ticks: 12, targetGold: 70, startingTrash: 1 },
    5: { ticks: 12, targetGold: 95, startingTrash: 2 },
  };

  const state = {
    phase: "Finished",
    currentDay: 0,
    currentTick: 0,
    totalTicks: 0,
    targetGold: DAY_CONFIGS[1].targetGold,
    gold: 16,
    goldAtBusinessStart: 0,
    overload: 0,
    saturation: 50,
    penaltyTicks: 0,
    refreshCost: 1,
    refreshCount: 0,
    slots: Array(SLOT_COUNT).fill(null),
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
    shopPanel: document.getElementById("shopPanel"),
    shopList: document.getElementById("shopList"),
    inventoryList: document.getElementById("inventoryList"),
    refreshBtn: document.getElementById("refreshBtn"),
    startDayBtn: document.getElementById("startDayBtn"),
    confirmBtn: document.getElementById("confirmBtn"),
    clearSelectBtn: document.getElementById("clearSelectBtn"),
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
    relicList: document.getElementById("relicList"),
    itemTooltip: document.getElementById("itemTooltip"),
    comboGuide: document.querySelector(".combo-guide"),
  };

  function cloneItem(template) {
    return { ...template, tags: [...template.tags], uid: `${template.id}_${state.nextId++}` };
  }

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

  function wrapSlotIndex(index) {
    return (index + SLOT_COUNT) % SLOT_COUNT;
  }

  function adjacentSlotIndices(index) {
    return [wrapSlotIndex(index - 1), wrapSlotIndex(index + 1)];
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
    if (relicCount("free_refresh") > state.refreshCount) return 0;
    return REFRESH_COSTS[Math.min(state.refreshCount, REFRESH_COSTS.length - 1)];
  }

  function shopWeight(item) {
    if (item.id === "bone") return state.currentDay < 3 ? 0 : 1;
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

    const left = state.slots[slotIndex - 1] ?? null;
    const right = state.slots[slotIndex + 1] ?? null;
    const twoLeft = state.slots[slotIndex - 2] ?? null;
    const twoRight = state.slots[slotIndex + 2] ?? null;
    const circularLeft = state.slots[wrapSlotIndex(slotIndex - 1)] ?? null;
    const circularRight = state.slots[wrapSlotIndex(slotIndex + 1)] ?? null;

    return (
      findTripleRecipe(twoLeft, left, item) ||
      findTripleRecipe(left, item, right) ||
      findTripleRecipe(item, right, twoRight) ||
      findEffectRecipe(circularLeft, item) ||
      findEffectRecipe(item, circularRight) ||
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
    const totalScore = sourceItems.reduce((sum, item) => sum + item.score, 0) + noriBonus;
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
    const growth = Math.max(0, day - 5);
    const configuredDay = DAY_CONFIGS[day];

    if (configuredDay) {
      return normalizeDayGoal(configuredDay);
    }

    return normalizeDayGoal({
      targetGold: DAY_CONFIGS[5].targetGold + growth * 28,
      ticks: DAY_CONFIGS[5].ticks,
      startingTrash: Math.min(5, DAY_CONFIGS[5].startingTrash + Math.floor(growth / 2) + 1),
    });
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

    const canPrepare = state.phase === "Preparation";
    const hasAffordableShopItem = canPrepare && state.shop.some((item) => state.gold >= item.cost);
    els.shopPanel.classList.toggle("shop-affordable", hasAffordableShopItem);
    const refreshCost = currentRefreshCost();
    els.refreshBtn.textContent = refreshCost > 0 ? `刷新 ${priceText(refreshCost)}` : "刷新 免费";
    els.refreshBtn.disabled = !canPrepare;
    els.confirmBtn.disabled = !canPrepare;
    const canStartNextDay = state.phase === "Finished" && state.lastResult?.advanced && state.rewardResolved;
    els.startDayBtn.disabled = !canStartNextDay;
    els.startDayBtn.classList.toggle("next-day-prompt", canStartNextDay);
    updateActionHint();
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
          ? `金币 ${state.gold}/${state.targetGold} · 本日 +${state.lastResult.produced} · 过载 ${state.overload.toFixed(1)}%`
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
    if (state.lastResult.advanced && !state.rewardResolved) {
      els.resultDetail.textContent = `达成目标：金币 ${state.gold}/${state.targetGold}，本日 +${state.lastResult.produced}。选择 1 个道具，或跳过。`;
    } else {
      els.resultDetail.textContent = state.lastResult.advanced
        ? `达成目标：金币 ${state.gold}/${state.targetGold}，本日 +${state.lastResult.produced}，过载 ${state.overload.toFixed(1)}%。点击“新一天”继续。`
        : `未达成目标：金币 ${state.gold}/${state.targetGold}，本日 +${state.lastResult.produced}，过载 ${state.overload.toFixed(1)}%。餐厅倒闭。`;
    }
    renderRewardChoices();
    els.resultNextDayBtn.hidden = !(state.lastResult.advanced && state.rewardResolved);
    els.retryBtn.hidden = state.lastResult.advanced;
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
      relicEl.className = `owned-relic${relic.type === "Active" ? " active-relic" : ""}${state.activeRelicId === relic.id ? " selected" : ""}`;
      relicEl.title = relic.description;
      relicEl.innerHTML = `
        <img src="${relic.icon}" alt="${relic.name}" />
        <span>
          <strong>${relic.name}${relic.count > 1 ? ` x${relic.count}` : ""}</strong>
          <small>${relic.description}</small>
        </span>
      `;
      if (relic.type === "Active") {
        relicEl.addEventListener("click", () => useActiveRelic(relic.id));
      }
      els.relicList.appendChild(relicEl);
    });
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
    els.belt.innerHTML = "";
    const center = 50;
    const radius = 39;

    state.slots.forEach((item, index) => {
      const comboPreview = selectedPlacementPreview(index);
      const angle = -90 + (index * 360) / SLOT_COUNT;
      const rad = (angle * Math.PI) / 180;
      const x = center + Math.cos(rad) * radius;
      const y = center + Math.sin(rad) * radius;
      const slot = document.createElement("button");
      slot.className = `slot${item ? " occupied" : ""}${index === 0 ? " feed" : ""}${state.selectedSlot === index ? " selected" : ""}${comboPreview ? " combo-target" : ""}`;
      slot.dataset.slotIndex = String(index);
      slot.style.left = `${x}%`;
      slot.style.top = `${y}%`;
      slot.title = comboPreview ? `Slot ${index}：可生成 ${comboPreview.name}` : `Slot ${index}`;
      slot.innerHTML = `
        <img class="plate-img" src="${SPRITES.plate}" alt="" draggable="false" />
        ${item ? `<img class="slot-item-img" src="${item.sprite}" alt="${item.name}" draggable="false" />` : `<div class="slot-empty-dot">·</div>`}
        <div class="slot-name">${item ? item.name : `Slot ${index}`}</div>
        ${comboPreview ? `<div class="combo-preview">${comboPreview.previewLabel ?? `可出 ${comboPreview.name}`}</div>` : ""}
      `;
      slot.addEventListener("click", (event) => {
        if (state.suppressSlotClick) {
          event.preventDefault();
          event.stopPropagation();
          state.suppressSlotClick = false;
          return;
        }
        onSlotClick(index);
      });
      slot.addEventListener("pointerdown", (event) => onSlotPointerDown(event, index));
      slot.addEventListener("dragstart", (event) => event.preventDefault());
      slot.addEventListener("dragover", (event) => onSlotDragOver(event, index));
      slot.addEventListener("dragleave", () => slot.classList.remove("drop-target"));
      slot.addEventListener("drop", (event) => onSlotDrop(event, index));
      if (item) {
        slot.dataset.tooltipHtml = itemDetailHtml(item);
        slot.addEventListener("mouseenter", (event) => showItemTooltip(slot.dataset.tooltipHtml, event));
        slot.addEventListener("mousemove", (event) => moveItemTooltip(event));
        slot.addEventListener("mouseleave", hideItemTooltip);
        slot.addEventListener("focus", (event) => showItemTooltip(slot.dataset.tooltipHtml, event));
        slot.addEventListener("blur", hideItemTooltip);
      }
      els.belt.appendChild(slot);
    });
  }

  function renderShop() {
    els.shopList.innerHTML = "";
    state.shop.forEach((item, index) => {
      const card = createItemCard(item, priceText(item.cost), (event) => buyItem(index, event));
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
    return item.cost ? `${item.cost} 金币` : "";
  }

  function priceText(amount) {
    return `${amount} 金币`;
  }

  function itemScoreText(item) {
    if (isTrash(item)) return `投喂 0G；粉碎 +${2 + relicCount("crusher_upgrade") * 2}G`;
    if (isCrusher(item)) return `粉碎相邻鱼骨 +${2 + relicCount("crusher_upgrade") * 2}G`;
    return `投喂 +${item.score}G`;
  }

  function itemOverloadText(item) {
    if (isTrash(item)) return "盘面高压；被吃到触发惩罚";
    if (isCrusher(item)) return `自身有重量压力；粉碎鱼骨 -${OVERLOAD_BALANCE.crusherRelief}`;
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
    state.phase = "Preparation";
    state.lastResult = null;
    state.pendingRewardChoices = [];
    state.rewardResolved = true;
    state.selectedInventory = null;
    state.selectedSlot = null;
    state.activeRelicId = null;
    log(`第 ${state.currentDay} 天开始整备。目标金币 ${state.targetGold}。`, "good");
    refreshShop(true);
    render();
  }

  function restartGame() {
    if (state.phase !== "Finished" || state.lastResult?.advanced) return;

    state.currentDay = 0;
    state.currentTick = 0;
    state.totalTicks = 0;
    state.targetGold = dayGoal(1).targetGold;
    state.gold = 16;
    state.goldAtBusinessStart = 0;
    state.phase = "Preparation";
    state.lastResult = null;
    state.overload = 0;
    state.saturation = 50;
    state.penaltyTicks = 0;
    state.consumerMood = "happy";
    state.slots = Array(SLOT_COUNT).fill(null);
    state.inventory = [];
    state.shop = [];
    state.playerRelics = [];
    state.pendingRewardChoices = [];
    state.rewardResolved = true;
    state.selectedInventory = null;
    state.selectedSlot = null;
    state.activeRelicId = null;
    state.refreshCount = 0;

    log("重新开始游戏。回到第 1 天营业前准备。", "good");
    startNewDay();
  }

  function refreshShop(isFree, event) {
    if (state.phase !== "Preparation") return;
    if (!isFree) {
      const cost = currentRefreshCost();
      if (state.gold < cost) {
        spawnPointerFloatingText(event, `金币不足：需要 ${cost} 金币`, "bad");
        setHint(`金币不足，刷新需要 ${cost} 金币。`);
        log("金币不足，不能刷新。", "bad");
        return;
      }
      state.gold -= cost;
      state.refreshCount += 1;
    }
    state.shop = drawWeightedShop(3);
    log(`商店刷新：${state.shop.map((item) => item.name).join("、")}`);
    render();
  }

  function buyItem(shopIndex, event) {
    if (state.phase !== "Preparation") return;
    const item = state.shop[shopIndex];
    if (!item) return;
    if (state.gold < item.cost) {
      spawnPointerFloatingText(event, `金币不足：差 ${item.cost - state.gold} 金币`, "bad");
      setHint(`金币不足，购买 ${item.name} 需要 ${item.cost} 金币。`);
      log(`金币不足，买不起 ${item.name}。`, "bad");
      return;
    }
    state.gold -= item.cost;
    state.shop.splice(shopIndex, 1);
    state.inventory.push(cloneItem(item));
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
      log(`Slot[${slotIndex}] 已被占用。`, "bad");
      return false;
    }

    const [placedItem] = state.inventory.splice(inventoryIndex, 1);
    state.slots[slotIndex] = placedItem;
    state.selectedInventory = null;
    state.selectedSlot = null;
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
    setHint(`营业开始：传送带自动转动，等待 ${goal.ticks} 轮结算。`);
    log(`开始营业：自动运行 ${goal.ticks} 轮。`, "good");
    let tick = 0;
    state.runningTimer = window.setInterval(() => {
      tick += 1;
      state.currentTick = tick;
      rotateBelt();
      if (tick >= goal.ticks || state.overload >= MAX_OVERLOAD) {
        window.clearInterval(state.runningTimer);
        state.runningTimer = null;
        state.phase = "Finished";
        printSummary();
      }
      render();
    }, 650);
    render();
  }

  function rotateBelt() {
    hideItemTooltip();
    pulseBelt();
    const last = state.slots[SLOT_COUNT - 1];
    for (let i = SLOT_COUNT - 1; i > 0; i -= 1) {
      state.slots[i] = state.slots[i - 1];
    }
    state.slots[0] = last;
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

        const trashSlots = adjacentSlotIndices(i).filter((slotIndex) => {
          const neighbor = state.slots[slotIndex];
          return neighbor && isTrash(neighbor);
        });

        if (trashSlots.length === 0) continue;

        const crushGold = 2 + relicCount("crusher_upgrade") * 2;
        trashSlots.forEach((slotIndex) => {
          const trash = state.slots[slotIndex];
          state.slots[slotIndex] = null;
          spawnSlotEffect(slotIndex, SPRITES.smoke, "smoke-pop");
          spawnFloatingText(`+${crushGold}G`, slotIndex, "good");
          log(`连锁：厨余粉碎机粉碎了相邻的 ${trash.name}。`, "good");
        });

        state.gold += trashSlots.length * crushGold;
        setOverload(state.overload - OVERLOAD_BALANCE.crusherRelief * trashSlots.length);
        log(
          `连锁：粉碎机清理 ${trashSlots.length} 个鱼骨，金币 +${trashSlots.length * crushGold}，过载 -${OVERLOAD_BALANCE.crusherRelief * trashSlots.length}。`,
          "good"
        );
        changed = true;
        break;
      }

      if (changed) continue;

      for (let i = 0; i < SLOT_COUNT - 1; i += 1) {
        const a = state.slots[i];
        const b = state.slots[i + 1];
        const c = state.slots[i + 2];
        const tripleRecipe = i < SLOT_COUNT - 2 ? findTripleRecipe(a, b, c) : null;

        if (tripleRecipe) {
          const combined = createRecipeItem(tripleRecipe, [a, b, c]);
          state.slots[i] = combined;
          state.slots[i + 1] = null;
          state.slots[i + 2] = null;
          spawnSlotEffect(i, SPRITES.merge, "merge-burst");
          spawnFloatingText("PREMIUM", i, "good");
          setConsumerMood("combo", 1900);
          log(`连锁：${a.name}、${b.name}、${c.name}合体成${combined.name}，腾出了 2 个空格！`, "good");
          changed = true;
          break;
        }

        const pairRecipe = findPairRecipe(a, b);
        if (pairRecipe) {
          const combined = createRecipeItem(pairRecipe, [a, b]);
          state.slots[i] = combined;
          state.slots[i + 1] = null;
          spawnSlotEffect(i, SPRITES.merge, "merge-burst");
          spawnFloatingText(hasTag(combined, "Premium") ? "PREMIUM" : "COMBO", i, "good");
          setConsumerMood("combo", hasTag(combined, "Premium") ? 1900 : 1700);
          log(`连锁：${a.name}与${b.name}合体成${combined.name}，腾出了 1 个空格！`, "good");
          changed = true;
          break;
        }
      }
    }
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
      state.slots[0] = null;
      let earned = item.score;
      if (state.penaltyTicks > 0) {
        earned = Math.floor(earned * 0.5);
        state.penaltyTicks -= 1;
      }
      state.gold += earned;
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
      spawnFloatingText(`+${earned}G`, 0, "good");
      const vipTipCount = relicCount("vip_tip");
      const vipTipChance = Math.min(0.9, 0.3 + Math.max(0, vipTipCount - 1) * 0.15);
      const vipTipBonus = vipTipCount * 2;
      if (vipTipCount > 0 && Math.random() < vipTipChance) {
        state.gold += vipTipBonus;
        earned += vipTipBonus;
        spawnFloatingText(`+${vipTipBonus} 小费`, 0, "good");
      log(`VIP 小费触发：额外金币 +${vipTipBonus}。`, "good");
    }
      log(`大胃王吞下 ${item.name}，金币 +${earned}，过载 -${relief + happyStickerRelief}。`, "good");
    }
  }

  function injectTrashAfterBusiness(nextDay) {
    const count = dayGoal(nextDay).startingTrash;
    const injectedSlots = [];
    for (let i = 0; i < count; i += 1) {
      const slotIndex = injectTrash();
      if (slotIndex !== null) injectedSlots.push(slotIndex);
    }
    const injected = injectedSlots.length;
    if (count > 0) {
      if (injected > 0) {
        setHint(`警告：为第 ${nextDay} 天生成了 ${injected} 个鱼刺，请在整备阶段处理。`);
        spawnTrashInjectionNotice(injected, nextDay);
        injectedSlots.forEach((slotIndex) => spawnTrashWarning(slotIndex));
      }
      log(`旋转结束：为第 ${nextDay} 天生成 ${injected}/${count} 个鱼骨。`, injected > 0 ? "bad" : undefined);
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
    const center = 50;
    const radius = 39;
    const angle = -90 + (slotIndex * 360) / SLOT_COUNT;
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + Math.cos(rad) * radius,
      y: center + Math.sin(rad) * radius,
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
    const rect = els.effectLayer.getBoundingClientRect();
    return {
      x: (pos.x / 100) * rect.width,
      y: (pos.y / 100) * rect.height,
    };
  }

  function consumerPointInEffectLayer() {
    const layerRect = els.effectLayer.getBoundingClientRect();
    const consumerRect = els.consumerPortrait.getBoundingClientRect();
    return {
      x: consumerRect.left + consumerRect.width / 2 - layerRect.left,
      y: consumerRect.top + consumerRect.height * 0.58 - layerRect.top,
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
    els.conveyorBase.classList.remove("belt-step");
    void els.conveyorBase.offsetWidth;
    els.conveyorBase.classList.add("belt-step");
  }

  function shakeStage() {
    els.belt.classList.remove("stage-shake");
    void els.belt.offsetWidth;
    els.belt.classList.add("stage-shake");
  }

  function printSummary() {
    const produced = state.gold - state.goldAtBusinessStart;
    const advanced = state.gold >= state.targetGold && state.overload < MAX_OVERLOAD;
    state.lastResult = { advanced, produced };
    log(`营业总结：当前金币 ${state.gold}/${state.targetGold}，本日 +${produced}，过载 ${state.overload.toFixed(1)}%。`);
    if (advanced) {
      state.pendingRewardChoices = drawRelicChoices(2);
      state.rewardResolved = state.pendingRewardChoices.length === 0;
      log(
        state.rewardResolved ? "达标晋级！道具已全部收集，点击新一天继续。" : "达标晋级！请选择 1 个道具奖励。",
        "good"
      );
      injectTrashAfterBusiness(state.currentDay + 1);
    } else {
      state.pendingRewardChoices = [];
      state.rewardResolved = true;
      log(`餐厅倒闭！最终坚持到第 ${state.currentDay} 天。`, "bad");
    }
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
    }
  }

  function useActiveRelicOnSlot(relicId, slotIndex) {
    const item = state.slots[slotIndex];
    if (relicId !== "tweezers") return;

    if (!item || !isTrash(item)) {
      setHint("镊子只能移除鱼骨。");
      return;
    }

    state.slots[slotIndex] = null;
    state.activeRelicId = null;
    consumeRelic(relicId);
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
    log("跳过本次道具奖励。");
    setHint("已跳过奖励。现在可以点击“新一天”。");
    render();
  }

  els.refreshBtn.addEventListener("click", (event) => refreshShop(false, event));
  els.startDayBtn.addEventListener("click", startNewDay);
  els.confirmBtn.addEventListener("click", confirmLayout);
  els.resultNextDayBtn.addEventListener("click", startNewDay);
  els.retryBtn.addEventListener("click", restartGame);
  els.skipRewardBtn.addEventListener("click", skipRelicReward);
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
  els.clearSelectBtn.addEventListener("click", () => {
    state.selectedInventory = null;
    state.selectedSlot = null;
    state.activeRelicId = null;
    render();
  });

  startNewDay();
})();

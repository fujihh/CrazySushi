"use strict";
/**
 * Core logic layer for a roguelike strategy builder where a circular conveyor
 * feeds items into a central consumer.
 *
 * This file intentionally contains no rendering code. Art paths are stored in
 * configuration objects so the visual layer can bind sprites independently.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SampleItems = exports.HotpotCuisineConfig = exports.SushiCuisineConfig = exports.ItemPool = exports.CuisineSwapNameMap = exports.DefaultCombineRules = exports.CircularFeastBoard = exports.LevelManager = exports.Item = exports.CuisineConfig = void 0;
exports.ReplaceItemPoolByName = ReplaceItemPoolByName;
/**
 * CuisineConfig is the stage theme dictionary.
 *
 * Swapping this config changes the food sprites, trash sprites, and central
 * consumer sprite without changing board logic.
 */
class CuisineConfig {
    constructor(params) {
        this.ThemeName = params.ThemeName;
        this.FoodSprites = params.FoodSprites;
        this.TrashSprites = params.TrashSprites;
        this.ConsumerSprite = params.ConsumerSprite;
        this.StageBackgroundSprite = params.StageBackgroundSprite;
    }
}
exports.CuisineConfig = CuisineConfig;
/**
 * Item is the lowest-level entity that can be placed on the conveyor.
 */
class Item {
    constructor(params) {
        this.ID = params.ID;
        this.Name = params.Name;
        this.Tags = [...params.Tags];
        this.Score = Math.trunc(params.Score);
        this.Weight = params.Weight;
        this.Cost = Math.max(0, Math.trunc(params.Cost ?? 1));
    }
    HasTag(tag) {
        return this.Tags.includes(tag);
    }
    IsFood() {
        return this.HasTag("Raw") || this.HasTag("Flux") || this.HasTag("Food");
    }
    IsTrash() {
        return this.HasTag("Trash");
    }
    Clone(newID) {
        return new Item({
            ID: newID,
            Name: this.Name,
            Tags: this.Tags,
            Score: this.Score,
            Weight: this.Weight,
            Cost: this.Cost,
        });
    }
}
exports.Item = Item;
/**
 * LevelManager owns day-by-day target and pressure curves.
 */
class LevelManager {
    GetDayGoal(day) {
        const dayIndex = Math.max(1, day);
        const growthStep = dayIndex - 1;
        return {
            Day: dayIndex,
            TargetGold: 20 + 30 * growthStep + 5 * growthStep * Math.max(0, growthStep - 1),
            StartingTrashCount: Math.min(8, 1 + Math.floor(dayIndex / 2)),
            TrashInjectionIntervalTicks: Math.max(4, 13 - dayIndex * 2),
        };
    }
}
exports.LevelManager = LevelManager;
/**
 * Scene-level manager for board state, economy, overload, and stage theme.
 */
class CircularFeastBoard {
    constructor(combineRules = exports.DefaultCombineRules, levelManager = new LevelManager()) {
        this.Slots = new Array(CircularFeastBoard.SlotCount).fill(null);
        this.CombineRules = [...combineRules];
        this.LevelManager = levelManager;
        this.PlayerInventory = [];
        this.ActiveItemPool = exports.ItemPool.map((item) => item.Clone(item.ID));
        this.ShopItems = [];
        this.Gold = 0;
        this.GoldAtDayStart = 0;
        this.GoldAtBusinessStart = 0;
        this.OverloadGauge = 0.0;
        this.Saturation = CircularFeastBoard.BaseSaturation;
        this.ScorePenaltyTicksRemaining = 0;
        this.CurrentDay = 0;
        this.TargetGold = this.LevelManager.GetDayGoal(1).TargetGold;
        this.RefreshCost = 1;
        this.RefreshCount = 0;
        this.Phase = "Finished";
        this.CurrentCuisineConfig = null;
        this.NextItemInstanceID = 1;
    }
    /**
     * Initializes stage theme data and resets the conveyor belt.
     */
    InitStage(config, options = {}) {
        const shouldResetProgress = options.ResetProgress ?? true;
        this.CurrentCuisineConfig = config;
        if (shouldResetProgress) {
            this.ClearBelt();
            this.PlayerInventory.length = 0;
            this.ActiveItemPool = exports.ItemPool.map((item) => item.Clone(item.ID));
            this.ShopItems = [];
            this.CurrentDay = 0;
            this.TargetGold = this.LevelManager.GetDayGoal(1).TargetGold;
            this.RefreshCount = 0;
            this.Phase = "Finished";
            this.GoldAtDayStart = this.Gold;
            this.GoldAtBusinessStart = this.Gold;
            this.Saturation = CircularFeastBoard.BaseSaturation;
            this.ScorePenaltyTicksRemaining = 0;
        }
        console.log(`[Stage] 初始化菜系主题：${config.ThemeName}`);
        console.log(`[Stage] 中心大胃王美术资源：${config.ConsumerSprite}`);
        console.log(`[Stage] 场景背景美术资源：${config.StageBackgroundSprite}`);
    }
    GetCurrentArtManifest() {
        if (this.CurrentCuisineConfig === null) {
            return null;
        }
        return {
            ThemeName: this.CurrentCuisineConfig.ThemeName,
            StageBackgroundSprite: this.CurrentCuisineConfig.StageBackgroundSprite,
            ConsumerSprite: this.CurrentCuisineConfig.ConsumerSprite,
            FoodSprites: { ...this.CurrentCuisineConfig.FoodSprites },
            TrashSprites: { ...this.CurrentCuisineConfig.TrashSprites },
        };
    }
    /**
     * Enters the preparation phase for a new day. The first shop roll is free.
     */
    StartNewDay() {
        this.CurrentDay += 1;
        this.TrySwapCuisineForMilestoneDay();
        const dayGoal = this.LevelManager.GetDayGoal(this.CurrentDay);
        this.TargetGold = dayGoal.TargetGold;
        this.RefreshCount = 0;
        this.Phase = "Preparation";
        this.GoldAtDayStart = this.Gold;
        console.log(`[Day] 第 ${this.CurrentDay} 天开始整备。目标营业额：${this.TargetGold}，初始垃圾：${dayGoal.StartingTrashCount}，追加间隔：${dayGoal.TrashInjectionIntervalTicks} Tick，当前金币：${this.Gold}`);
        this.RefreshShop(true);
    }
    /**
     * Refreshes the visible shop with 3 random items from the global ItemPool.
     *
     * StartNewDay calls this once for free. Player-triggered refreshes cost Gold.
     */
    RefreshShop(isFree = false) {
        this.AssertPreparationPhase("刷新商店");
        if (!isFree) {
            if (this.Gold < this.RefreshCost) {
                console.log(`[Shop] 金币不足，刷新需要 ${this.RefreshCost} Gold。`);
                return this.ShopItems;
            }
            this.Gold -= this.RefreshCost;
        }
        this.RefreshCount += 1;
        this.ShopItems = this.DrawShopItems(3);
        const costText = isFree ? "免费" : `花费 ${this.RefreshCost} Gold`;
        console.log(`[Shop] 第 ${this.RefreshCount} 次刷新（${costText}）：${this.FormatItemList(this.ShopItems)}`);
        return this.ShopItems;
    }
    /**
     * Buys a shop item and puts a unique item instance into PlayerInventory.
     */
    BuyItem(shopIndex) {
        this.AssertPreparationPhase("购买物品");
        this.AssertValidArrayIndex(shopIndex, this.ShopItems.length, "shopIndex");
        const shopItem = this.ShopItems[shopIndex];
        if (this.Gold < shopItem.Cost) {
            console.log(`[Shop] 金币不足，购买 ${shopItem.Name} 需要 ${shopItem.Cost} Gold。`);
            return false;
        }
        this.Gold -= shopItem.Cost;
        this.ShopItems.splice(shopIndex, 1);
        const ownedItem = this.CreateItemInstance(shopItem);
        this.PlayerInventory.push(ownedItem);
        console.log(`[Shop] 购买 ${ownedItem.Name}，花费 ${shopItem.Cost} Gold。备料区：${this.FormatItemList(this.PlayerInventory)}`);
        return true;
    }
    /**
     * Moves every item clockwise by one slot:
     * Slot[11] -> Slot[0], Slot[0] -> Slot[1], and so on.
     *
     * Chain combine/eliminate checks and FeedCenter are triggered after rotation.
     */
    RotateBelt() {
        const lastItem = this.Slots[CircularFeastBoard.SlotCount - 1];
        for (let index = CircularFeastBoard.SlotCount - 1; index > 0; index -= 1) {
            this.Slots[index] = this.Slots[index - 1];
        }
        this.Slots[0] = lastItem;
        console.log("[Belt] 传送带顺时针旋转一格。");
        this.CheckCombine();
        this.ApplyDynamicOverload();
        this.FeedCenter();
    }
    /**
     * Locks the layout and runs 3 full loops, 36 automatic ticks.
     */
    ConfirmLayout() {
        this.AssertPreparationPhase("确认摆盘");
        this.Phase = "Running";
        this.GoldAtBusinessStart = this.Gold;
        this.InjectStartingTrash();
        console.log(`[Phase] 摆盘确认，开始营业自动转动 ${CircularFeastBoard.TicksPerDay} Tick。`);
        for (let tick = 1; tick <= CircularFeastBoard.TicksPerDay; tick += 1) {
            console.log(`\n--- Tick ${tick}/${CircularFeastBoard.TicksPerDay} ---`);
            this.InjectTrashByTick(tick);
            this.RotateBelt();
        }
        this.Phase = "Finished";
        this.PrintDaySummary();
    }
    /**
     * Repeatedly scans adjacent slots until the current board state is stable.
     *
     * Slot[i] and Slot[i + 1] are checked as normal linear neighbors. Slot[11]
     * and Slot[0] are not merged here, because Slot[0] is a special feed point.
     */
    CheckCombine() {
        let hasChanged = true;
        let iterationCount = 0;
        while (hasChanged && iterationCount < CircularFeastBoard.MaxChainIterations) {
            hasChanged = false;
            iterationCount += 1;
            for (let index = 0; index < CircularFeastBoard.SlotCount - 1; index += 1) {
                if (this.TryTriggerCrusher(index)) {
                    hasChanged = true;
                    break;
                }
                if (this.TryMergeAdjacentItems(index)) {
                    hasChanged = true;
                    break;
                }
            }
        }
        if (iterationCount >= CircularFeastBoard.MaxChainIterations) {
            console.log("[连锁] 达到本轮连锁上限，停止继续检查。");
        }
    }
    /**
     * Resolves the item at Slot[0], the fixed inward feeding point.
     */
    FeedCenter() {
        const item = this.Slots[CircularFeastBoard.FeedSlotIndex];
        if (item === null) {
            console.log("[大胃王] 投喂点为空。");
            return;
        }
        if (item.IsTrash()) {
            this.DestroyItemAt(CircularFeastBoard.FeedSlotIndex);
            this.IncreaseOverload(item.Weight);
            this.Saturation = Math.max(0.0, this.Saturation - CircularFeastBoard.TrashSaturationLoss);
            this.ScorePenaltyTicksRemaining = CircularFeastBoard.TrashPenaltyTicks;
            console.log(`[大胃王] 被 ${item.Name} 卡到了！饱食度下降至 ${this.Saturation.toFixed(1)}，接下来 ${this.ScorePenaltyTicksRemaining} 次食物结算分数减半，当前过载值：${this.OverloadGauge.toFixed(1)}`);
            return;
        }
        if (item.IsFood()) {
            this.DestroyItemAt(CircularFeastBoard.FeedSlotIndex);
            const earnedGold = this.CalculateFoodGold(item);
            this.AddGold(earnedGold);
            this.Saturation = Math.min(CircularFeastBoard.MaxSaturation, this.Saturation + CircularFeastBoard.FoodSaturationGain);
            this.ReduceOverload(CircularFeastBoard.FoodOverloadRelief);
            console.log(`[大胃王] 吞下了 ${item.Name}，Gold 增加 ${earnedGold}，饱食度 ${this.Saturation.toFixed(1)}，OverloadGauge 小幅下降至 ${this.OverloadGauge.toFixed(1)}，当前金币：${this.Gold}`);
            return;
        }
        console.log(`[大胃王] 忽略了 ${item.Name}。`);
    }
    /**
     * During preparation: PlaceItem(inventoryIndex, slotIndex) moves inventory to board.
     * For tests/prototyping: PlaceItem(slotIndex, item) directly inserts an item.
     */
    PlaceItem(first, second) {
        if (second instanceof Item) {
            return this.PlaceItemDirect(first, second);
        }
        return this.PlaceInventoryItem(first, second);
    }
    /**
     * Allows the player to swap any two conveyor slots while the belt is stopped.
     */
    SwapSlots(indexA, indexB) {
        this.AssertPreparationPhase("交换槽位");
        this.AssertValidSlotIndex(indexA);
        this.AssertValidSlotIndex(indexB);
        const temp = this.Slots[indexA];
        this.Slots[indexA] = this.Slots[indexB];
        this.Slots[indexB] = temp;
        console.log(`[Arrange] 交换 Slot[${indexA}] 与 Slot[${indexB}]。`);
        return true;
    }
    PlaceItemDirect(slotIndex, item) {
        this.AssertValidSlotIndex(slotIndex);
        if (this.Slots[slotIndex] !== null) {
            return false;
        }
        this.Slots[slotIndex] = item;
        return true;
    }
    ClearBelt() {
        for (let index = 0; index < this.Slots.length; index += 1) {
            this.Slots[index] = null;
        }
    }
    DestroyItemAt(slotIndex) {
        this.AssertValidSlotIndex(slotIndex);
        this.Slots[slotIndex] = null;
    }
    PlaceInventoryItem(inventoryIndex, slotIndex) {
        this.AssertPreparationPhase("摆放物品");
        this.AssertValidArrayIndex(inventoryIndex, this.PlayerInventory.length, "inventoryIndex");
        this.AssertValidSlotIndex(slotIndex);
        if (this.Slots[slotIndex] !== null) {
            console.log(`[Arrange] Slot[${slotIndex}] 已被占用。`);
            return false;
        }
        const [item] = this.PlayerInventory.splice(inventoryIndex, 1);
        this.Slots[slotIndex] = item;
        console.log(`[Arrange] 将 ${item.Name} 放入 Slot[${slotIndex}]。`);
        return true;
    }
    InjectStartingTrash() {
        const dayGoal = this.LevelManager.GetDayGoal(this.CurrentDay);
        let injectedCount = 0;
        for (let count = 0; count < dayGoal.StartingTrashCount; count += 1) {
            if (this.InjectTrashIntoRandomEmptySlot()) {
                injectedCount += 1;
            }
        }
        console.log(`[Trash] 营业前自动投放 ${injectedCount}/${dayGoal.StartingTrashCount} 个垃圾。`);
    }
    InjectTrashByTick(tick) {
        const interval = this.LevelManager.GetDayGoal(this.CurrentDay).TrashInjectionIntervalTicks;
        if (tick <= 1 || tick % interval !== 0) {
            return;
        }
        if (this.InjectTrashIntoRandomEmptySlot()) {
            console.log(`[Trash] 第 ${tick} Tick 压力追加：随机空槽生成 1 个垃圾。`);
        }
    }
    InjectTrashIntoRandomEmptySlot() {
        const emptySlots = this.Slots
            .map((item, index) => (item === null ? index : -1))
            .filter((index) => index >= 0);
        if (emptySlots.length === 0) {
            console.log("[Trash] 没有空槽位，垃圾投放失败。");
            return false;
        }
        const randomIndex = Math.floor(Math.random() * emptySlots.length);
        const slotIndex = emptySlots[randomIndex];
        const trashTemplate = this.GetTrashTemplate();
        const trash = this.CreateItemInstance(trashTemplate);
        this.Slots[slotIndex] = trash;
        console.log(`[Trash] ${trash.Name} 出现在 Slot[${slotIndex}]。`);
        return true;
    }
    AddGold(amount) {
        this.Gold += Math.max(0, Math.trunc(amount));
    }
    CalculateFoodGold(item) {
        let score = Math.max(0, item.Score);
        if (this.ScorePenaltyTicksRemaining > 0) {
            score = Math.floor(score * 0.5);
            this.ScorePenaltyTicksRemaining -= 1;
            console.log(`[心情] 垃圾惩罚生效，本次分数减半。剩余惩罚次数：${this.ScorePenaltyTicksRemaining}`);
        }
        return score;
    }
    IncreaseOverload(amount) {
        this.OverloadGauge = Math.min(CircularFeastBoard.MaxOverloadGauge, this.OverloadGauge + Math.max(0, amount));
    }
    ReduceOverload(amount) {
        this.OverloadGauge = Math.max(0.0, this.OverloadGauge - Math.max(0, amount));
    }
    ApplyDynamicOverload() {
        const allItemWeight = this.Slots.reduce((sum, item) => sum + (item?.Weight ?? 0), 0);
        const trashWeight = this.Slots.reduce((sum, item) => sum + (item?.IsTrash() ? item.Weight : 0), 0);
        const pressure = allItemWeight + trashWeight;
        this.IncreaseOverload(pressure);
        console.log(`[压力] 本轮传送带压力 +${pressure.toFixed(1)}，当前过载值：${this.OverloadGauge.toFixed(1)}`);
    }
    TryTriggerCrusher(slotIndex) {
        const moduleItem = this.Slots[slotIndex];
        const targetItem = this.Slots[slotIndex + 1];
        if (moduleItem === null ||
            targetItem === null ||
            moduleItem.Name !== CircularFeastBoard.CrusherName ||
            !moduleItem.HasTag("Module") ||
            !targetItem.IsTrash()) {
            return false;
        }
        this.DestroyItemAt(slotIndex + 1);
        this.AddGold(CircularFeastBoard.CrusherGoldReward);
        this.ReduceOverload(CircularFeastBoard.CrusherOverloadReduction);
        console.log(`[连锁] ${moduleItem.Name} 粉碎了 ${targetItem.Name}，Gold +${CircularFeastBoard.CrusherGoldReward}，OverloadGauge -${CircularFeastBoard.CrusherOverloadReduction.toFixed(1)}。`);
        return true;
    }
    TryMergeAdjacentItems(slotIndex) {
        const leftItem = this.Slots[slotIndex];
        const rightItem = this.Slots[slotIndex + 1];
        if (leftItem === null || rightItem === null) {
            return false;
        }
        const rule = this.FindCombineRule(leftItem, rightItem);
        if (rule === null) {
            return false;
        }
        const mergedItem = rule.OutputFactory(leftItem, rightItem);
        this.Slots[slotIndex] = mergedItem;
        this.Slots[slotIndex + 1] = null;
        console.log(`[连锁] ${leftItem.Name}与${rightItem.Name}合体，腾出了 1 个空格！`);
        return true;
    }
    FindCombineRule(leftItem, rightItem) {
        return (this.CombineRules.find((rule) => rule.InputAName === leftItem.Name && rule.InputBName === rightItem.Name) ?? null);
    }
    DrawShopItems(count) {
        const candidates = [...this.ActiveItemPool];
        const result = [];
        while (result.length < count && candidates.length > 0) {
            const index = Math.floor(Math.random() * candidates.length);
            const [item] = candidates.splice(index, 1);
            result.push(item);
        }
        return result;
    }
    CreateItemInstance(template) {
        const instanceID = `${template.ID}_owned_${this.NextItemInstanceID}`;
        this.NextItemInstanceID += 1;
        return template.Clone(instanceID);
    }
    GetTrashTemplate() {
        return this.ActiveItemPool.find((item) => item.IsTrash()) ?? exports.SampleItems.FishBone;
    }
    PrintDaySummary() {
        const goldProduced = this.Gold - this.GoldAtBusinessStart;
        const didAdvance = this.Gold >= this.TargetGold && this.OverloadGauge < CircularFeastBoard.MaxOverloadGauge;
        console.log("\n========== 营业总结 ==========");
        console.log(`[Summary] 第 ${this.CurrentDay} 天`);
        console.log(`[Summary] 总金币产出：${goldProduced}G`);
        console.log(`[Summary] 当前金币/目标：${this.Gold}/${this.TargetGold}`);
        console.log(`[Summary] 剩余过载百分比：${this.OverloadGauge.toFixed(1)}%`);
        console.log(`[Summary] 饱食度：${this.Saturation.toFixed(1)}%`);
        console.log(`[Summary] 是否晋级：${didAdvance ? "是" : "否"}`);
        if (didAdvance) {
            this.StartNewDay();
            return;
        }
        console.log(`餐厅倒闭！最终坚持到第 ${this.CurrentDay} 天。`);
    }
    TrySwapCuisineForMilestoneDay() {
        if (this.CurrentDay !== 5 || this.CurrentCuisineConfig?.ThemeName === exports.HotpotCuisineConfig.ThemeName) {
            return;
        }
        console.log("[Cuisine] 第 5 天达成，菜系从日料切换为中式火锅。");
        this.InitStage(exports.HotpotCuisineConfig, { ResetProgress: false });
        this.ReplaceItemsByName(exports.CuisineSwapNameMap);
    }
    ReplaceItemsByName(nameMap) {
        for (let index = 0; index < this.Slots.length; index += 1) {
            this.Slots[index] = this.RenameItemIfNeeded(this.Slots[index], nameMap);
        }
        for (let index = 0; index < this.PlayerInventory.length; index += 1) {
            this.PlayerInventory[index] = this.RenameItemIfNeeded(this.PlayerInventory[index], nameMap);
        }
        for (let index = 0; index < this.ShopItems.length; index += 1) {
            this.ShopItems[index] = this.RenameItemIfNeeded(this.ShopItems[index], nameMap);
        }
        for (let index = 0; index < this.ActiveItemPool.length; index += 1) {
            this.ActiveItemPool[index] = this.RenameItemIfNeeded(this.ActiveItemPool[index], nameMap);
        }
    }
    RenameItemIfNeeded(item, nameMap) {
        if (item === null || nameMap[item.Name] === undefined) {
            return item;
        }
        return new Item({
            ID: item.ID,
            Name: nameMap[item.Name],
            Tags: item.Tags,
            Score: item.Score,
            Weight: item.Weight,
            Cost: item.Cost,
        });
    }
    FormatItemList(items) {
        if (items.length === 0) {
            return "Empty";
        }
        return items.map((item, index) => `${index}:${item.Name}(${item.Cost}G)`).join(" / ");
    }
    AssertPreparationPhase(actionName) {
        if (this.Phase !== "Preparation") {
            throw new Error(`${actionName} 只能在整备阶段执行。当前阶段：${this.Phase}`);
        }
    }
    AssertValidSlotIndex(slotIndex) {
        if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= CircularFeastBoard.SlotCount) {
            throw new RangeError(`Slot index must be an integer between 0 and 11. Received: ${slotIndex}`);
        }
    }
    AssertValidArrayIndex(index, length, label) {
        if (!Number.isInteger(index) || index < 0 || index >= length) {
            throw new RangeError(`${label} must be an integer between 0 and ${length - 1}. Received: ${index}`);
        }
    }
}
exports.CircularFeastBoard = CircularFeastBoard;
CircularFeastBoard.SlotCount = 12;
CircularFeastBoard.FeedSlotIndex = 0;
CircularFeastBoard.MaxOverloadGauge = 100.0;
CircularFeastBoard.CrusherName = "厨余粉碎机";
CircularFeastBoard.CrusherGoldReward = 2;
CircularFeastBoard.CrusherOverloadReduction = 5.0;
CircularFeastBoard.TicksPerDay = CircularFeastBoard.SlotCount * 3;
CircularFeastBoard.BaseSaturation = 50.0;
CircularFeastBoard.MaxSaturation = 100.0;
CircularFeastBoard.FoodSaturationGain = 12.0;
CircularFeastBoard.TrashSaturationLoss = 20.0;
CircularFeastBoard.FoodOverloadRelief = 3.0;
CircularFeastBoard.TrashPenaltyTicks = 3;
CircularFeastBoard.MaxChainIterations = CircularFeastBoard.SlotCount * 2;
/**
 * Configurable combine table. Add more recipes here or inject a custom table
 * through CircularFeastBoard's constructor.
 */
exports.DefaultCombineRules = [
    {
        InputAName: "醋饭",
        InputBName: "鱼片",
        OutputFactory: (leftItem, rightItem) => new Item({
            ID: `combined_${leftItem.ID}_${rightItem.ID}`,
            Name: "三文鱼寿司",
            Tags: ["Food", "Flux"],
            Score: leftItem.Score + rightItem.Score + 5,
            Weight: Math.max(0.1, (leftItem.Weight + rightItem.Weight) * 0.65),
            Cost: 0,
        }),
    },
    {
        InputAName: "清汤",
        InputBName: "肥牛",
        OutputFactory: (leftItem, rightItem) => new Item({
            ID: `combined_${leftItem.ID}_${rightItem.ID}`,
            Name: "肥牛清汤锅",
            Tags: ["Food", "Flux"],
            Score: leftItem.Score + rightItem.Score + 8,
            Weight: Math.max(0.1, (leftItem.Weight + rightItem.Weight) * 0.6),
            Cost: 0,
        }),
    },
];
exports.CuisineSwapNameMap = {
    醋饭: "清汤",
    鱼片: "肥牛",
    三文鱼寿司: "肥牛清汤锅",
    鱼刺: "锅底浮渣",
    魔鬼芥末: "魔鬼辣油",
};
function ReplaceItemPoolByName(nameMap) {
    for (let index = 0; index < exports.ItemPool.length; index += 1) {
        const item = exports.ItemPool[index];
        const nextName = nameMap[item.Name];
        if (nextName === undefined) {
            continue;
        }
        exports.ItemPool[index] = new Item({
            ID: item.ID,
            Name: nextName,
            Tags: item.Tags,
            Score: item.Score,
            Weight: item.Weight,
            Cost: item.Cost,
        });
    }
}
/**
 * Global shop pool. Shop refreshes draw from these templates and BuyItem creates
 * unique owned instances for PlayerInventory.
 */
exports.ItemPool = [
    new Item({
        ID: "pool_rice",
        Name: "醋饭",
        Tags: ["Raw"],
        Score: 3,
        Weight: 1.0,
        Cost: 2,
    }),
    new Item({
        ID: "pool_fish_slice",
        Name: "鱼片",
        Tags: ["Raw"],
        Score: 4,
        Weight: 1.2,
        Cost: 2,
    }),
    new Item({
        ID: "pool_fishbone",
        Name: "鱼刺",
        Tags: ["Trash"],
        Score: 0,
        Weight: 2.5,
        Cost: 1,
    }),
    new Item({
        ID: "pool_crusher",
        Name: CircularFeastBoard.CrusherName,
        Tags: ["Module"],
        Score: 0,
        Weight: 3.0,
        Cost: 4,
    }),
    new Item({
        ID: "pool_devil_wasabi",
        Name: "魔鬼芥末",
        Tags: ["Flux"],
        Score: 8,
        Weight: 0.8,
        Cost: 3,
    }),
];
/**
 * Optional sample data for quick logic testing or future stage prototyping.
 */
exports.SushiCuisineConfig = new CuisineConfig({
    ThemeName: "日料寿司",
    FoodSprites: {
        醋饭: "assets/sprites/sushi/rice.png",
        鱼片: "assets/sprites/sushi/fish_slice.png",
        三文鱼寿司: "assets/sprites/sushi/salmon_sushi.png",
        魔鬼芥末: "assets/sprites/sushi/devil_wasabi.png",
    },
    TrashSprites: {
        鱼刺: "assets/sprites/sushi/fishbone.png",
        破盘子: "assets/sprites/sushi/broken_plate.png",
    },
    ConsumerSprite: "assets/sprites/consumer/big_eater_sushi.png",
    StageBackgroundSprite: "assets/generated/circular-sushi-stage.png",
});
exports.HotpotCuisineConfig = new CuisineConfig({
    ThemeName: "中式火锅",
    FoodSprites: {
        清汤: "assets/sprites/hotpot/clear_broth.png",
        肥牛: "assets/sprites/hotpot/beef_slice.png",
        肥牛清汤锅: "assets/sprites/hotpot/beef_broth_pot.png",
        魔鬼辣油: "assets/sprites/hotpot/devil_chili_oil.png",
    },
    TrashSprites: {
        锅底浮渣: "assets/sprites/hotpot/pot_scum.png",
        破盘子: "assets/sprites/hotpot/broken_plate.png",
    },
    ConsumerSprite: "assets/sprites/consumer/big_eater_hotpot.png",
    StageBackgroundSprite: "assets/generated/circular-hotpot-stage.png",
});
exports.SampleItems = {
    Rice: new Item({
        ID: "item_rice_001",
        Name: "醋饭",
        Tags: ["Raw"],
        Score: 3,
        Weight: 1.0,
        Cost: 2,
    }),
    FishSlice: new Item({
        ID: "item_fish_slice_001",
        Name: "鱼片",
        Tags: ["Raw"],
        Score: 4,
        Weight: 1.2,
        Cost: 2,
    }),
    FishBone: new Item({
        ID: "item_fishbone_001",
        Name: "鱼刺",
        Tags: ["Trash"],
        Score: 0,
        Weight: 2.5,
        Cost: 1,
    }),
    Crusher: new Item({
        ID: "item_crusher_001",
        Name: CircularFeastBoard.CrusherName,
        Tags: ["Module"],
        Score: 0,
        Weight: 3.0,
        Cost: 4,
    }),
    DevilWasabi: new Item({
        ID: "item_devil_wasabi_001",
        Name: "魔鬼芥末",
        Tags: ["Flux"],
        Score: 8,
        Weight: 0.8,
        Cost: 3,
    }),
};

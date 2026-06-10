"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CircularFeastCore_1 = require("./core/CircularFeastCore");
const board = new CircularFeastCore_1.CircularFeastBoard();
board.InitStage(CircularFeastCore_1.SushiCuisineConfig);
console.log("[Demo] 当前美术资源清单：", board.GetCurrentArtManifest());
board.Gold = 20;
board.StartNewDay();
const mustFindItem = (itemName) => {
    const item = CircularFeastCore_1.ItemPool.find((poolItem) => poolItem.Name === itemName);
    if (item === undefined) {
        throw new Error(`ItemPool missing demo item: ${itemName}`);
    }
    return item;
};
// Use a deterministic shop for the demo after showing the free random refresh.
board.ShopItems = [
    mustFindItem("醋饭"),
    mustFindItem("鱼片"),
    mustFindItem("厨余粉碎机"),
    mustFindItem("鱼刺"),
];
board.BuyItem(0);
board.BuyItem(0);
board.BuyItem(0);
board.BuyItem(0);
// Arrange from PlayerInventory:
// Crusher + trash will eliminate after rotation.
board.PlaceItem(2, 6);
board.PlaceItem(2, 7);
// Put rice one slot too early, then use SwapSlots to fix the combo order.
board.PlaceItem(0, 8);
board.PlaceItem(0, 10);
board.SwapSlots(8, 9);
board.ConfirmLayout();
console.log("\n[Demo] 最终状态：", {
    CurrentDay: board.CurrentDay,
    TargetGold: board.TargetGold,
    Gold: board.Gold,
    OverloadGauge: board.OverloadGauge.toFixed(1),
    Phase: board.Phase,
    Slots: board.Slots.map((item, index) => ({
        Slot: index,
        Item: item?.Name ?? "Empty",
    })),
});

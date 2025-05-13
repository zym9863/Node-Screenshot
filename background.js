// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureNode") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("截图失败:", chrome.runtime.lastError.message);
        sendResponse({ error: "截图失败: " + chrome.runtime.lastError.message });
        return;
      }
      // 将截图数据和元素位置信息发送回 popup
      // 注意：这里我们直接发送整个页面的截图，裁剪操作将在 popup.js 中进行
      // 或者更优化的方式是在 content script 中使用 html2canvas 库直接截取元素
      // 但为了简化，我们先采用裁剪的方式
      chrome.storage.local.set({
        screenshotDataUrl: dataUrl,
        elementRect: request.elementRect
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("存储截图数据失败:", chrome.runtime.lastError.message);
          sendResponse({ error: "存储截图数据失败: " + chrome.runtime.lastError.message });
        } else {
          console.log("截图数据已存储");
          sendResponse({ success: true, message: "截图成功并已存储" });
        }
      });
    });
    return true; // 表示会异步发送响应
  }
});

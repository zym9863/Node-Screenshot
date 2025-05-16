// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureNode") {
    const tabId = sender.tab.id;
    const elementRect = request.elementRect; // Expects { x, y, width, height }
    const debuggee = { tabId: tabId };
    const protocolVersion = "1.3";

    // Function to send debugger command and return a promise
    function sendCommand(command, params) {
      return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(debuggee, command, params, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });
    }

    async function captureFullElement() {
      try {
        await new Promise((resolve, reject) => {
          chrome.debugger.attach(debuggee, protocolVersion, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
        console.log("Debugger attached to tab:", tabId);

        // Get layout metrics to potentially adjust for device pixel ratio if needed,
        // though captureScreenshot with clip and captureBeyondViewport usually handles this well.
        // For simplicity, we'll directly use the provided rect, assuming it's in CSS pixels.
        const screenshotParams = {
          format: "png",
          quality: 100,
          clip: {
            x: elementRect.x,       // X coordinate of the top-left corner of the viewport
            y: elementRect.y,       // Y coordinate of the top-left corner of the viewport
            width: elementRect.width,   // Width of the rectangle
            height: elementRect.height, // Height of the rectangle
            scale: 1                // No scaling
          },
          captureBeyondViewport: true // Key for capturing beyond visible area
        };

        const result = await sendCommand("Page.captureScreenshot", screenshotParams);
        console.log("Screenshot captured");
        sendResponse({ success: true, dataUrl: "data:image/png;base64," + result.data });

      } catch (error) {
        console.error("Error during capture process:", error.message);
        sendResponse({ error: "截图失败: " + error.message });
      } finally {
        chrome.debugger.detach(debuggee, () => {
          if (chrome.runtime.lastError) {
            console.error("Error detaching debugger:", chrome.runtime.lastError.message);
          }
          console.log("Debugger detached from tab:", tabId);
        });
      }
    }

    captureFullElement();
    return true; // 表示会异步发送响应
  }
});

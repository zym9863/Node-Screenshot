document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements from popup.html
  const screenshotImage = document.getElementById('screenshotImage');
  const noScreenshotMessage = document.getElementById('noScreenshotMessage');
  const copyButton = document.getElementById('copyButton');
  const downloadButton = document.getElementById('downloadButton');
  const copyButtonTextSpan = copyButton.querySelector('.button-icon') ? copyButton.childNodes[copyButton.childNodes.length-1] : copyButton; // Get text node or span
  const originalCopyButtonText = copyButtonTextSpan.textContent.trim();

  let currentScreenshotUrl = null; // To store the data URL for button actions

  // Function to update the preview area and button states
  function updateScreenshotPreview() {
    chrome.storage.local.get(['capturedScreenshotUrl'], (result) => {
      if (result.capturedScreenshotUrl) {
        currentScreenshotUrl = result.capturedScreenshotUrl;
        screenshotImage.src = currentScreenshotUrl;
        screenshotImage.style.display = 'block'; 
        noScreenshotMessage.style.display = 'none';
        copyButton.disabled = false;
        downloadButton.disabled = false;

        // Optional: Clear the storage after loading if you want each popup opening to require a new screenshot
        // or if you want to prevent old screenshots from showing up if the selection process is re-initiated.
        // chrome.storage.local.remove(['capturedScreenshotUrl']);
      } else {
        currentScreenshotUrl = null;
        screenshotImage.src = '';
        screenshotImage.style.display = 'none';
        noScreenshotMessage.style.display = 'block';
        // Ensure message is default if no specific error from startSelection is pending
        if (!noScreenshotMessage.dataset.customMessage) {
            noScreenshotMessage.textContent = '请在页面中选择一个元素进行截图。';
        }
        copyButton.disabled = true;
        downloadButton.disabled = true;
      }
      // Reset custom message flag
      delete noScreenshotMessage.dataset.customMessage;
    });
  }

  // Initial update when popup opens
  updateScreenshotPreview();

  // Listen for messages (e.g., from content.js when a new screenshot is ready)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "screenshotReady") {
      console.log("Popup received screenshotReady message.");
      updateScreenshotPreview();
      sendResponse({ status: "Popup received and will update." }); 
      return true; // Keep channel open for async response if needed later
    }
    // Allow other listeners to process the message if any
  });

  // Copy button click event
  copyButton.addEventListener('click', async () => {
    if (currentScreenshotUrl) {
      try {
        const response = await fetch(currentScreenshotUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        copyButtonTextSpan.textContent = '已复制!';
        copyButton.disabled = true; 
        setTimeout(() => {
          copyButtonTextSpan.textContent = originalCopyButtonText;
          if(currentScreenshotUrl) copyButton.disabled = false; 
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
        alert('复制截图失败。请查看控制台。');
      }
    }
  });

  // Download button click event
  downloadButton.addEventListener('click', () => {
    if (currentScreenshotUrl) {
      const a = document.createElement('a');
      a.href = currentScreenshotUrl;
      a.download = 'element-screenshot.png'; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  });

  // Page load: send startSelection to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.id) {
      if (currentTab.url && (currentTab.url.startsWith('http:') || currentTab.url.startsWith('https:') || currentTab.url.startsWith('file:'))) {
        chrome.tabs.sendMessage(currentTab.id, { action: "startSelection" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("向 content script 发送 startSelection 消息失败:", chrome.runtime.lastError.message);
            // Only update the message if no image is currently displayed
            if (screenshotImage.style.display === 'none') {
              if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
                noScreenshotMessage.textContent = '无法在此页面启动。脚本可能未加载。请刷新或尝试普通网页。';
              } else {
                noScreenshotMessage.textContent = '无法启动元素选择。请刷新或尝试其他页面。';
              }
              noScreenshotMessage.dataset.customMessage = "true";
            }
          } else if (response && response.success) {
            console.log("已通知 content script 开始选择元素。");
            if (screenshotImage.style.display === 'none' && !noScreenshotMessage.dataset.customMessage) {
                noScreenshotMessage.textContent = '请在页面中点击一个元素进行截图。';
            }
          } else if (response && response.error) {
            console.error("启动元素选择失败:", response.error);
            if (screenshotImage.style.display === 'none') {
                noScreenshotMessage.textContent = `启动元素选择失败: ${response.error}`;
                noScreenshotMessage.dataset.customMessage = "true";
            }
          }
        });
      } else {
        console.warn("当前页面类型不支持内容脚本注入:", currentTab.url);
        if (screenshotImage.style.display === 'none') {
            noScreenshotMessage.textContent = '此页面类型不支持截图。请在常规网页上使用。';
            noScreenshotMessage.dataset.customMessage = "true";
        }
        copyButton.disabled = true;
        downloadButton.disabled = true;
      }
    } else {
      console.error("无法获取当前活动标签页。");
      if (screenshotImage.style.display === 'none') {
          noScreenshotMessage.textContent = '无法与页面通信以开始选择。';
          noScreenshotMessage.dataset.customMessage = "true";
      }
      copyButton.disabled = true;
      downloadButton.disabled = true;
    }
  });

  // Popup close: send stopSelection to content script
  // Note: 'unload' is not perfectly reliable for popups. 
  // Consider if this logic is critical or can be handled differently (e.g., by content script timeout)
  window.addEventListener('unload', () => { 
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.id) {
        if (currentTab.url && (currentTab.url.startsWith('http:') || currentTab.url.startsWith('https:') || currentTab.url.startsWith('file:'))) {
          chrome.tabs.sendMessage(currentTab.id, { action: "stopSelection" }, (response) => {
            if (chrome.runtime.lastError) {
              // console.warn("发送 stopSelection 消息失败:", chrome.runtime.lastError.message);
            } else if (response && response.success) {
              // console.log("已通知 content script 停止选择元素。");
            }
          });
        }
      }
    });
  });
});

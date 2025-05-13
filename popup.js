document.addEventListener('DOMContentLoaded', () => {
  const previewArea = document.getElementById('previewArea');
  const copyButton = document.getElementById('copyButton');
  const downloadButton = document.getElementById('downloadButton');
  let capturedImageDataUrl = null; // 存储原始截图数据
  let croppedImageDataUrl = null; // 存储裁剪后的截图数据

  // 尝试从 storage 加载截图
  chrome.storage.local.get(['screenshotDataUrl', 'elementRect'], (result) => {
    if (result.screenshotDataUrl && result.elementRect) {
      capturedImageDataUrl = result.screenshotDataUrl;
      const elementRect = result.elementRect;

      const img = new Image();
      img.onload = () => {
        // 创建一个 canvas 来裁剪图片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 考虑设备像素比进行裁剪
        const dpr = elementRect.devicePixelRatio || 1;
        canvas.width = elementRect.width * dpr;
        canvas.height = elementRect.height * dpr;

        // 绘制原始截图到 canvas，并只选择元素对应的区域
        // 注意：captureVisibleTab 捕获的是视口内容，坐标是相对于视口的
        // elementRect 的 x, y 也是相对于视口的
        ctx.drawImage(
          img,
          elementRect.x * dpr, // 裁剪区域的 x 坐标
          elementRect.y * dpr, // 裁剪区域的 y 坐标
          elementRect.width * dpr,  // 裁剪区域的宽度
          elementRect.height * dpr, // 裁剪区域的高度
          0, // 在 canvas 上绘制的 x 坐标
          0, // 在 canvas 上绘制的 y 坐标
          elementRect.width * dpr,  // 在 canvas 上绘制的宽度
          elementRect.height * dpr  // 在 canvas 上绘制的高度
        );

        croppedImageDataUrl = canvas.toDataURL('image/png');
        previewArea.innerHTML = ''; // 清空提示信息
        const previewImg = document.createElement('img');
        previewImg.src = croppedImageDataUrl;
        previewArea.appendChild(previewImg);

        copyButton.disabled = false;
        downloadButton.disabled = false;

        // 清理 storage 中的数据，避免下次打开时还是旧的截图
        chrome.storage.local.remove(['screenshotDataUrl', 'elementRect']);
      };
      img.onerror = () => {
        previewArea.innerHTML = '<p>无法加载截图预览。</p>';
        copyButton.disabled = true;
        downloadButton.disabled = true;
      };
      img.src = capturedImageDataUrl;

    } else {
      previewArea.innerHTML = '<p>请点击页面中的元素以进行截图。</p>';
      copyButton.disabled = true;
      downloadButton.disabled = true;
    }
  });

  // 复制按钮点击事件
  copyButton.addEventListener('click', async () => {
    if (croppedImageDataUrl) {
      try {
        // 将 Data URL 转换为 Blob
        const response = await fetch(croppedImageDataUrl);
        const blob = await response.blob();

        // 使用 Clipboard API 写入图片
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        // alert('截图已复制到剪贴板！'); // 可以用更友好的提示替换
        copyButton.textContent = '已复制!';
        setTimeout(() => {
          copyButton.textContent = '复制';
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
        alert('复制截图失败，请检查控制台获取更多信息。\n浏览器可能不支持直接复制图片，或需要用户授权。');
        // 降级方案：提示用户手动下载或右键复制
      }
    }
  });

  // 下载按钮点击事件
  downloadButton.addEventListener('click', () => {
    if (croppedImageDataUrl) {
      const a = document.createElement('a');
      a.href = croppedImageDataUrl;
      a.download = 'screenshot.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  });

  // 页面加载时，自动向 content script 发送开始选择的指令
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (currentTab && currentTab.id) {
      // 检查URL，避免向不支持的页面发送消息
      if (currentTab.url && (currentTab.url.startsWith('http:') || currentTab.url.startsWith('https:') || currentTab.url.startsWith('file:') || currentTab.url.startsWith('blob:'))) {
        chrome.tabs.sendMessage(currentTab.id, { action: "startSelection" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("向 content script 发送 startSelection 消息失败:", chrome.runtime.lastError.message);
            if (chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
              previewArea.innerHTML = '<p>无法在此页面启动元素选择。内容脚本可能尚未加载或此页面类型不受支持。请尝试刷新页面或在普通网页上使用。</p>';
            } else {
              previewArea.innerHTML = '<p>无法启动元素选择。请刷新页面或尝试其他页面。</p>';
            }
          } else if (response && response.success) {
            console.log("已通知 content script 开始选择元素。");
            // 可以在这里提示用户开始选择, 例如:
            // previewArea.innerHTML = '<p>请在页面中点击一个元素进行截图。</p>';
          } else if (response && response.error) {
            console.error("启动元素选择失败:", response.error);
            previewArea.innerHTML = `<p>启动元素选择失败: ${response.error}</p>`;
          }
        });
      } else {
        console.warn("当前页面类型不支持内容脚本注入:", currentTab.url);
        previewArea.innerHTML = '<p>此页面类型不支持截图。请在常规网页上使用。</p>';
        copyButton.disabled = true;
        downloadButton.disabled = true;
      }
    } else {
      console.error("无法获取当前活动标签页。");
      previewArea.innerHTML = '<p>无法与页面通信以开始选择。</p>';
      copyButton.disabled = true;
      downloadButton.disabled = true;
    }
  });

  // 当 popup 关闭时，通知 content script 停止选择
  window.addEventListener('unload', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.id) {
        // 同样检查URL
        if (currentTab.url && (currentTab.url.startsWith('http:') || currentTab.url.startsWith('https:') || currentTab.url.startsWith('file:') || currentTab.url.startsWith('blob:'))) {
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

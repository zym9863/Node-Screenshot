let selectedElement = null;
let isSelecting = false; // 标记是否处于选择元素的状态

// 鼠标悬停时高亮元素
function handleMouseOver(event) {
  if (!isSelecting) return;
  if (event.target && event.target !== document.body) {
    event.target.classList.add('screenshot-element-highlight');
  }
}

// 鼠标移开时移除高亮
function handleMouseOut(event) {
  if (event.target && event.target.classList) {
    event.target.classList.remove('screenshot-element-highlight');
  }
}

// 点击元素进行选择
function handleClick(event) {
  if (!isSelecting) return;
  event.preventDefault();
  event.stopPropagation();

  selectedElement = event.target;
  selectedElement.classList.remove('screenshot-element-highlight'); // 移除最终选择元素的高亮，避免截图带边框

  const rect = selectedElement.getBoundingClientRect();
  console.log("选定元素:", selectedElement, "位置:", rect);

  // 发送消息到 background.js 请求截图
  chrome.runtime.sendMessage({
    action: "captureNode",
    elementRect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      // 传递设备像素比，用于在高DPI屏幕上正确裁剪
      devicePixelRatio: window.devicePixelRatio || 1
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("发送截图请求失败:", chrome.runtime.lastError.message);
      alert("截图请求失败: " + chrome.runtime.lastError.message);
    } else if (response && response.error) {
      console.error("截图时发生错误:", response.error);
      alert("截图时发生错误: " + response.error);
    } else if (response && response.success) {
      console.log(response.message);
      // 可以在这里给用户一些成功的反馈，例如一个短暂的通知
      // alert("元素已选择，请打开插件图标查看预览。");
    }
    stopSelection(); // 截图后停止选择
  });
}

// 开始元素选择
function startSelection() {
  if (isSelecting) return; // 防止重复启动
  isSelecting = true;
  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true); // 使用捕获阶段确保点击事件被处理
  document.body.style.cursor = 'crosshair'; // 更改整个页面的鼠标指针
  console.log("元素选择模式已启动。");
}

// 停止元素选择
function stopSelection() {
  isSelecting = false;
  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.body.style.cursor = 'default'; // 恢复默认鼠标指针
  // 移除可能残留的高亮
  const highlightedElements = document.querySelectorAll('.screenshot-element-highlight');
  highlightedElements.forEach(el => el.classList.remove('screenshot-element-highlight'));
  console.log("元素选择模式已停止。");
}

// 监听来自 popup 或 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelection") {
    startSelection();
    sendResponse({ success: true, message: "元素选择已启动" });
  } else if (request.action === "stopSelection") {
    stopSelection();
    sendResponse({ success: true, message: "元素选择已停止" });
  }
});

// 初始时，可以考虑在插件图标被点击时才启动选择模式
// 或者提供一个按钮在 popup 中来启动选择
// 为了简化，我们修改 background.js，当插件图标点击时，直接通知 content.js 启动选择
// 这里我们先定义好函数，等待 background.js 或 popup.js 的调用

let hoveredElement = null;       // 当前鼠标悬停的元素
let selectedElement = null;     // 当前选中的元素
let isSelecting = false;        // 标记是否处于选择元素的状态
let isElementSelected = false;  // 标记是否已经初步选择了元素
let selectionToolbar = null;    // 选择工具栏

// 鼠标悬停时高亮元素
function handleMouseOver(event) {
  if (!isSelecting || isElementSelected) return;

  if (event.target && event.target !== document.body) {
    // 移除之前悬停元素的高亮
    if (hoveredElement && hoveredElement !== event.target) {
      hoveredElement.classList.remove('screenshot-element-highlight');
    }

    hoveredElement = event.target;
    hoveredElement.classList.add('screenshot-element-highlight');
  }
}

// 鼠标移开时移除高亮
function handleMouseOut(event) {
  if (isElementSelected) return;

  if (event.target && event.target.classList) {
    event.target.classList.remove('screenshot-element-highlight');
    if (hoveredElement === event.target) {
      hoveredElement = null;
    }
  }
}

// 点击元素进行初步选择
function handleClick(event) {
  if (!isSelecting || isElementSelected) return;
  event.preventDefault();
  event.stopPropagation();

  // 初步选择元素
  selectedElement = event.target;
  isElementSelected = true;

  // 移除悬停高亮，添加选中高亮
  selectedElement.classList.remove('screenshot-element-highlight');
  selectedElement.classList.add('screenshot-element-selected');

  console.log("初步选定元素:", selectedElement);

  // 创建并显示选择工具栏
  createSelectionToolbar(selectedElement);

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown);
}

// 创建选择工具栏
function createSelectionToolbar(element) {
  // 如果已存在工具栏，先移除
  removeSelectionToolbar();

  // 创建工具栏容器
  selectionToolbar = document.createElement('div');
  selectionToolbar.className = 'screenshot-selection-toolbar';

  // 获取元素位置
  const rect = element.getBoundingClientRect();

  // 设置工具栏位置 - 放在元素上方
  selectionToolbar.style.position = 'fixed';
  selectionToolbar.style.left = `${rect.left}px`;
  selectionToolbar.style.top = `${rect.top - 40}px`; // 工具栏高度约为40px

  // 如果工具栏会超出视口顶部，则放在元素下方
  if (rect.top < 50) {
    selectionToolbar.style.top = `${rect.bottom + 5}px`;
  }

  // 创建按钮
  const parentButton = createToolbarButton('⬆️ 父元素', selectParentElement);
  const confirmButton = createToolbarButton('✅ 确认', captureSelectedElement);
  const cancelButton = createToolbarButton('❌ 取消', cancelSelection);

  // 添加按钮到工具栏
  selectionToolbar.appendChild(parentButton);
  selectionToolbar.appendChild(confirmButton);
  selectionToolbar.appendChild(cancelButton);

  // 添加工具栏到页面
  document.body.appendChild(selectionToolbar);
}

// 创建工具栏按钮
function createToolbarButton(text, clickHandler) {
  const button = document.createElement('button');
  button.className = 'screenshot-toolbar-button';
  button.textContent = text;
  button.addEventListener('click', clickHandler);
  return button;
}

// 移除选择工具栏
function removeSelectionToolbar() {
  if (selectionToolbar && selectionToolbar.parentNode) {
    selectionToolbar.parentNode.removeChild(selectionToolbar);
    selectionToolbar = null;
  }
}

// 选择父元素
function selectParentElement() {
  if (!selectedElement || selectedElement === document.body || selectedElement === document.documentElement) {
    return;
  }

  // 移除当前元素的选中高亮
  selectedElement.classList.remove('screenshot-element-selected');

  // 选择父元素
  selectedElement = selectedElement.parentElement;

  // 添加新的选中高亮
  selectedElement.classList.add('screenshot-element-selected');

  // 更新工具栏位置
  updateToolbarPosition();

  console.log("选择父元素:", selectedElement);
}

// 更新工具栏位置
function updateToolbarPosition() {
  if (!selectionToolbar || !selectedElement) return;

  const rect = selectedElement.getBoundingClientRect();

  selectionToolbar.style.left = `${rect.left}px`;
  selectionToolbar.style.top = `${rect.top - 40}px`;

  // 如果工具栏会超出视口顶部，则放在元素下方
  if (rect.top < 50) {
    selectionToolbar.style.top = `${rect.bottom + 5}px`;
  }
}

// 处理键盘事件
function handleKeyDown(event) {
  if (!isElementSelected) return;

  switch (event.key) {
    case 'ArrowUp':
      // 上箭头键 - 选择父元素
      event.preventDefault();
      selectParentElement();
      break;
    case 'Enter':
      // 回车键 - 确认选择
      event.preventDefault();
      captureSelectedElement();
      break;
    case 'Escape':
      // ESC键 - 取消选择
      event.preventDefault();
      cancelSelection();
      break;
  }
}

// 取消选择
function cancelSelection() {
  if (selectedElement) {
    selectedElement.classList.remove('screenshot-element-selected');
  }

  removeSelectionToolbar();
  document.removeEventListener('keydown', handleKeyDown);

  selectedElement = null;
  isElementSelected = false;

  // 恢复选择模式
  isSelecting = true;
}

// 捕获选中的元素
function captureSelectedElement() {
  if (!selectedElement) return;

  // 获取元素位置
  const rect = selectedElement.getBoundingClientRect();
  console.log("最终选定元素:", selectedElement, "位置:", rect);

  // 临时移除高亮和工具栏，避免它们出现在截图中
  selectedElement.classList.remove('screenshot-element-selected');
  removeSelectionToolbar();

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
      // 可以在这里给用户一些成功的反馈
      const notification = document.createElement('div');
      notification.className = 'screenshot-notification';
      notification.textContent = '截图成功！请在插件弹窗中查看。';
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }

    // 清理并停止选择
    document.removeEventListener('keydown', handleKeyDown);
    selectedElement = null;
    isElementSelected = false;
    stopSelection();
  });
}

// 开始元素选择
function startSelection() {
  if (isSelecting) return; // 防止重复启动

  isSelecting = true;
  isElementSelected = false;
  selectedElement = null;
  hoveredElement = null;

  document.addEventListener('mouseover', handleMouseOver);
  document.addEventListener('mouseout', handleMouseOut);
  document.addEventListener('click', handleClick, true); // 使用捕获阶段确保点击事件被处理
  document.body.style.cursor = 'crosshair'; // 更改整个页面的鼠标指针

  console.log("元素选择模式已启动。");
}

// 停止元素选择
function stopSelection() {
  isSelecting = false;
  isElementSelected = false;

  document.removeEventListener('mouseover', handleMouseOver);
  document.removeEventListener('mouseout', handleMouseOut);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown);

  document.body.style.cursor = 'default'; // 恢复默认鼠标指针

  // 移除可能残留的高亮
  const highlightedElements = document.querySelectorAll('.screenshot-element-highlight, .screenshot-element-selected');
  highlightedElements.forEach(el => {
    el.classList.remove('screenshot-element-highlight');
    el.classList.remove('screenshot-element-selected');
  });

  // 移除工具栏
  removeSelectionToolbar();

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

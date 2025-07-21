// Khi mở popup, tự động điền lại API key đã lưu
chrome.storage.local.get(['apikey'], function(result) {
  if (result.apikey) {
    document.getElementById('apikey').value = result.apikey;
  }
});

// Lưu trạng thái tool bật/tắt
function setToolStatus(enabled) {
  const statusDiv = document.getElementById('status');
  let msg = enabled ? 'Tool đã bật! Click vào từng câu hỏi để giải.' : 'Tool chưa bật.';
  let icon = enabled
    ? '<span class="on-indicator" title="Đã bật tool"></span>'
    : '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ccc;margin-left:8px;"></span>';
  statusDiv.innerHTML = msg + icon;
  localStorage.setItem('autoAnswerToolEnabled', enabled ? '1' : '0');
  console.log('[AutoAnswer] setToolStatus:', msg);
}

// Khi mở popup, hiển thị trạng thái tool
if (localStorage.getItem('autoAnswerToolEnabled') === '1') {
  setToolStatus(true);
} else {
  setToolStatus(false);
}

document.getElementById('save-key').onclick = async () => {
  const apikey = document.getElementById('apikey').value.trim();
  if (!apikey) {
    window.setStatus("Vui lòng nhập API key!");
    return;
  }
  chrome.storage.local.set({ apikey });
  window.setStatus("Đã lưu API key!");
};

document.getElementById('enable-tool').onclick = async () => {
  const apikey = document.getElementById('apikey').value.trim();
  if (!apikey) {
    window.setStatus("Vui lòng nhập API key!");
    return;
  }
  chrome.storage.local.set({ apikey });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: enableTool,
      args: [apikey]
    });
  });
  setToolStatus(true);
};

function enableTool(apikey) {
  window.dispatchEvent(new CustomEvent('enable-tool', { detail: { apikey } }));
}

// Giao diện status cho các thông báo khác
window.setStatus = function(msg) {
  const statusDiv = document.getElementById('status');
  statusDiv.innerHTML = msg || '';
  console.log('[AutoAnswer] setStatus:', msg);
} 